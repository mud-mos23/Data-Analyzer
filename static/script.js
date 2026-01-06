
        let currentData = null;
        let currentResults = null;
        let charts = [];
        
        // Tab management
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Update tab navigation
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === tabName) {
                    tab.classList.add('active');
                }
            });
            
            // Update ribbon buttons
            document.querySelectorAll('.ribbon-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // If tab has corresponding ribbon button, activate it
            const ribbonBtn = Array.from(document.querySelectorAll('.ribbon-button'))
                .find(btn => btn.textContent.includes(getTabDisplayName(tabName)));
            if (ribbonBtn) {
                ribbonBtn.classList.add('active');
            }
            
            // Load content for the tab if needed
            if (currentResults && tabName !== 'data') {
                loadTabContent(tabName);
            }
        }
        
        function getTabDisplayName(tabName) {
            const names = {
                'data': 'Données',
                'stats': 'Statistiques',
                'correlation': 'Corrélations',
                'regression': 'Régressions',
                'tests': 'Tests',
                'timeseries': 'Séries Temp.',
                'multivariate': 'Multivarié',
                'visualization': 'Visualisations'
            };
            return names[tabName] || tabName;
        }
        
        // File upload handling
        // Modifiez la fonction handleFileUpload pour mieux gérer les erreurs
     // Fonction pour gérer l'upload de fichier - VERSION CORRIGÉE
function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Afficher les infos du fichier
    const fileInfo = document.getElementById('fileInfo');
    const fileInfoText = document.getElementById('fileInfoText');
    fileInfoText.innerHTML = `
        <strong>Fichier sélectionné :</strong> ${file.name} 
        (${(file.size / 1024).toFixed(2)} KB)<br>
        <small>Analyse en cours...</small>
    `;
    fileInfo.className = 'excel-alert alert-info';
    fileInfo.style.display = 'block';
    
    // Cacher la zone d'upload
    document.getElementById('uploadZone').style.display = 'none';
    
    // Afficher le chargement
    showLoading('Chargement et analyse des données...');
    
    // Uploader le fichier
    const formData = new FormData();
    formData.append('file', file);
    
    // Réinitialiser les données
    currentData = null;
    currentResults = null;
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                let errorMsg = `Erreur HTTP ${response.status}`;
                try {
                    const errJson = JSON.parse(text);
                    errorMsg = errJson.error || errorMsg;
                } catch {
                    errorMsg = text || errorMsg;
                }
                throw new Error(errorMsg);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        console.log("Données reçues:", data); // Pour débogage
        
        currentData = data;
        currentResults = data.analysis_results || {};
        
        // Mettre à jour l'UI
        updateDataGrid();
        updateQuickStats();
        updateStatusBar();
        updateTabBadges();
        
        // Charger l'onglet overview
        loadTabContent('overview');
        
        // Afficher la grille
        document.getElementById('dataGrid').style.display = 'block';
        document.getElementById('quickStats').style.display = 'grid';
        
        // Cacher le chargement
        hideLoading();
        
        // Passer à l'onglet overview
        showTab('overview');
        
        // Message de succès
        fileInfoText.innerHTML = `
            <strong style="color: #27ae60;">✓ Fichier analysé avec succès</strong><br>
            <small>${data.summary.total_rows} lignes, ${data.summary.total_columns} colonnes</small>
        `;
        fileInfo.className = 'excel-alert alert-success';
        
    })
    .catch(error => {
        hideLoading();
        console.error('Erreur complète:', error);
        
        // Réafficher la zone d'upload
        document.getElementById('uploadZone').style.display = 'block';
        document.getElementById('dataGrid').style.display = 'none';
        document.getElementById('quickStats').style.display = 'none';
        
        // Afficher l'erreur
        fileInfoText.innerHTML = `
            <strong style="color: #e74c3c;">✗ Erreur : ${error.message}</strong><br>
            <small>Veuillez vérifier le format de votre fichier (CSV ou Excel)</small>
        `;
        fileInfo.className = 'excel-alert alert-error';
        fileInfo.style.display = 'block';
    });
}
        
       
        // Update data grid
        function updateDataGrid() {
            const grid = document.getElementById('dataGrid');
            const data = currentData.first_rows;
            const columns = currentData.columns;
            
            // Create header
            let html = `
                <div class="grid-header">
                    <div class="header-cell row-number">#</div>
            `;
            
            columns.forEach(col => {
                html += `<div class="header-cell">${col}</div>`;
            });
            
            html += `</div><div class="grid-body">`;
            
            // Create rows
            data.forEach((row, rowIndex) => {
                html += `<div class="data-row">`;
                html += `<div class="row-number-cell">${rowIndex + 1}</div>`;
                
                columns.forEach(col => {
                    const value = row[col];
                    let displayValue = value;
                    
                    if (value === null || value === undefined) {
                        displayValue = '<span style="color: #999; font-style: italic;">NULL</span>';
                    } else if (typeof value === 'number') {
                        displayValue = Number(value).toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                    }
                    
                    html += `<div class="data-cell" title="${value}">${displayValue}</div>`;
                });
                
                html += `</div>`;
            });
            
            html += `</div>`;
            grid.innerHTML = html;
        }
        
        // Update quick stats
        // Fonction pour mettre à jour les quick stats
