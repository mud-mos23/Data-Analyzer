from flask import Flask, render_template, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
import statsmodels.api as sm
from scipy.stats import ttest_ind, f_oneway, pearsonr, spearmanr
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import json
from datetime import datetime
import os
import traceback
import math
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__, static_folder='static', static_url_path='/static')
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class DataAnalyzer:
    def __init__(self, df):
        # Nettoyer et convertir les données
        self.df = self._clean_dataframe(df.copy())
        self.results = {}
        self.numeric_columns = self._get_numeric_columns()
    
    def _clean_dataframe(self, df):
        """Nettoyer le dataframe"""
        if df.empty:
            return df

        for col in df.columns:
            try:
                if df[col].dtype == 'object':
                    non_null = df[col].dropna()
                    if not non_null.empty:
                        sample = str(non_null.iloc[0])
                        if ',' in sample:
                            if '.' in sample:
                                if sample.replace(',', '').replace('.', '').replace('-', '').isdigit():
                                    df[col] = df[col].astype(str).str.replace(',', '')
                            elif sample.replace(',', '').replace('-', '').isdigit():
                                df[col] = df[col].astype(str).str.replace(',', '.')

                df[col] = pd.to_numeric(df[col], errors='ignore')
            except:
                continue

        df = df.replace({np.nan: None, pd.NA: None})
        return df
    
    def _get_numeric_columns(self):
        """Obtenir les colonnes numériques"""
        numeric_cols = []
        for col in self.df.columns:
            try:
                if pd.api.types.is_numeric_dtype(self.df[col]):
                    numeric_cols.append(col)
                else:
                    self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
                    numeric_cols.append(col)
            except:
                continue
        return numeric_cols
    
    def analyze_all(self):
        """Exécuter toutes les analyses"""
        try:
            # 1. Aperçu des données
            self.data_overview()
            
            # 2. Statistiques descriptives
            self.descriptive_stats()
            
            # 3. Corrélations si assez de données
            if len(self.numeric_columns) >= 2:
                self.correlation_analysis()
            
            # 4. Régressions
            if len(self.numeric_columns) >= 2:
                self.regression_analysis()
            
            # 5. Tests statistiques
            if len(self.numeric_columns) >= 1:
                self.statistical_tests()
            
            # 6. Séries temporelles
            self.time_series_analysis()
            
            # 7. Analyses multivariées
            if len(self.numeric_columns) >= 2:
                self.multivariate_analysis()
            
            return self.results
            
        except Exception as e:
            return {"error": str(e)}
    
    def data_overview(self):
        """Aperçu général des données"""
        self.results['data_overview'] = {
            'shape': [int(self.df.shape[0]), int(self.df.shape[1])],
            'columns': list(self.df.columns),
            'numeric_columns': self.numeric_columns,
            'categorical_columns': [col for col in self.df.columns if col not in self.numeric_columns],
            'total_missing': int(self.df.isnull().sum().sum()),
            'duplicates': int(self.df.duplicated().sum())
        }
    
    def descriptive_stats(self):
        """Statistiques descriptives"""
        stats = {}
        for col in self.numeric_columns:
            try:
                col_data = self.df[col].dropna()
                if len(col_data) == 0:
                    continue
                    
                stats[col] = {
                    'count': int(len(col_data)),
                    'mean': float(col_data.mean()) if col_data.mean() is not None else None,
                    'std': float(col_data.std()) if col_data.std() is not None else None,
                    'variance': float(col_data.var()) if col_data.var() is not None else None,
                    'skewness': float(col_data.skew()) if col_data.skew() is not None else None,
                    'kurtosis': float(col_data.kurtosis()) if col_data.kurtosis() is not None else None,
                    'min': float(col_data.min()) if col_data.min() is not None else None,
                    '25%': float(col_data.quantile(0.25)) if col_data.quantile(0.25) is not None else None,
                    '50%': float(col_data.quantile(0.50)) if col_data.quantile(0.50) is not None else None,
                    '75%': float(col_data.quantile(0.75)) if col_data.quantile(0.75) is not None else None,
                    'max': float(col_data.max()) if col_data.max() is not None else None,
                    'missing': int(self.df[col].isnull().sum())
                }
            except:
                continue
        
        self.results['descriptive_stats'] = stats
    
    def correlation_analysis(self):
        """Analyse de corrélation"""
        try:
            # Utiliser seulement les colonnes numériques
            numeric_df = self.df[self.numeric_columns].apply(pd.to_numeric, errors='coerce')
            
            # Matrice de corrélation Pearson
            pearson_corr = numeric_df.corr(method='pearson')
            spearman_corr = numeric_df.corr(method='spearman')
            
            # Convertir en dict
            pearson_dict = {}
            spearman_dict = {}
            
            for col1 in self.numeric_columns:
                pearson_dict[col1] = {}
                spearman_dict[col1] = {}
                for col2 in self.numeric_columns:
                    pearson_val = pearson_corr.loc[col1, col2] if col1 in pearson_corr.index and col2 in pearson_corr.columns else None
                    spearman_val = spearman_corr.loc[col1, col2] if col1 in spearman_corr.index and col2 in spearman_corr.columns else None
                    
                    pearson_dict[col1][col2] = float(pearson_val) if not pd.isna(pearson_val) else None
                    spearman_dict[col1][col2] = float(spearman_val) if not pd.isna(spearman_val) else None
            
            # Top corrélations
            top_correlations = []
            for i, col1 in enumerate(self.numeric_columns):
                for j, col2 in enumerate(self.numeric_columns):
                    if i < j:
                        corr_value = pearson_dict[col1][col2]
                        if corr_value is not None:
                            top_correlations.append({
                                'variables': f"{col1} - {col2}",
                                'correlation': float(corr_value),
                                'strength': 'Forte' if abs(corr_value) > 0.7 else 
                                           'Modérée' if abs(corr_value) > 0.3 else 
                                           'Faible'
                            })
            
            top_correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
            
            self.results['correlation_analysis'] = {
                'pearson_matrix': pearson_dict,
                'spearman_matrix': spearman_dict,
                'top_correlations': top_correlations[:10]
            }
            
        except Exception as e:
            self.results['correlation_analysis'] = {'error': str(e)}
    
    def regression_analysis(self):
        """Analyses de régression"""
        regression_results = {}
        simple_regressions = []
        
        # Limiter à 3 variables dépendantes et 5 indépendantes pour la performance
        dep_vars = self.numeric_columns[:3]
        indep_vars = self.numeric_columns[:5]
        
        for y_col in dep_vars:
            for x_col in indep_vars:
                if x_col != y_col:
                    try:
                        # Préparer les données
                        data = self.df[[x_col, y_col]].dropna()
                        if len(data) < 3:
                            continue
                        
                        X = sm.add_constant(data[x_col])
                        y = data[y_col]
                        
                        model = sm.OLS(y, X).fit()
                        
                        simple_regressions.append({
                            'dependent': y_col,
                            'independent': x_col,
                            'r_squared': float(model.rsquared) if not pd.isna(model.rsquared) else None,
                            'coefficient': float(model.params[x_col]) if x_col in model.params and not pd.isna(model.params[x_col]) else None,
                            'p_value': float(model.pvalues[x_col]) if x_col in model.pvalues and not pd.isna(model.pvalues[x_col]) else None,
                            'significant': bool(model.pvalues[x_col] < 0.05) if x_col in model.pvalues and model.pvalues[x_col] is not None else None
                        })
                    except Exception as e:
                        continue
        
        regression_results['simple_regressions'] = simple_regressions[:15]
        self.results['regression_analysis'] = regression_results
    
    def statistical_tests(self):
        """Tests statistiques"""
        tests_results = {}
        normality_tests = []
        
        for col in self.numeric_columns[:5]:  # Limiter à 5 colonnes
            try:
                data = self.df[col].dropna()
                if len(data) < 3:
                    continue
                
                skew = float(data.skew())
                kurt = float(data.kurtosis())
                
                normality_tests.append({
                    'variable': col,
                    'skewness': skew,
                    'kurtosis': kurt,
                    'is_normal': abs(skew) < 2 and abs(kurt) < 7
                })
            except:
                continue
        
        tests_results['normality_tests'] = normality_tests
        self.results['statistical_tests'] = tests_results
    
    def time_series_analysis(self):
        """Analyse de séries temporelles"""
        ts_results = {}
        
        # Vérifier les colonnes de date
        date_cols = []
        for col in self.df.columns:
            try:
                pd.to_datetime(self.df[col], errors='raise')
                date_cols.append(col)
            except:
                continue
        
        if date_cols and self.numeric_columns:
            ts_results['has_date_columns'] = date_cols
            ts_results['suggested_time_series'] = f"Utilisez {date_cols[0]} comme axe temporel avec {self.numeric_columns[0]} comme variable"
        
        self.results['time_series_analysis'] = ts_results
    
    def multivariate_analysis(self):
        """Analyses multivariées"""
        multivariate_results = {}
        
        if len(self.numeric_columns) >= 2:
            try:
                numeric_df = self.df[self.numeric_columns].apply(pd.to_numeric, errors='coerce')
                cov_matrix = numeric_df.cov()
                
                cov_dict = {}
                for col1 in self.numeric_columns[:5]:  # Limiter pour la performance
                    cov_dict[col1] = {}
                    for col2 in self.numeric_columns[:5]:
                        val = cov_matrix.loc[col1, col2] if col1 in cov_matrix.index and col2 in cov_matrix.columns else None
                        cov_dict[col1][col2] = float(val) if not pd.isna(val) else None
                
                multivariate_results['covariance_matrix'] = cov_dict
            except Exception as e:
                multivariate_results['error'] = str(e)
        
        self.results['multivariate_analysis'] = multivariate_results

