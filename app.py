from flask import Flask, render_template, request, jsonify
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
from decimal import Decimal
import math

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class EnhancedJSONEncoder(json.JSONEncoder):
    """Encodeur JSON personnalisé pour gérer les types spéciaux"""
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64)):
            if pd.isna(obj) or math.isnan(obj):
                return None
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        elif isinstance(obj, pd.Series):
            return obj.tolist()
        elif isinstance(obj, pd.DataFrame):
            return obj.to_dict()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (bool, np.bool_)):
            return bool(obj)
        elif pd.isna(obj):
            return None
        elif hasattr(obj, 'to_dict'):
            return obj.to_dict()
        return super().default(obj)

app.json_encoder = EnhancedJSONEncoder

class DataAnalyzer:
    def __init__(self, df):
        # Convertir les booléens en strings pour éviter les problèmes
        self.df = self._clean_dataframe(df.copy())
        self.results = {}
        self.numeric_columns = self._get_numeric_columns()
        
    def _clean_dataframe(self, df):
        """Nettoyer le dataframe pour éviter les problèmes de sérialisation"""
        # Convertir les colonnes booléennes en strings
        for col in df.columns:
            if df[col].dtype == 'bool':
                df[col] = df[col].astype(str)
            elif df[col].dtype == 'object':
                # Vérifier si c'est une colonne mixte avec des booléens
                try:
                    unique_vals = df[col].dropna().unique()
                    if any(isinstance(x, bool) for x in unique_vals):
                        df[col] = df[col].astype(str)
                except:
                    pass
        
        # Remplacer les NaN par None
        df = df.replace({np.nan: None})
        
        return df
    
    def _get_numeric_columns(self):
        """Obtenir les colonnes numériques en excluant les booléens convertis"""
        numeric_cols = []
        for col in self.df.columns:
            try:
                # Essayer de convertir en numérique
                pd.to_numeric(self.df[col])
                numeric_cols.append(col)
            except:
                # Si échec, vérifier si c'est essentiellement numérique
                if self.df[col].dropna().empty:
                    continue
                try:
                    sample = self.df[col].dropna().iloc[0]
                    if isinstance(sample, (int, float, np.number)):
                        numeric_cols.append(col)
                except:
                    continue
        return numeric_cols
    
    def _safe_serialize(self, obj):
        """Sérialiser un objet de manière sûre"""
        if obj is None:
            return None
        elif isinstance(obj, (int, np.integer)):
            return int(obj)
        elif isinstance(obj, (float, np.floating)):
            if pd.isna(obj) or math.isnan(obj):
                return None
            return float(obj)
        elif isinstance(obj, bool):
            return bool(obj)
        elif isinstance(obj, str):
            return str(obj)
        elif isinstance(obj, dict):
            return {k: self._safe_serialize(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self._safe_serialize(x) for x in obj]
        elif hasattr(obj, 'to_dict'):
            return obj.to_dict()
        elif isinstance(obj, pd.Series):
            return self._safe_serialize(obj.tolist())
        elif isinstance(obj, pd.DataFrame):
            return self._safe_serialize(obj.to_dict())
        else:
            try:
                return str(obj)
            except:
                return None
    
    def analyze_all(self):
        """Exécute toutes les analyses simultanément"""
        try:
            # 1. Statistiques descriptives
            self.descriptive_stats()
            
            # 2. Corrélations
            self.correlation_analysis()
            
            # 3. Régressions
            self.regression_analysis()
            
            # 4. Tests statistiques
            self.statistical_tests()
            
            # 5. Séries temporelles
            self.time_series_analysis()
            
            # 6. Analyses multivariées
            self.multivariate_analysis()
            
            return self._safe_serialize(self.results)
            
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}
    
    def descriptive_stats(self):
        """Statistiques descriptives détaillées"""
        stats = {}
        for col in self.numeric_columns:
            if col in self.df.columns:
                try:
                    # Filtrer les valeurs None/NaN
                    col_data = self.df[col].dropna()
                    if len(col_data) == 0:
                        continue
                        
                    stats[col] = {
                        'count': int(len(col_data)),
                        'mean': float(col_data.mean()) if not pd.isna(col_data.mean()) else None,
                        'std': float(col_data.std()) if not pd.isna(col_data.std()) else None,
                        'min': float(col_data.min()) if not pd.isna(col_data.min()) else None,
                        '25%': float(col_data.quantile(0.25)) if not pd.isna(col_data.quantile(0.25)) else None,
                        '50%': float(col_data.quantile(0.50)) if not pd.isna(col_data.quantile(0.50)) else None,
                        '75%': float(col_data.quantile(0.75)) if not pd.isna(col_data.quantile(0.75)) else None,
                        'max': float(col_data.max()) if not pd.isna(col_data.max()) else None,
                        'variance': float(col_data.var()) if not pd.isna(col_data.var()) else None,
                        'skewness': float(col_data.skew()) if not pd.isna(col_data.skew()) else None,
                        'kurtosis': float(col_data.kurtosis()) if not pd.isna(col_data.kurtosis()) else None,
                        'missing': int(self.df[col].isnull().sum())
                    }
                except Exception as e:
                    stats[col] = {'error': str(e)}
        
        self.results['descriptive_stats'] = stats
        
        # Résumé global
        self.results['data_overview'] = {
            'shape': list(self.df.shape),
            'columns': list(self.df.columns),
            'numeric_columns': self.numeric_columns,
            'categorical_columns': [col for col in self.df.columns if col not in self.numeric_columns],
            'total_missing': int(self.df.isnull().sum().sum()),
            'duplicates': int(self.df.duplicated().sum())
        }
    
    def correlation_analysis(self):
        """Analyse de corrélation complète"""
        if len(self.numeric_columns) < 2:
            self.results['correlation_analysis'] = {'error': 'Pas assez de variables numériques'}
            return
            
        try:
            # Matrice de corrélation Pearson
            pearson_corr = self.df[self.numeric_columns].corr(method='pearson', numeric_only=True)
            spearman_corr = self.df[self.numeric_columns].corr(method='spearman', numeric_only=True)
            
            # Convertir en dict simple
            pearson_dict = {}
            spearman_dict = {}
            
            for col1 in self.numeric_columns:
                pearson_dict[col1] = {}
                spearman_dict[col1] = {}
                for col2 in self.numeric_columns:
                    pearson_val = pearson_corr.loc[col1, col2]
                    spearman_val = spearman_corr.loc[col1, col2]
                    
                    pearson_dict[col1][col2] = float(pearson_val) if not pd.isna(pearson_val) else None
                    spearman_dict[col1][col2] = float(spearman_val) if not pd.isna(spearman_val) else None
            
            # Top corrélations
            top_correlations = []
            for i, col1 in enumerate(self.numeric_columns):
                for j, col2 in enumerate(self.numeric_columns):
                    if i < j:
                        corr_value = pearson_dict[col1][col2]
                        if corr_value is not None and not math.isnan(corr_value):
                            top_correlations.append({
                                'variables': f"{col1} - {col2}",
                                'correlation': float(corr_value),
                                'strength': 'Forte' if abs(corr_value) > 0.7 else 
                                           'Modérée' if abs(corr_value) > 0.3 else 
                                           'Faible'
                            })
            
            # Trier par valeur absolue
            top_correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
            
            self.results['correlation_analysis'] = {
                'pearson_matrix': pearson_dict,
                'spearman_matrix': spearman_dict,
                'top_correlations': top_correlations[:10]
            }
            
        except Exception as e:
            self.results['correlation_analysis'] = {'error': str(e)}
    
    def regression_analysis(self):
        """Analyses de régression pour toutes les combinaisons possibles"""
        if len(self.numeric_columns) < 2:
            self.results['regression_analysis'] = {'error': 'Pas assez de variables numériques'}
            return
            
        regression_results = {}
        
        # Régression linéaire simple pour chaque paire
        simple_regressions = []
        for y_col in self.numeric_columns[:5]:  # Limiter à 5 variables dépendantes
            for x_col in self.numeric_columns[:10]:  # Limiter à 10 variables indépendantes
                if x_col != y_col:
                    try:
                        # Préparer les données
                        X = self.df[[x_col]].dropna()
                        y = self.df[y_col].dropna()
                        
                        # Aligner les indices
                        common_idx = X.index.intersection(y.index)
                        if len(common_idx) < 3:
                            continue
                        
                        X = X.loc[common_idx]
                        y = y.loc[common_idx]
                        
                        # Ajouter constante
                        X = sm.add_constant(X)
                        
                        # Ajuster le modèle
                        model = sm.OLS(y, X).fit()
                        
                        simple_regressions.append({
                            'dependent': y_col,
                            'independent': x_col,
                            'r_squared': float(model.rsquared) if not pd.isna(model.rsquared) else None,
                            'adj_r_squared': float(model.rsquared_adj) if not pd.isna(model.rsquared_adj) else None,
                            'coefficient': float(model.params[x_col]) if x_col in model.params and not pd.isna(model.params[x_col]) else None,
                            'p_value': float(model.pvalues[x_col]) if x_col in model.pvalues and not pd.isna(model.pvalues[x_col]) else None,
                            'significant': bool(model.pvalues[x_col] < 0.05) if x_col in model.pvalues else None
                        })
                    except Exception as e:
                        continue
        
        regression_results['simple_regressions'] = simple_regressions[:20]  # Limiter à 20 résultats
        
        # Régression multiple pour chaque variable dépendante (limité)
        multiple_regressions = []
        for y_col in self.numeric_columns[:3]:  # Limiter à 3 variables dépendantes
            x_cols = [col for col in self.numeric_columns if col != y_col][:5]  # Limiter à 5 indépendantes
            if len(x_cols) >= 2:
                try:
                    X = self.df[x_cols].dropna()
                    y = self.df[y_col].dropna()
                    
                    common_idx = X.index.intersection(y.index)
                    if len(common_idx) <= len(x_cols):
                        continue
                    
                    X = X.loc[common_idx]
                    y = y.loc[common_idx]
                    
                    X = sm.add_constant(X)
                    model = sm.OLS(y, X).fit()
                    
                    coefficients = {}
                    for col in x_cols:
                        if col in model.params:
                            coefficients[col] = {
                                'coef': float(model.params[col]) if not pd.isna(model.params[col]) else None,
                                'p_value': float(model.pvalues[col]) if col in model.pvalues and not pd.isna(model.pvalues[col]) else None,
                                'significant': bool(model.pvalues[col] < 0.05) if col in model.pvalues else None
                            }
                    
                    multiple_regressions.append({
                        'dependent': y_col,
                        'independents': x_cols,
                        'r_squared': float(model.rsquared) if not pd.isna(model.rsquared) else None,
                        'adj_r_squared': float(model.rsquared_adj) if not pd.isna(model.rsquared_adj) else None,
                        'f_statistic': float(model.fvalue) if not pd.isna(model.fvalue) else None,
                        'f_pvalue': float(model.f_pvalue) if not pd.isna(model.f_pvalue) else None,
                        'coefficients': coefficients
                    })
                except Exception as e:
                    continue
        
        regression_results['multiple_regressions'] = multiple_regressions[:5]
        
        self.results['regression_analysis'] = regression_results
    
    def statistical_tests(self):
        """Tests statistiques pour toutes les variables"""
        tests_results = {}
        
        # T-tests pour chaque paire de variables numériques (limité)
        t_tests = []
        tested_pairs = set()
        
        for i, col1 in enumerate(self.numeric_columns[:5]):
            for j, col2 in enumerate(self.numeric_columns[:5]):
                if i < j:
                    pair_key = frozenset([col1, col2])
                    if pair_key in tested_pairs:
                        continue
                    
                    try:
                        data1 = self.df[col1].dropna()
                        data2 = self.df[col2].dropna()
                        
                        if len(data1) < 2 or len(data2) < 2:
                            continue
                        
                        stat, p_value = ttest_ind(data1, data2, nan_policy='omit')
                        
                        t_tests.append({
                            'variable1': col1,
                            'variable2': col2,
                            't_statistic': float(stat) if not pd.isna(stat) else None,
                            'p_value': float(p_value) if not pd.isna(p_value) else None,
                            'significant': bool(p_value < 0.05) if p_value is not None else None,
                            'mean1': float(data1.mean()) if not pd.isna(data1.mean()) else None,
                            'mean2': float(data2.mean()) if not pd.isna(data2.mean()) else None
                        })
                        
                        tested_pairs.add(pair_key)
                    except Exception as e:
                        continue
        
        tests_results['t_tests'] = t_tests[:10]
        
        # Test de normalité (simplifié)
        normality_tests = []
        for col in self.numeric_columns[:5]:
            try:
                data = self.df[col].dropna()
                if len(data) < 4:
                    continue
                
                skew = data.skew()
                kurt = data.kurtosis()
                
                normality_tests.append({
                    'variable': col,
                    'skewness': float(skew) if not pd.isna(skew) else None,
                    'kurtosis': float(kurt) if not pd.isna(kurt) else None,
                    'is_normal': bool(abs(skew) < 2 and abs(kurt) < 7) if not pd.isna(skew) and not pd.isna(kurt) else None
                })
            except Exception as e:
                continue
        
        tests_results['normality_tests'] = normality_tests
        
        self.results['statistical_tests'] = tests_results
    
    def time_series_analysis(self):
        """Analyse de séries temporelles si index temporel présent"""
        ts_results = {}
        
        # Vérifier si on a une colonne de date
        date_cols = []
        for col in self.df.columns:
            try:
                # Essayer de convertir en datetime
                pd.to_datetime(self.df[col].head(10), errors='raise')
                date_cols.append(col)
            except:
                continue
        
        if len(date_cols) > 0 and len(self.numeric_columns) > 0:
            date_col = date_cols[0]
            numeric_col = self.numeric_columns[0]
            
            try:
                # Tester la stationnarité
                data = self.df[numeric_col].dropna()
                if len(data) > 10:
                    adf_result = adfuller(data)
                    ts_results['stationarity_test'] = {
                        'variable': numeric_col,
                        'adf_statistic': float(adf_result[0]) if not pd.isna(adf_result[0]) else None,
                        'p_value': float(adf_result[1]) if len(adf_result) > 1 and not pd.isna(adf_result[1]) else None,
                        'is_stationary': bool(adf_result[1] < 0.05) if len(adf_result) > 1 and adf_result[1] is not None else None
                    }
                else:
                    ts_results['stationarity_test'] = {'error': 'Données insuffisantes'}
                    
            except Exception as e:
                ts_results['stationarity_test'] = {'error': str(e)}
        
        # Moyennes mobiles (simplifié)
        moving_averages = {}
        for col in self.numeric_columns[:2]:
            try:
                data = self.df[col].dropna()
                if len(data) > 7:
                    ma_7 = data.rolling(window=7, min_periods=1).mean()
                    moving_averages[col] = {
                        'ma_7': [float(x) if not pd.isna(x) else None for x in ma_7.tolist()],
                        'ma_30': []  # Placeholder
                    }
            except:
                continue
        
        if moving_averages:
            ts_results['moving_averages'] = moving_averages
        
        self.results['time_series_analysis'] = ts_results
    
    def multivariate_analysis(self):
        """Analyses multivariées"""
        multivariate_results = {}
        
        # Matrice de covariance
        if len(self.numeric_columns) >= 2:
            try:
                cov_matrix = self.df[self.numeric_columns].cov()
                
                cov_dict = {}
                for col1 in self.numeric_columns:
                    cov_dict[col1] = {}
                    for col2 in self.numeric_columns:
                        val = cov_matrix.loc[col1, col2]
                        cov_dict[col1][col2] = float(val) if not pd.isna(val) else None
                
                multivariate_results['covariance_matrix'] = cov_dict
            except Exception as e:
                multivariate_results['covariance_error'] = str(e)
        
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
        
        # Lire le fichier
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext == '.csv':
            # Essayer différents encodages
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            df = None
            for encoding in encodings:
                try:
                    file.seek(0)  # Retourner au début du fichier
                    df = pd.read_csv(file, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
                except Exception:
                    continue
            
            if df is None:
                # Dernier essai sans spécifier d'encodage
                file.seek(0)
                df = pd.read_csv(file)
                
        elif file_ext in ['.xls', '.xlsx']:
            df = pd.read_excel(file)
        else:
            return jsonify({"error": f"Format non supporté: {file_ext}. Utilisez CSV ou Excel."}), 400
        
        if df.empty:
            return jsonify({"error": "Le fichier est vide"}), 400
        
        # Nettoyer les noms de colonnes
        df.columns = [str(col).strip().replace(' ', '_').replace('.', '_') for col in df.columns]
        
        # Analyser toutes les données
        analyzer = DataAnalyzer(df)
        results = analyzer.analyze_all()
        
        # Préparer les données pour l'affichage
        display_data = {
            'first_rows': df.head(100).replace({np.nan: None}).to_dict('records'),
            'columns': list(df.columns),
            'data_types': {col: str(dtype) for col, dtype in df.dtypes.items()},
            'analysis_results': results,
            'summary': {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'numeric_columns': len(analyzer.numeric_columns),
                'categorical_columns': len(df.columns) - len(analyzer.numeric_columns),
                'missing_values': int(df.isnull().sum().sum())
            }
        }
        
        return jsonify(display_data)
        
    except pd.errors.EmptyDataError:
        return jsonify({"error": "Le fichier est vide ou corrompu"}), 400
    except Exception as e:
        app.logger.error(f"Erreur lors du traitement du fichier: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": f"Erreur lors du traitement: {str(e)}"}), 500

@app.route("/test", methods=["GET"])
def test():
    """Route de test pour vérifier que l'API fonctionne"""
    return jsonify({
        "status": "OK",
        "message": "API fonctionnelle",
        "timestamp": datetime.now().isoformat()
    })

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)