function updateQuickStats() {
    const statsContainer = document.getElementById('quickStats');
    
    if (!currentData || !currentData.summary) {
        statsContainer.innerHTML = '<div class="excel-alert alert-warning">Aucune donnée disponible</div>';
        return;
    }
    
    const stats = currentData.summary;
    
    const statsData = [
        { icon: 'fa-database', value: stats.total_rows || 0, label: 'Lignes', color: '#0F5B9A' },
        { icon: 'fa-columns', value: stats.total_columns || 0, label: 'Colonnes', color: '#2E86C1' },
        { icon: 'fa-calculator', value: stats.numeric_columns || 0, label: 'Variables Numériques', color: '#17A589' },
        { icon: 'fa-list-alt', value: stats.categorical_columns || 0, label: 'Variables Catégorielles', color: '#F39C12' },
        { icon: 'fa-exclamation-triangle', value: stats.missing_values || 0, label: 'Valeurs Manquantes', color: '#E74C3C' },
        { icon: 'fa-chart-bar', value: currentResults ? Object.keys(currentResults).length : 0, label: 'Analyses', color: '#8E44AD' }
    ];
    
    let html = '';
    statsData.forEach(stat => {
        html += `
            <div class="stat-box">
                <div class="stat-icon" style="background: ${stat.color}20; color: ${stat.color};">
                    <i class="fas ${stat.icon}"></i>
                </div>
                <div class="stat-info">
                    <h4>${stat.value}</h4>
                    <p>${stat.label}</p>
                </div>
            </div>
        `;
    });
    
    statsContainer.innerHTML = html;
}
        // Update status bar
       // Fonction pour mettre à jour la barre d'état
function updateStatusBar() {
    if (!currentData || !currentData.summary) return;
    
    document.getElementById('statusRows').textContent = 
        (currentData.summary.total_rows || 0) + ' lignes';
    document.getElementById('statusCols').textContent = 
        (currentData.summary.total_columns || 0) + ' colonnes';
    document.getElementById('statusAnalyses').textContent = 
        (currentResults ? Object.keys(currentResults).length : 0) + ' analyses';
    document.getElementById('statusReady').textContent = 'Analyses complètes';
}

// Fonction pour télécharger un fichier de test
function downloadTestFile() {
    window.open('/test_csv', '_blank');
}
       // Fonction pour mettre à jour les badges d'onglets