@app.route("/", methods=["GET", "POST"])
def index():
    return render_template("excel_dashboard.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    try:
        file = request.files.get("file")
        if not file or file.filename == '':
            return jsonify({"error": "Aucun fichier sélectionné"}), 400
        
        # Vérifier la taille du fichier (max 50MB)
        file.seek(0, 2)  # Aller à la fin
        file_size = file.tell()  # Obtenir la taille
        file.seek(0)  # Retourner au début
        
        if file_size > 50 * 1024 * 1024:  # 50MB
            return jsonify({"error": "Fichier trop volumineux (max 50MB)"}), 400
        
        # Lire le fichier selon l'extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext == '.csv':
            # Essayer différents encodages pour CSV
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-8-sig', 'windows-1252']
            df = None
            
            for encoding in encodings:
                try:
                    file.seek(0)
                    df = pd.read_csv(file, encoding=encoding, on_bad_lines='skip')
                    break
                except UnicodeDecodeError:
                    continue
                except Exception:
                    continue
            
            if df is None:
                # Dernier essai
                try:
                    file.seek(0)
                    df = pd.read_csv(file, encoding='utf-8', errors='ignore')
                except Exception as e:
                    return jsonify({"error": f"Impossible de lire le CSV: {str(e)}"}), 400
                
        elif file_ext in ['.xlsx', '.xls', '.xlsm', '.xlsb']:
            try:
                # Lire le fichier Excel
                file.seek(0)
                
                if file_ext == '.xlsx':
                    df = pd.read_excel(file, engine='openpyxl')
                elif file_ext == '.xls':
                    df = pd.read_excel(file, engine='xlrd')
                else:
                    df = pd.read_excel(file, engine='openpyxl')
                    
            except ImportError as e:
                return jsonify({"error": f"Dépendance manquante: {str(e)}. Installez openpyxl avec: pip install openpyxl"}), 400
            except Exception as e:
                return jsonify({"error": f"Erreur Excel: {str(e)}"}), 400
                
        else:
            return jsonify({"error": f"Format {file_ext} non supporté. Utilisez CSV ou Excel (.xlsx, .xls)"}), 400
        
        if df.empty:
            return jsonify({"error": "Le fichier est vide ou ne contient pas de données valides"}), 400
        
        # Nettoyer les noms de colonnes
        df.columns = [str(col).strip().replace(' ', '_').replace('.', '_').replace('(', '').replace(')', '')
                     for col in df.columns]
        
        # Limiter la taille pour la performance
        if len(df) > 10000:
            df = df.head(10000)  # Limiter à 10,000 lignes
        
        # Analyser les données
        analyzer = DataAnalyzer(df)
        results = analyzer.analyze_all()
        
        # Préparer la réponse
        response_data = {
            'first_rows': df.head(100).replace({np.nan: None}).to_dict('records'),
            'columns': list(df.columns),
            'data_types': {col: str(dtype) for col, dtype in df.dtypes.items()},
            'analysis_results': results,
            'summary': {
                'total_rows': int(len(df)),
                'total_columns': int(len(df.columns)),
                'numeric_columns': int(len(analyzer.numeric_columns)),
                'categorical_columns': int(len(df.columns) - len(analyzer.numeric_columns)),
                'missing_values': int(df.isnull().sum().sum())
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Erreur: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@app.route("/test_excel", methods=["GET"])
def test_excel():
    """Générer un fichier Excel de test"""
    import io
    
    # Créer des données de test
    data = {
        'Date': ['2025-04-01', '2025-04-02', '2025-04-03', '2025-04-04', '2025-04-05'],
        'Temperature': [59.40, 53.60, 51.40, 50.80, 57.40],
        'Rainfall': [0.74, 0.28, 0.14, 0.06, 0.79],
        'IceCreamsSold': [61, 33, 21, 23, 51],
        'DayOfWeek': ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        'Month': ['April', 'April', 'April', 'April', 'April']
    }
    
    df = pd.DataFrame(data)
    
    # Créer un fichier Excel en mémoire
    excel_buffer = io.BytesIO()
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Données')
    
    excel_buffer.seek(0)
    
    return excel_buffer.getvalue(), 200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=test_donnees.xlsx'
    }

@app.route("/test_csv", methods=["GET"])
def test_csv():
    """Générer un fichier CSV de test"""
    import io

    data = {
        'Date': ['2025-04-01', '2025-04-02', '2025-04-03', '2025-04-04', '2025-04-05'],
        'Temperature': [59.40, 53.60, 51.40, 50.80, 57.40],
        'Rainfall': [0.74, 0.28, 0.14, 0.06, 0.79],
        'IceCreamsSold': [61, 33, 21, 23, 51],
        'DayOfWeek': ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        'Month': ['April', 'April', 'April', 'April', 'April']
    }

    df = pd.DataFrame(data)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    return csv_buffer.getvalue(), 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=test_donnees.csv'
    }

@app.route("/install_guide", methods=["GET"])
def install_guide():
    """Page d'instructions pour installer les dépendances"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Installation des Dépendances</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            code { background: #f4f4f4; padding: 5px; border-radius: 3px; }
            .container { max-width: 800px; margin: 0 auto; }
            .step { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #3498db; }
            .success { border-left-color: #27ae60; }
            .warning { border-left-color: #f39c12; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Installation des Dépendances Requises</h1>
            
            <div class="step">
                <h2>1. Ouvrez votre terminal/CMD</h2>
                <p>Sur Windows : CMD ou PowerShell</p>
                <p>Sur Mac/Linux : Terminal</p>
            </div>
            
            <div class="step">
                <h2>2. Installez les packages requis</h2>
                <p>Exécutez la commande suivante :</p>
                <code>pip install openpyxl xlrd pandas numpy statsmodels scipy</code>
                
                <p>Si vous avez plusieurs versions de Python :</p>
                <code>python -m pip install openpyxl xlrd pandas numpy statsmodels scipy</code>
                
                <p>Ou si pip n'est pas reconnu :</p>
                <code>py -m pip install openpyxl xlrd pandas numpy statsmodels scipy</code>
            </div>
            
            <div class="step success">
                <h2>3. Redémarrez l'application</h2>
                <p>Après l'installation, redémarrez votre application Flask :</p>
                <code>python app.py</code>
            </div>
            
            <div class="step warning">
                <h2>4. Vérification</h2>
                <p>Pour vérifier que tout est installé, exécutez :</p>
                <code>python -c "import openpyxl, pandas, numpy; print('Installation réussie!')"</code>
            </div>
            
            <div class="step">
                <h2>5. Téléchargez un fichier de test</h2>
                <p><a href="/test_excel">Télécharger un fichier Excel de test</a></p>
                <p><a href="/test_csv">Télécharger un fichier CSV de test</a></p>
            </div>
            
            <p><a href="/">Retour à l'application</a></p>
        </div>
    </body>
    </html>
    """

if __name__ == "__main__":
    # Vérifier les dépendances au démarrage
    try:
        import openpyxl
        print("✓ openpyxl est installé")
    except ImportError:
        print("✗ openpyxl n'est pas installé. Exécutez: pip install openpyxl")
    
    try:
        import xlrd
        print("✓ xlrd est installé")
    except ImportError:
        print("✗ xlrd n'est pas installé. Exécutez: pip install xlrd")
    
    try:
        import pandas
        print("✓ pandas est installé")
    except ImportError:
        print("✗ pandas n'est pas installé. Exécutez: pip install pandas")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
