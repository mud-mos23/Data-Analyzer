# Data Analyzer

Plateforme d'analyse statistique interactive pour fichiers CSV et Excel. Construite avec Flask et Python, elle offre une interface moderne type tableur pour explorer, visualiser et modéliser vos données.

## Fonctionnalités

- **Import de données** : CSV et Excel (.xlsx, .xls) jusqu'à 50 Mo avec détection automatique d'encodage
- **Aperçu des données** : grille interactive, types de colonnes, valeurs manquantes
- **Statistiques descriptives** : moyenne, écart-type, variance, skewness, kurtosis, quartiles
- **Corrélations** : matrices de Pearson et Spearman avec heatmap interactive
- **Régressions linéaires** : simples et multiples avec R², coefficients et p-values
- **Tests statistiques** : normalité (skewness/kurtosis), tests T de Student
- **Séries temporelles** : détection automatique des colonnes de date
- **Analyses multivariées** : matrice de covariance
- **Visualisations** : histogrammes, nuages de points, boîtes à moustaches

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/mud-mos23/Data-Analyzer.git
cd Data-Analyzer

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'application
python app.py
```

L'application est accessible sur `http://localhost:5000`.

## Déploiement

L'application est compatible Heroku (voir `Procfile` et `runtime.txt`).

```bash
# Variables d'environnement recommandées
export FLASK_ENV=production
```

## Dépendances principales

| Package | Rôle |
|---|---|
| Flask | Framework web |
| pandas | Manipulation des données |
| numpy | Calculs numériques |
| scipy | Tests statistiques |
| statsmodels | Régressions et séries temporelles |
| openpyxl / xlrd | Lecture Excel |
| gunicorn | Serveur WSGI (production) |

## Utilisation

1. Ouvrez `http://localhost:5000` dans votre navigateur
2. Cliquez sur la zone d'upload ou glissez-déposez un fichier CSV/Excel
3. Parcourez les onglets pour explorer les analyses automatiques :
   - **Données Brutes** : aperçu des premières lignes
   - **Aperçu** : résumé structurel du jeu de données
   - **Statistiques** : indicateurs descriptifs par variable
   - **Corrélations** : matrices et top corrélations
   - **Régressions** : modèles linéaires
   - **Tests** : tests de normalité
   - **Séries Temp.** : détection temporelle
   - **Multivarié** : matrices de covariance
   - **Graphiques** : visualisations interactives (Chart.js)

## Structure du projet

```
Data-Analyzer/
├── app.py                  # Application Flask + logique d'analyse
├── config.py               # Configuration
├── requirements.txt        # Dépendances Python
├── Procfile                # Déploiement Heroku
├── runtime.txt             # Version Python (Heroku)
├── static/
│   ├── style.css           # Styles modernisés
│   ├── script.js           # Logique frontend (tabs, charts, upload)
│   └── favicon.png         # Icône du site
└── templates/
    ├── excel_dashboard.html # Interface principale
    ├── index.html           # Page d'accueil alternative
    ├── result.html          # Template de résultats
    ├── choose_analysis.html # Sélecteur d'analyses
    └── (autres templates)
```

## API

### `POST /upload`

Importe et analyse un fichier CSV/Excel.

**Paramètres** : `file` (multipart/form-data)

**Réponse** (JSON) :
```json
{
  "first_rows": [...],
  "columns": ["col1", "col2"],
  "data_types": {"col1": "float64"},
  "summary": { "total_rows": 100, "total_columns": 5 },
  "analysis_results": { ... }
}
```

### `GET /test_excel` / `GET /test_csv`

Télécharge un fichier de test.

### `GET /install_guide`

Page d'aide à l'installation des dépendances.

## Licence

MIT