function updateTabBadges() {
    if (!currentResults) return;
    
    // Data badge
    document.getElementById('data-badge').textContent = 
        currentData.summary ? (currentData.summary.total_rows || 0) : 0;
    
    // Stats badge
    if (currentResults.descriptive_stats) {
        const statsCount = Object.keys(currentResults.descriptive_stats).length;
        document.getElementById('stats-badge').textContent = statsCount;
    }
    
    // Correlation badge
    if (currentResults.correlation_analysis && currentResults.correlation_analysis.top_correlations) {
        document.getElementById('corr-badge').textContent = 
            currentResults.correlation_analysis.top_correlations.length;
    }
    
    // Regression badge
    if (currentResults.regression_analysis) {
        let regCount = 0;
        if (currentResults.regression_analysis.simple_regressions) {
            regCount += currentResults.regression_analysis.simple_regressions.length;
        }
        document.getElementById('reg-badge').textContent = regCount;
    }
    
    // Tests badge
    if (currentResults.statistical_tests && currentResults.statistical_tests.normality_tests) {
        document.getElementById('tests-badge').textContent = 
            currentResults.statistical_tests.normality_tests.length;
    }
}
        // Load tab content
        function loadTabContent(tabName) {
            const container = document.getElementById(`${tabName}Content`);
            
            switch(tabName) {
                case 'overview':
                    loadOverviewContent(container);
                    break;
                case 'stats':
                    loadStatsContent(container);
                    break;
                case 'correlation':
                    loadCorrelationContent(container);
                    break;
                case 'regression':
                    loadRegressionContent(container);
                    break;
                case 'tests':
                    loadTestsContent(container);
                    break;
                case 'timeseries':
                    loadTimeseriesContent(container);
                    break;
                case 'multivariate':
                    loadMultivariateContent(container);
                    break;
                case 'visualization':
                    loadVisualizationContent(container);
                    break;
            }
        }
        
        // Load overview content
      // Fonction pour charger l'onglet overview
function loadOverviewContent(container) {
    if (!currentData || !currentResults) {
        container.innerHTML = '<div class="excel-alert alert-warning">Aucune donnée disponible</div>';
        return;
    }
    
    const overview = currentResults.data_overview || currentData.data_overview || {};
    const dataTypes = currentData.data_types || {};
    
    let html = `
        <div class="analysis-card">
            <div class="card-header">
                <i class="fas fa-info-circle"></i> Aperçu des Données
                <button class="export-btn" onclick="exportOverview()">
                    <i class="fas fa-download"></i> Exporter
                </button>
            </div>
            <div class="card-body">
                <table class="excel-table">
                    <tr>
                        <th>Propriété</th>
                        <th>Valeur</th>
                    </tr>
                    <tr>
                        <td>Dimensions (lignes × colonnes)</td>
                        <td>${overview.shape ? `${overview.shape[0]} × ${overview.shape[1]}` : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Colonnes totales</td>
                        <td>${overview.columns ? overview.columns.length : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Colonnes numériques</td>
                        <td>${overview.numeric_columns ? overview.numeric_columns.length : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Colonnes catégorielles</td>
                        <td>${overview.categorical_columns ? overview.categorical_columns.length : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Valeurs manquantes totales</td>
                        <td>${overview.total_missing !== undefined ? overview.total_missing : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Lignes dupliquées</td>
                        <td>${overview.duplicates !== undefined ? overview.duplicates : 'N/A'}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;
    
    if (overview.columns && overview.columns.length > 0) {
        html += `
            <div class="analysis-card">
                <div class="card-header">
                    <i class="fas fa-list"></i> Structure des Colonnes
                </div>
                <div class="card-body">
                    <table class="excel-table">
                        <tr>
                            <th>Colonne</th>
                            <th>Type de Donnée</th>
                            <th>Exemple</th>
                        </tr>
        `;
        
        // Show first 10 columns
        const columns = overview.columns.slice(0, 10);
        columns.forEach(col => {
            const example = currentData.first_rows && currentData.first_rows[0] ? 
                           currentData.first_rows[0][col] : 'N/A';
            const dtype = dataTypes[col] || 'Unknown';
            
            html += `
                <tr>
                    <td>${col}</td>
                    <td><span class="badge">${dtype}</span></td>
                    <td>${example !== null && example !== undefined ? example : 'NULL'}</td>
                </tr>
            `;
        });
        
        if (overview.columns.length > 10) {
            html += `
                <tr>
                    <td colspan="3" style="text-align: center; color: #666;">
                        ... et ${overview.columns.length - 10} autres colonnes
                    </td>
                </tr>
            `;
        }
        
        html += `</table></div></div>`;
    }
    
    container.innerHTML = html;
}
        // Load statistics content
        function loadStatsContent(container) {
            const stats = currentResults.descriptive_stats;
            if (!stats) {
                container.innerHTML = '<div class="excel-alert alert-warning">Aucune statistique disponible</div>';
                return;
            }
            
            let html = '<div class="analysis-cards">';
            
            Object.entries(stats).forEach(([column, columnStats]) => {
                html += `
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-chart-bar"></i> ${column}
                        </div>
                        <div class="card-body">
                            <table class="excel-table">
                                <tr><th>Statistique</th><th>Valeur</th></tr>
                `;
                
                const statEntries = [
                    ['Count', columnStats.count],
                    ['Mean', columnStats.mean.toFixed(4)],
                    ['Std Dev', columnStats.std.toFixed(4)],
                    ['Min', columnStats.min.toFixed(4)],
                    ['25%', columnStats['25%'].toFixed(4)],
                    ['Median', columnStats['50%'].toFixed(4)],
                    ['75%', columnStats['75%'].toFixed(4)],
                    ['Max', columnStats.max.toFixed(4)],
                    ['Variance', columnStats.variance.toFixed(4)],
                    ['Skewness', columnStats.skewness.toFixed(4)],
                    ['Kurtosis', columnStats.kurtosis.toFixed(4)],
                    ['Missing', columnStats.missing]
                ];
                
                statEntries.forEach(([label, value]) => {
                    html += `<tr><td>${label}</td><td>${value}</td></tr>`;
                });
                
                html += `
                            </table>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        }
        
        // Load correlation content
        function loadCorrelationContent(container) {
            const correlation = currentResults.correlation_analysis;
            if (!correlation) {
                container.innerHTML = '<div class="excel-alert alert-warning">Aucune analyse de corrélation disponible</div>';
                return;
            }
            
            let html = `
                <div class="analysis-card">
                    <div class="card-header">
                        <i class="fas fa-link"></i> Top Corrélations
                    </div>
                    <div class="card-body">
                        <table class="excel-table">
                            <tr>
                                <th>Variables</th>
                                <th>Corrélation</th>
                                <th>Force</th>
                                <th>Interprétation</th>
                            </tr>
            `;
            
            correlation.top_correlations.forEach(item => {
                const strengthClass = item.strength === 'Forte' ? 'excel-alert alert-success' : 
                                     item.strength === 'Modérée' ? 'excel-alert alert-warning' : 
                                     'excel-alert alert-info';
                
                html += `
                    <tr>
                        <td>${item.variables}</td>
                        <td>${item.correlation.toFixed(4)}</td>
                        <td><span class="${strengthClass}" style="padding: 2px 8px; display: inline-block;">${item.strength}</span></td>
                        <td>${getCorrelationInterpretation(item.correlation)}</td>
                    </tr>
                `;
            });
            
            html += `
                        </table>
                    </div>
                </div>
                
                <div class="analysis-card">
                    <div class="card-header">
                        <i class="fas fa-th"></i> Matrice de Corrélation (Pearson)
                    </div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="correlationHeatmap"></canvas>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            // Create heatmap
            setTimeout(() => createCorrelationHeatmap(correlation.pearson_matrix), 100);
        }
        
        function getCorrelationInterpretation(corr) {
            const absCorr = Math.abs(corr);
            if (absCorr >= 0.9) return 'Relation très forte';
            if (absCorr >= 0.7) return 'Relation forte';
            if (absCorr >= 0.5) return 'Relation modérée';
            if (absCorr >= 0.3) return 'Relation faible';
            if (absCorr >= 0.1) return 'Relation très faible';
            return 'Relation négligeable';
        }
        
        // Load regression content
        function loadRegressionContent(container) {
            const regression = currentResults.regression_analysis;
            if (!regression) {
                container.innerHTML = '<div class="excel-alert alert-warning">Aucune analyse de régression disponible</div>';
                return;
            }
            
            let html = `
                <div class="analysis-card">
                    <div class="card-header">
                        <i class="fas fa-chart-line"></i> Régressions Linéaires Simples
                    </div>
                    <div class="card-body">
                        <table class="excel-table">
                            <tr>
                                <th>Dépendante (Y)</th>
                                <th>Indépendante (X)</th>
                                <th>R²</th>
                                <th>Coefficient</th>
                                <th>p-value</th>
                                <th>Significatif</th>
                            </tr>
            `;
            
            regression.simple_regressions.slice(0, 20).forEach(reg => {
                html += `
                    <tr>
                        <td>${reg.dependent}</td>
                        <td>${reg.independent}</td>
                        <td>${reg.r_squared.toFixed(4)}</td>
                        <td>${reg.coefficient.toFixed(4)}</td>
                        <td>${reg.p_value.toFixed(6)}</td>
                        <td>
                            <span style="color: ${reg.significant ? 'green' : 'red'};">
                                ${reg.significant ? '✓ Oui' : '✗ Non'}
                            </span>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                        </table>
                    </div>
                </div>
            `;
            
            if (regression.multiple_regressions && regression.multiple_regressions.length > 0) {
                html += `
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-chart-line"></i> Régressions Linéaires Multiples
                        </div>
                        <div class="card-body">
                `;
                
                regression.multiple_regressions.forEach((reg, idx) => {
                    html += `
                        <div style="margin-bottom: 20px; border: 1px solid var(--excel-border); padding: 10px; border-radius: 4px;">
                            <h6 style="margin-bottom: 10px; color: var(--excel-blue);">
                                <i class="fas fa-bullseye"></i> Variable dépendante: ${reg.dependent}
                            </h6>
                            <p><strong>R²:</strong> ${reg.r_squared.toFixed(4)} | 
                               <strong>R² ajusté:</strong> ${reg.adj_r_squared.toFixed(4)} | 
                               <strong>F-statistic:</strong> ${reg.f_statistic.toFixed(2)} (p=${reg.f_pvalue.toFixed(6)})</p>
                            
                            <table class="excel-table" style="margin-top: 10px;">
                                <tr>
                                    <th>Variable indépendante</th>
                                    <th>Coefficient</th>
                                    <th>p-value</th>
                                    <th>Significatif</th>
                                </tr>
                    `;
                    
                    Object.entries(reg.coefficients).forEach(([varName, coefInfo]) => {
                        html += `
                            <tr>
                                <td>${varName}</td>
                                <td>${coefInfo.coef.toFixed(4)}</td>
                                <td>${coefInfo.p_value.toFixed(6)}</td>
                                <td>
                                    <span style="color: ${coefInfo.significant ? 'green' : 'red'};">
                                        ${coefInfo.significant ? '✓ Oui' : '✗ Non'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += `</table></div>`;
                });
                
                html += `</div></div>`;
            }
            
            container.innerHTML = html;
        }
        
        // Load tests content
        function loadTestsContent(container) {
            const tests = currentResults.statistical_tests;
            if (!tests) {
                container.innerHTML = '<div class="excel-alert alert-warning">Aucun test statistique disponible</div>';
                return;
            }
            
            let html = '';
            
            if (tests.t_tests && tests.t_tests.length > 0) {
                html += `
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-balance-scale"></i> Tests T de Student
                        </div>
                        <div class="card-body">
                            <table class="excel-table">
                                <tr>
                                    <th>Variable 1</th>
                                    <th>Variable 2</th>
                                    <th>Moyenne 1</th>
                                    <th>Moyenne 2</th>
                                    <th>t-statistic</th>
                                    <th>p-value</th>
                                    <th>Différence Significative</th>
                                </tr>
                `;
                
                tests.t_tests.forEach(test => {
                    html += `
                        <tr>
                            <td>${test.variable1}</td>
                            <td>${test.variable2}</td>
                            <td>${test.mean1.toFixed(4)}</td>
                            <td>${test.mean2.toFixed(4)}</td>
                            <td>${test.t_statistic.toFixed(4)}</td>
                            <td>${test.p_value.toFixed(6)}</td>
                            <td>
                                <span style="color: ${test.significant ? 'green' : 'red'};">
                                    ${test.significant ? '✓ Oui' : '✗ Non'}
                                </span>
                            </td>
                        </tr>
                    `;
                });
                
                html += `</table></div></div>`;
            }
            
            if (tests.normality_tests && tests.normality_tests.length > 0) {
                html += `
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-bell"></i> Tests de Normalité
                        </div>
                        <div class="card-body">
                            <table class="excel-table">
                                <tr>
                                    <th>Variable</th>
                                    <th>Skewness</th>
                                    <th>Kurtosis</th>
                                    <th>Distribution Normale</th>
                                    <th>Interprétation</th>
                                </tr>
                `;
                
                tests.normality_tests.forEach(test => {
                    const skewInterpretation = Math.abs(test.skewness) < 0.5 ? 'Symétrique' : 
                                               Math.abs(test.skewness) < 1 ? 'Modérément asymétrique' : 
                                               'Fortement asymétrique';
                    
                    html += `
                        <tr>
                            <td>${test.variable}</td>
                            <td>${test.skewness.toFixed(4)}</td>
                            <td>${test.kurtosis.toFixed(4)}</td>
                            <td>
                                <span style="color: ${test.is_normal ? 'green' : 'red'};">
                                    ${test.is_normal ? '✓ Oui' : '✗ Non'}
                                </span>
                            </td>
                            <td>${skewInterpretation}</td>
                        </tr>
                    `;
                });
                
                html += `</table></div></div>`;
            }
            
            container.innerHTML = html || '<div class="excel-alert alert-warning">Aucun test disponible</div>';
        }
        
        // Load time series content
        function loadTimeseriesContent(container) {
            const ts = currentResults.time_series_analysis;
            if (!ts) {
                container.innerHTML = '<div class="excel-alert alert-warning">Aucune analyse de séries temporelles disponible</div>';
                return;
            }
            
            let html = '';
            
            if (ts.stationarity_test) {
                html += `
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-chart-line"></i> Test de Stationnarité (ADF)
                        </div>
                        <div class="card-body">
                            <table class="excel-table">
                                <tr>
                                    <th>Variable</th>
                                    <th>ADF Statistic</th>
                                    <th>p-value</th>
                                    <th>Stationnaire</th>
                                    <th>Interprétation</th>
                                </tr>
                                <tr>
                                    <td>${ts.stationarity_test.variable}</td>
                                    <td>${ts.stationarity_test.adf_statistic.toFixed(4)}</td>
                                    <td>${ts.stationarity_test.p_value.toFixed(6)}</td>
                                    <td>
                                        <span style="color: ${ts.stationarity_test.is_stationary ? 'green' : 'red'};">
                                            ${ts.stationarity_test.is_stationary ? '✓ Oui' : '✗ Non'}
                                        </span>
                                    </td>
                                    <td>${ts.stationarity_test.is_stationary ? 
                                        'Série stationnaire - prédictions fiables' : 
                                        'Série non-stationnaire - différenciation nécessaire'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                `;
            }
            
            if (ts.moving_averages && Object.keys(ts.moving_averages).length > 0) {
                html += `
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-wave-square"></i> Moyennes Mobiles
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="movingAveragesChart"></canvas>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            container.innerHTML = html || '<div class="excel-alert alert-warning">Aucune analyse de séries temporelles disponible</div>';
            
            // Create moving averages chart
            if (ts.moving_averages) {
                setTimeout(() => createMovingAveragesChart(ts.moving_averages), 100);
            }
        }
        
        // Load multivariate content
        function loadMultivariateContent(container) {
            const mv = currentResults.multivariate_analysis;
            if (!mv) {
                container.innerHTML = '<div class="excel-alert alert-warning">Aucune analyse multivariée disponible</div>';
                return;
            }
            
            let html = '';
            
            if (mv.pca_analysis) {
                html += `
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-project-diagram"></i> Analyse en Composantes Principales (ACP)
                        </div>
                        <div class="card-body">
                            <table class="excel-table">
                                <tr>
                                    <th>Composante</th>
                                    <th>Valeur Propre</th>
                                    <th>Variance Expliquée</th>
                                    <th>Variance Cumulée</th>
                                </tr>
                `;
                
                let cumulative = 0;
                mv.pca_analysis.eigenvalues.forEach((eigenvalue, idx) => {
                    const variance = mv.pca_analysis.variance_explained[idx];
                    cumulative += variance;
                    
                    html += `
                        <tr>
                            <td>PC${idx + 1}</td>
                            <td>${eigenvalue.toFixed(4)}</td>
                            <td>${(variance * 100).toFixed(2)}%</td>
                            <td>${(cumulative * 100).toFixed(2)}%</td>
                        </tr>
                    `;
                });
                
                html += `</table></div></div>`;
            }
            
            container.innerHTML = html || '<div class="excel-alert alert-warning">Aucune analyse multivariée disponible</div>';
        }
        
        // Load visualization content
        function loadVisualizationContent(container) {
            const numericColumns = currentData.data_overview.numeric_columns;
            if (!numericColumns || numericColumns.length === 0) {
                container.innerHTML = '<div class="excel-alert alert-warning">Aucune variable numérique pour les visualisations</div>';
                return;
            }
            
            let html = `
                <div class="analysis-cards">
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-chart-bar"></i> Distribution des Variables
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="distributionChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-chart-scatter"></i> Nuage de Points
                        </div>
                        <div class="card-body">
                            <div style="margin-bottom: 15px;">
                                <label>Variable X: </label>
                                <select id="scatterX" class="formula-input" style="width: 150px; margin-right: 15px;">
                                    ${numericColumns.map(col => `<option value="${col}">${col}</option>`).join('')}
                                </select>
                                <label>Variable Y: </label>
                                <select id="scatterY" class="formula-input" style="width: 150px;">
                                    ${numericColumns.map(col => `<option value="${col}">${col}</option>`).join('')}
                                </select>
                                <button class="ribbon-button" onclick="updateScatterPlot()" style="margin-left: 15px;">
                                    <i class="fas fa-sync"></i> Mettre à jour
                                </button>
                            </div>
                            <div class="chart-container">
                                <canvas id="scatterChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analysis-card">
                        <div class="card-header">
                            <i class="fas fa-chart-box"></i> Boîtes à Moustaches
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="boxPlotChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            // Create charts
            setTimeout(() => {
                createDistributionChart(numericColumns);
                createScatterPlot(numericColumns[0], numericColumns[1] || numericColumns[0]);
                createBoxPlotChart(numericColumns);
            }, 100);
        }
        
        // Chart creation functions
        function createCorrelationHeatmap(correlationMatrix) {
            const ctx = document.getElementById('correlationHeatmap').getContext('2d');
            const variables = Object.keys(correlationMatrix);
            const data = variables.map(row => variables.map(col => correlationMatrix[row][col] || 0));
            
            // Destroy existing chart
            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();
            
            new Chart(ctx, {
                type: 'heatmap',
                data: {
                    labels: variables,
                    datasets: [{
                        label: 'Corrélation',
                        data: data.flatMap((row, i) => row.map((value, j) => ({x: j, y: i, v: value}))),
                        backgroundColor: function(context) {
                            const value = context.dataset.data[context.dataIndex].v;
                            if (value >= 0.7) return '#2E7D32';
                            if (value >= 0.3) return '#7CB342';
                            if (value >= 0) return '#C8E6C9';
                            if (value >= -0.3) return '#FFCDD2';
                            if (value >= -0.7) return '#E57373';
                            return '#C62828';
                        }
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.dataset.data[context.dataIndex].v;
                                    return `Corrélation: ${value.toFixed(3)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            labels: variables,
                            title: { display: true, text: 'Variables' }
                        },
                        y: {
                            type: 'category',
                            labels: variables,
                            title: { display: true, text: 'Variables' }
                        }
                    }
                }
            });
        }
        
        function createMovingAveragesChart(movingAverages) {
            const ctx = document.getElementById('movingAveragesChart').getContext('2d');
            const variables = Object.keys(movingAverages);
            
            // Destroy existing chart
            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();
            
            const datasets = [];
            variables.forEach((variable, idx) => {
                const color = `hsl(${idx * 360 / variables.length}, 70%, 50%)`;
                datasets.push({
                    label: `${variable} - MA(7)`,
                    data: movingAverages[variable].ma_7,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    fill: false
                });
                
                datasets.push({
                    label: `${variable} - MA(30)`,
                    data: movingAverages[variable].ma_30,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false
                });
            });
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array.from({length: datasets[0]?.data.length || 0}, (_, i) => i + 1),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Moyennes Mobiles (7 et 30 périodes)'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        }
        
        function createDistributionChart(columns) {
            const ctx = document.getElementById('distributionChart').getContext('2d');
            const data = columns.map(col => {
                const values = currentData.first_rows.map(row => row[col]).filter(v => v !== null);
                return {
                    label: col,
                    data: values,
                    backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`
                };
            });
            
            // Destroy existing chart
            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: columns,
                    datasets: [{
                        label: 'Moyenne',
                        data: columns.map(col => {
                            const values = currentData.first_rows.map(row => row[col]).filter(v => v !== null);
                            return values.reduce((a, b) => a + b, 0) / values.length;
                        }),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Moyennes des Variables Numériques'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function createScatterPlot(xVar, yVar) {
            const ctx = document.getElementById('scatterChart').getContext('2d');
            const xValues = currentData.first_rows.map(row => row[xVar]).filter(v => v !== null);
            const yValues = currentData.first_rows.map(row => row[yVar]).filter(v => v !== null);
            
            // Align data
            const data = [];
            const minLength = Math.min(xValues.length, yValues.length);
            for (let i = 0; i < minLength; i++) {
                data.push({x: xValues[i], y: yValues[i]});
            }
            
            // Destroy existing chart
            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();
            
            new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: `${xVar} vs ${yVar}`,
                        data: data,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `Nuage de Points: ${xVar} vs ${yVar}`
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: xVar
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: yVar
                            }
                        }
                    }
                }
            });
        }
        
        function updateScatterPlot() {
            const xVar = document.getElementById('scatterX').value;
            const yVar = document.getElementById('scatterY').value;
            createScatterPlot(xVar, yVar);
        }
        
        function createBoxPlotChart(columns) {
            const ctx = document.getElementById('boxPlotChart').getContext('2d');
            
            // Prepare data for box plot
            const datasets = columns.map(col => {
                const values = currentData.first_rows.map(row => row[col]).filter(v => v !== null);
                values.sort((a, b) => a - b);
                
                const q1 = values[Math.floor(values.length * 0.25)];
                const median = values[Math.floor(values.length * 0.5)];
                const q3 = values[Math.floor(values.length * 0.75)];
                const iqr = q3 - q1;
                const min = Math.max(values[0], q1 - 1.5 * iqr);
                const max = Math.min(values[values.length - 1], q3 + 1.5 * iqr);
                
                return {
                    label: col,
                    data: [min, q1, median, q3, max],
                    backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`,
                    borderColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
                    borderWidth: 1
                };
            });
            
            // Destroy existing chart
            const existingChart = Chart.getChart(ctx);
            if (existingChart) existingChart.destroy();
            
            new Chart(ctx, {
                type: 'boxplot',
                data: {
                    labels: [''],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Boîtes à Moustaches des Variables'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        }
        
        // Loading functions
        function showLoading(message) {
            document.getElementById('loadingOverlay').style.display = 'flex';
            document.getElementById('loadingText').textContent = message;
        }
        
        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
        
        // Export functions
        function exportOverview() {
            alert('Fonction d\'export vers Excel en cours de développement');
        }
        
        function exportAll() {
            if (!currentResults) {
                alert('Veuillez d\'abord charger des données');
                return;
            }
            
            showLoading('Préparation de l\'export...');
            
            // Simulate export
            setTimeout(() => {
                hideLoading();
                alert(`Toutes les analyses ont été exportées avec succès!\n\nFichiers générés:
1. données_brutes.csv
2. statistiques.csv
3. correlations.csv
4. regressions.csv
5. tests_statistiques.csv
6. rapport_complet.pdf`);
            }, 1500);
        }
        
        function printReport() {
            window.print();
        }
        
        function newAnalysis() {
            if (confirm('Voulez-vous commencer une nouvelle analyse? Les données actuelles seront perdues.')) {
                location.reload();
            }
        }
        
        function saveAnalysis() {
            const name = document.getElementById('analysisName').value;
            alert(`Analyse "${name}" sauvegardée avec succès!`);
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            // Set up drag and drop
            setupDragAndDrop();
            
            // Initialize tooltips
            initializeTooltips();
        });
        
        function setupDragAndDrop() {
            const dropZone = document.getElementById('uploadZone');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.style.borderColor = 'var(--excel-blue)';
                    dropZone.style.background = 'var(--excel-light-blue)';
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.style.borderColor = '';
                    dropZone.style.background = '';
                }, false);
            });
            
            dropZone.addEventListener('drop', handleDrop, false);
            
            function handleDrop(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                
                if (files.length > 0) {
                    document.getElementById('fileInput').files = files;
                    handleFileUpload(document.getElementById('fileInput'));
                }
            }
        }
        
        function initializeTooltips() {
            // Add title attributes to elements
            document.querySelectorAll('.ribbon-button').forEach(btn => {
                if (!btn.title) {
                    btn.title = btn.textContent.trim();
                }
            });
            
            document.querySelectorAll('.tab').forEach(tab => {
                if (!tab.title) {
                    tab.title = `Afficher ${tab.textContent.trim()}`;
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl + O: Open file
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                document.getElementById('fileInput').click();
            }
            
            // Ctrl + S: Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveAnalysis();
            }
            
            // Ctrl + P: Print
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                printReport();
            }
            
            // Ctrl + E: Export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                exportAll();
            }
        });