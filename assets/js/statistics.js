/**
 * ========================================
 * Statistics Page - Script de Estadísticas y Reportes
 * ========================================
 * 
 * Script que maneja la lógica de la vista de estadísticas.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let statisticsController = null;
let authController = null;
let userController = null;
let currentUser = null;
let charts = {}; // Almacenar instancias de gráficos

/**
 * Verifica dependencias
 */
function checkDependencies() {
    const required = {
        'EnvLoader': typeof EnvLoader !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'AuthRepository': typeof AuthRepository !== 'undefined',
        'AuthController': typeof AuthController !== 'undefined',
        'StatisticsRepository': typeof StatisticsRepository !== 'undefined',
        'StatisticsController': typeof StatisticsController !== 'undefined',
        'UserRepository': typeof UserRepository !== 'undefined',
        'UserController': typeof UserController !== 'undefined',
        'RoleManager': typeof RoleManager !== 'undefined',
        'Chart': typeof Chart !== 'undefined'
    };

    const missing = Object.keys(required).filter(dep => !required[dep]);
    
    if (missing.length > 0) {
        console.error('❌ Dependencias faltantes:', missing);
        console.error('💡 Solución: Presiona Ctrl+Shift+R para recargar o limpia la caché del navegador');
        return false;
    }
    
    console.log('✓ Todas las dependencias cargadas correctamente');
    return true;
}

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ [STATISTICS] Inicializando estadísticas...');
        console.log('→ [STATISTICS] URL actual:', window.location.href);

        // Verificar dependencias
        console.log('→ [STATISTICS] Verificando dependencias...');
        if (!checkDependencies()) {
            console.error('❌ [STATISTICS] Dependencias faltantes, deteniendo inicialización');
            hideLoading();
            return;
        }
        console.log('✓ [STATISTICS] Dependencias verificadas');

        showLoading();

        // 1. Cargar variables de entorno
        console.log('→ [STATISTICS] Cargando configuración...');
        const config = await EnvLoader.loadEnv();
        
        if (!EnvLoader.validateConfig(config)) {
            console.error('❌ [STATISTICS] Configuración inválida');
            showError('Error de configuración. Por favor, configura tu archivo firebase-config.js correctamente.');
            hideLoading();
            return;
        }
        console.log('✓ [STATISTICS] Configuración cargada');

        // 2. Inicializar servicios
        console.log('→ [STATISTICS] Inicializando Firebase...');
        const firebaseService = FirebaseService.getInstance();
        await firebaseService.initialize(config);
        console.log('✓ [STATISTICS] Firebase inicializado');

        // 3. Verificar autenticación
        console.log('→ [STATISTICS] Verificando autenticación...');
        const authRepository = new AuthRepository(firebaseService);
        authController = new AuthController(authRepository);
        
        const isAuth = authController.isAuthenticated();
        console.log('→ [STATISTICS] Estado de autenticación:', isAuth);

        if (!isAuth) {
            console.warn('⚠️ [STATISTICS] Usuario no autenticado, redirigiendo a login...');
            hideLoading();
            setTimeout(() => {
                console.log('→ [STATISTICS] Ejecutando redirección a login');
                window.location.replace('../login.html');
            }, 100);
            return;
        }
        console.log('✓ [STATISTICS] Usuario autenticado');

        // 4. Obtener usuario completo para verificar rol
        console.log('→ [STATISTICS] Obteniendo datos del usuario...');
        const userRepository = new UserRepository(firebaseService);
        userController = new UserController(userRepository, firebaseService);
        
        try {
            currentUser = await userController.getCurrentUser();
            console.log('→ [STATISTICS] Usuario obtenido:', currentUser ? 'Sí' : 'No');
            if (currentUser) {
                console.log('→ [STATISTICS] Datos del usuario:', {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    role: currentUser.role,
                    hasIsAdmin: typeof currentUser.isAdmin === 'function'
                });
            }
        } catch (error) {
            console.error('❌ [STATISTICS] Error al obtener usuario:', error);
            console.error('Stack:', error.stack);
            showError('Error al obtener información del usuario.');
            hideLoading();
            return;
        }

        if (!currentUser) {
            console.warn('⚠️ [STATISTICS] Usuario no encontrado, redirigiendo a login...');
            hideLoading();
            setTimeout(() => {
                console.log('→ [STATISTICS] Ejecutando redirección a login (usuario no encontrado)');
                window.location.replace('../login.html');
            }, 500);
            return;
        }

        // 5. Verificar que sea administrador
        console.log('→ [STATISTICS] Verificando rol del usuario...');
        console.log('→ [STATISTICS] Role:', currentUser.role);
        console.log('→ [STATISTICS] Tipo de currentUser.isAdmin:', typeof currentUser.isAdmin);
        
        let isAdmin = false;
        if (typeof currentUser.isAdmin === 'function') {
            try {
                isAdmin = currentUser.isAdmin();
                console.log('→ [STATISTICS] Resultado de isAdmin():', isAdmin);
            } catch (error) {
                console.error('❌ [STATISTICS] Error al llamar isAdmin():', error);
                isAdmin = currentUser.role === 'admin';
            }
        } else {
            isAdmin = currentUser.role === 'admin';
            console.log('→ [STATISTICS] isAdmin no es función, usando comparación directa:', isAdmin);
        }
        
        if (!isAdmin) {
            console.warn('⚠️ [STATISTICS] Usuario NO es administrador');
            console.log('→ [STATISTICS] Redirigiendo a dashboard en 2 segundos...');
            showError('No tienes permiso para ver esta sección.');
            hideLoading();
            setTimeout(() => {
                console.log('→ [STATISTICS] Ejecutando redirección a dashboard (no admin)');
                window.location.replace('../dashboard.html');
            }, 2000);
            return;
        }
        
        console.log('✓ [STATISTICS] Usuario administrador verificado correctamente');

        // 6. Configurar navbar según rol
        if (typeof NavbarUtils !== 'undefined') {
            NavbarUtils.setupNavbarPermissions(currentUser);
        }

        // 7. Crear controlador de estadísticas
        console.log('→ [STATISTICS] Creando controlador de estadísticas...');
        try {
            const statisticsRepository = new StatisticsRepository(firebaseService);
            statisticsController = new StatisticsController(statisticsRepository);
            console.log('✓ [STATISTICS] Controlador de estadísticas creado');
        } catch (error) {
            console.error('❌ [STATISTICS] Error al crear controlador de estadísticas:', error);
            console.error('Stack:', error.stack);
            showError('Error al inicializar el módulo de estadísticas.');
            hideLoading();
            return;
        }

        console.log('✓ [STATISTICS] Aplicación inicializada correctamente - NO DEBERÍA REDIRIGIR DESDE AQUÍ');

        // 8. Cargar datos del usuario en navbar
        console.log('→ [STATISTICS] Cargando datos en navbar...');
        try {
            loadUserDataInNavbar();
            console.log('✓ [STATISTICS] Datos del navbar cargados');
        } catch (error) {
            console.error('❌ [STATISTICS] Error al cargar datos en navbar:', error);
        }

        // 9. Cargar todas las estadísticas
        console.log('→ [STATISTICS] Iniciando carga de estadísticas...');
        try {
            await loadAllStatistics();
            console.log('✓ [STATISTICS] Estadísticas cargadas');
        } catch (error) {
            console.error('❌ [STATISTICS] Error crítico al cargar estadísticas:', error);
            console.error('Stack:', error.stack);
            showError('Error al cargar las estadísticas. Algunos datos pueden no estar disponibles.');
            // No retornar aquí, permitir que la página se muestre aunque haya errores
        }

        // 10. Configurar event listeners
        console.log('→ [STATISTICS] Configurando event listeners...');
        try {
            setupEventListeners();
            console.log('✓ [STATISTICS] Event listeners configurados');
        } catch (error) {
            console.error('❌ [STATISTICS] Error al configurar event listeners:', error);
        }

        hideLoading();
        console.log('✓✓✓ [STATISTICS] PÁGINA DE ESTADÍSTICAS CARGADA COMPLETAMENTE - NO DEBERÍA REDIRIGIR');

    } catch (error) {
        console.error('❌❌❌ [STATISTICS] ERROR CRÍTICO al inicializar aplicación:', error);
        console.error('Stack trace completo:', error.stack);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        showError('Error al inicializar la aplicación. Por favor, recarga la página.');
        hideLoading();
        // NO redirigir automáticamente aquí para permitir ver el error
        // Si es un error crítico, el usuario puede recargar manualmente
    }
}

/**
 * Carga todas las estadísticas
 */
async function loadAllStatistics() {
    if (!statisticsController) {
        console.error('❌ StatisticsController no está inicializado');
        return;
    }

    try {
        console.log('→ Cargando estadísticas generales...');
        await loadGeneralStatistics();
        console.log('✓ Estadísticas generales cargadas');
        
        console.log('→ Cargando gráficos...');
        await loadCharts();
        console.log('✓ Gráficos cargados');

        console.log('→ Cargando alertas más comunes...');
        await loadMostCommonAlerts();
        console.log('✓ Alertas más comunes cargadas');

        console.log('→ Cargando análisis de patrones...');
        await loadPatternAnalysis();
        console.log('✓ Análisis de patrones cargado');

    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        console.error('Stack trace:', error.stack);
        // No mostrar error aquí, ya se maneja en initializeApp
        throw error; // Re-lanzar para que se maneje en initializeApp
    }
}

/**
 * Carga estadísticas generales
 */
async function loadGeneralStatistics() {
    try {
        const result = await statisticsController.getGeneralStatistics();
        
        if (result.success && result.statistics) {
            const stats = result.statistics;
            
            document.getElementById('statTotalAlerts').textContent = stats.totalAlerts || 0;
            document.getElementById('statActiveAlerts').textContent = stats.activeAlerts || 0;
            document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('statTotalLocations').textContent = stats.totalLocations || 0;
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas generales:', error);
    }
}

/**
 * Carga todos los gráficos
 */
async function loadCharts() {
    try {
        await Promise.all([
            loadAlertsByTypeChart().catch(err => console.error('Error en loadAlertsByTypeChart:', err)),
            loadAlertsBySeverityChart().catch(err => console.error('Error en loadAlertsBySeverityChart:', err)),
            loadAlertsTrendsChart('month').catch(err => console.error('Error en loadAlertsTrendsChart:', err)),
            loadMostAffectedZonesChart().catch(err => console.error('Error en loadMostAffectedZonesChart:', err)),
            loadUsersByRoleChart().catch(err => console.error('Error en loadUsersByRoleChart:', err))
        ]);
    } catch (error) {
        console.error('❌ Error al cargar uno o más gráficos:', error);
        // Continuar aunque algunos gráficos fallen
    }
}

/**
 * Carga gráfico de alertas por tipo
 */
async function loadAlertsByTypeChart() {
    try {
        const result = await statisticsController.getAlertsByType();
        
        const ctx = document.getElementById('alertsByTypeChart');
        if (!ctx) return;

        if (!result.success || result.labels.length === 0 || result.values.every(v => v === 0)) {
            ctx.parentElement.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-chart-bar fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">No hay datos disponibles para mostrar</p>
                </div>
            `;
            return;
        }

        // Destruir gráfico anterior si existe
        if (charts.alertsByType) {
            charts.alertsByType.destroy();
        }

        charts.alertsByType = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: result.labels.map(label => label.charAt(0).toUpperCase() + label.slice(1).replace('_', ' ')),
                datasets: [{
                    label: 'Número de Alertas',
                    data: result.values,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error al cargar gráfico de alertas por tipo:', error);
    }
}

/**
 * Carga gráfico de alertas por severidad
 */
async function loadAlertsBySeverityChart() {
    try {
        const result = await statisticsController.getAlertsBySeverity();
        
        const ctx = document.getElementById('alertsBySeverityChart');
        if (!ctx) return;

        if (!result.success || result.labels.length === 0 || result.values.every(v => v === 0)) {
            ctx.parentElement.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-chart-pie fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">No hay datos disponibles para mostrar</p>
                </div>
            `;
            return;
        }

        // Destruir gráfico anterior si existe
        if (charts.alertsBySeverity) {
            charts.alertsBySeverity.destroy();
        }

        const colors = {
            'leve': 'rgba(54, 162, 235, 0.8)',
            'moderada': 'rgba(255, 206, 86, 0.8)',
            'grave': 'rgba(255, 159, 64, 0.8)',
            'critica': 'rgba(255, 99, 132, 0.8)'
        };

        charts.alertsBySeverity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: result.labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
                datasets: [{
                    label: 'Alertas por Severidad',
                    data: result.values,
                    backgroundColor: result.labels.map(label => colors[label] || 'rgba(153, 102, 255, 0.8)'),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error al cargar gráfico de alertas por severidad:', error);
    }
}

/**
 * Carga gráfico de tendencias de alertas
 */
async function loadAlertsTrendsChart(period = 'month') {
    try {
        const result = await statisticsController.getAlertsTrends(period);
        
        const ctx = document.getElementById('alertsTrendsChart');
        if (!ctx) return;

        if (!result.success || result.labels.length === 0 || result.values.every(v => v === 0)) {
            ctx.parentElement.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-chart-line fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">No hay datos disponibles para el período seleccionado</p>
                </div>
            `;
            return;
        }

        // Destruir gráfico anterior si existe
        if (charts.alertsTrends) {
            charts.alertsTrends.destroy();
        }

        charts.alertsTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: result.labels,
                datasets: [{
                    label: 'Número de Alertas',
                    data: result.values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error al cargar gráfico de tendencias:', error);
    }
}

/**
 * Carga gráfico de zonas más afectadas
 */
async function loadMostAffectedZonesChart() {
    try {
        const result = await statisticsController.getMostAffectedZones(5);
        
        if (!result.success || result.labels.length === 0) {
            document.getElementById('mostAffectedZonesChart').parentElement.innerHTML = 
                '<p class="text-muted text-center py-4">No hay datos disponibles</p>';
            return;
        }

        const ctx = document.getElementById('mostAffectedZonesChart');
        if (!ctx) return;

        // Destruir gráfico anterior si existe
        if (charts.mostAffectedZones) {
            charts.mostAffectedZones.destroy();
        }

        charts.mostAffectedZones = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: result.labels.map((label, index) => {
                    // Acortar nombres largos
                    if (label.length > 20) {
                        return label.substring(0, 17) + '...';
                    }
                    return label;
                }),
                datasets: [{
                    label: 'Número de Alertas',
                    data: result.values,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error al cargar gráfico de zonas afectadas:', error);
    }
}

/**
 * Carga gráfico de usuarios por rol
 */
async function loadUsersByRoleChart() {
    try {
        const result = await statisticsController.getGeneralStatistics();
        
        const ctx = document.getElementById('usersByRoleChart');
        if (!ctx) return;

        if (!result.success || !result.statistics) {
            ctx.parentElement.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-users fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">No hay datos disponibles para mostrar</p>
                </div>
            `;
            return;
        }

        const stats = result.statistics;
        
        if (stats.totalUsers === 0) {
            ctx.parentElement.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-users fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">No hay usuarios registrados</p>
                </div>
            `;
            return;
        }

        // Destruir gráfico anterior si existe
        if (charts.usersByRole) {
            charts.usersByRole.destroy();
        }

        charts.usersByRole = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Administradores', 'Usuarios'],
                datasets: [{
                    label: 'Usuarios por Rol',
                    data: [stats.adminUsers, stats.regularUsers],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error al cargar gráfico de usuarios por rol:', error);
    }
}

/**
 * Carga lista de alertas más comunes
 */
async function loadMostCommonAlerts() {
    try {
        const result = await statisticsController.getAlertsByType();
        
        const container = document.getElementById('mostCommonAlertsList');
        if (!container) return;

        if (!result.success || result.labels.length === 0 || result.values.every(v => v === 0)) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-list-ol fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">No hay alertas registradas</p>
                </div>
            `;
            return;
        }

        // Ordenar por cantidad y tomar los 5 más comunes
        const sorted = result.labels
            .map((label, index) => ({
                type: label,
                count: result.values[index]
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-list-ol fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">No hay alertas registradas</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sorted.map((item, index) => `
            <div class="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                <div class="d-flex align-items-center">
                    <span class="badge bg-primary me-3" style="font-size: 1.2rem; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center;">
                        ${index + 1}
                    </span>
                    <div>
                        <h6 class="mb-0">${escapeHtml(item.type.charAt(0).toUpperCase() + item.type.slice(1).replace('_', ' '))}</h6>
                        <small class="text-muted">${item.count} alerta${item.count !== 1 ? 's' : ''}</small>
                    </div>
                </div>
                <i class="fas fa-chevron-right text-muted"></i>
            </div>
        `).join('');
    } catch (error) {
        console.error('❌ Error al cargar alertas más comunes:', error);
        const container = document.getElementById('mostCommonAlertsList');
        if (container) {
            container.innerHTML = '<p class="text-danger text-center">Error al cargar datos</p>';
        }
    }
}

/**
 * Carga análisis de patrones climáticos
 */
async function loadPatternAnalysis() {
    try {
        const container = document.getElementById('patternAnalysis');
        if (!container) return;

        // Obtener estadísticas generales
        const generalStats = await statisticsController.getGeneralStatistics();
        const alertsByType = await statisticsController.getAlertsByType();
        const alertsBySeverity = await statisticsController.getAlertsBySeverity();
        const mostAffectedZones = await statisticsController.getMostAffectedZones(5);

        if (!generalStats.success || !alertsByType.success) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3 opacity-50"></i>
                    <p class="mb-0">No se pudieron obtener datos para el análisis</p>
                </div>
            `;
            return;
        }

        const stats = generalStats.statistics;
        const totalAlerts = stats.totalAlerts || 0;
        const activeAlerts = stats.activeAlerts || 0;
        const inactiveAlerts = totalAlerts - activeAlerts;

        // Calcular porcentajes
        const activePercentage = totalAlerts > 0 ? ((activeAlerts / totalAlerts) * 100).toFixed(1) : 0;
        
        // Determinar tipo más frecuente
        let mostFrequentType = 'N/A';
        let mostFrequentCount = 0;
        if (alertsByType.labels.length > 0) {
            const maxIndex = alertsByType.values.indexOf(Math.max(...alertsByType.values));
            if (maxIndex >= 0 && alertsByType.values[maxIndex] > 0) {
                mostFrequentType = alertsByType.labels[maxIndex];
                mostFrequentCount = alertsByType.values[maxIndex];
            }
        }

        // Determinar severidad más común
        let mostCommonSeverity = 'N/A';
        if (alertsBySeverity.success && alertsBySeverity.labels.length > 0) {
            const maxIndex = alertsBySeverity.values.indexOf(Math.max(...alertsBySeverity.values));
            if (maxIndex >= 0 && alertsBySeverity.values[maxIndex] > 0) {
                mostCommonSeverity = alertsBySeverity.labels[maxIndex];
            }
        }

        // Zona más afectada
        const topZone = mostAffectedZones.success && mostAffectedZones.zones.length > 0 
            ? mostAffectedZones.zones[0] 
            : null;

        // Generar insights
        const insights = [];

        if (totalAlerts === 0) {
            insights.push({
                icon: 'fa-info-circle',
                color: 'info',
                title: 'Sistema Nuevo',
                description: 'Aún no se han registrado alertas en el sistema.'
            });
        } else {
            if (activePercentage > 70) {
                insights.push({
                    icon: 'fa-exclamation-triangle',
                    color: 'warning',
                    title: 'Alto Número de Alertas Activas',
                    description: `El ${activePercentage}% de las alertas están activas. Considera revisar y actualizar el estado de las alertas.`
                });
            }

            if (mostFrequentType !== 'N/A') {
                insights.push({
                    icon: 'fa-chart-bar',
                    color: 'primary',
                    title: 'Tipo de Alerta Predominante',
                    description: `El tipo "${mostFrequentType.replace('_', ' ')}" es el más común con ${mostFrequentCount} alerta${mostFrequentCount !== 1 ? 's' : ''}.`
                });
            }

            if (mostCommonSeverity === 'critica' || mostCommonSeverity === 'grave') {
                insights.push({
                    icon: 'fa-shield-alt',
                    color: 'danger',
                    title: 'Atención: Alertas de Alta Severidad',
                    description: `Se detectaron alertas de severidad ${mostCommonSeverity}. Requieren atención inmediata.`
                });
            }

            if (topZone) {
                insights.push({
                    icon: 'fa-map-marker-alt',
                    color: 'danger',
                    title: 'Zona de Mayor Riesgo',
                    description: `"${topZone.locationName}" tiene ${topZone.alertCount} alerta${topZone.alertCount !== 1 ? 's' : ''}, siendo la zona más afectada.`
                });
            }
        }

        // Mostrar análisis
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-chart-line fa-2x mb-3 opacity-50"></i>
                    <p class="mb-0">No hay suficientes datos para generar análisis de patrones</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-3">
                ${insights.map(insight => `
                    <div class="col-md-6">
                        <div class="alert alert-${insight.color} border-start border-4 border-${insight.color} d-flex align-items-start">
                            <i class="fas ${insight.icon} fa-2x me-3 mt-1"></i>
                            <div class="flex-grow-1">
                                <h6 class="alert-heading mb-2">${escapeHtml(insight.title)}</h6>
                                <p class="mb-0 small">${escapeHtml(insight.description)}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('❌ Error al cargar análisis de patrones:', error);
        const container = document.getElementById('patternAnalysis');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error al cargar el análisis de patrones. Por favor, intenta recargar la página.
                </div>
            `;
        }
    }
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Logout
    document.getElementById('navbarLogoutBtn')?.addEventListener('click', handleLogout);
    
    // Botones de período para tendencias
    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const period = e.target.getAttribute('data-period');
            document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            await loadAlertsTrendsChart(period);
        });
    });

    // Botón exportar reporte
    document.getElementById('exportReportBtn')?.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('exportReportModal'));
        // Establecer fechas por defecto (último mes)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = endDate.toISOString().split('T')[0];
        
        modal.show();
    });

    // Confirmar exportación
    document.getElementById('confirmExportBtn')?.addEventListener('click', handleExportReport);
}

/**
 * Maneja la exportación de reportes
 */
async function handleExportReport() {
    try {
        const startDate = new Date(document.getElementById('reportStartDate').value);
        const endDate = new Date(document.getElementById('reportEndDate').value);
        const format = document.querySelector('input[name="exportFormat"]:checked').value;

        if (startDate > endDate) {
            showError('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }

        showLoading(true);

        const result = await statisticsController.getReportData(startDate, endDate);
        
        if (!result.success) {
            showError(result.message || 'Error al generar el reporte');
            hideLoading();
            return;
        }

        // Exportar según el formato seleccionado
        switch (format) {
            case 'pdf':
                await exportToPDF(result.report, result.rawData, startDate, endDate);
                break;
            case 'csv':
                exportToCSV(result.rawData);
                break;
            case 'excel':
                exportToExcel(result.rawData);
                break;
        }

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportReportModal'));
        modal.hide();

        hideLoading();

    } catch (error) {
        console.error('❌ Error al exportar reporte:', error);
        showError('Error al exportar el reporte');
        hideLoading();
    }
}

/**
 * Exporta reporte a PDF (usando window.print como alternativa simple)
 */
async function exportToPDF(report, rawData, startDate, endDate) {
    // Obtener información del usuario actual
    const userName = currentUser ? (currentUser.displayName || currentUser.email) : 'Administrador';
    const reportDate = new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Procesar estadísticas adicionales
    const alertsByType = {};
    const alertsBySeverity = {};
    const usersByRole = {};

    rawData.alerts.forEach(alert => {
        const type = alert.tipo || 'Sin tipo';
        alertsByType[type] = (alertsByType[type] || 0) + 1;
        
        const severity = alert.severidad || 'Sin clasificar';
        alertsBySeverity[severity] = (alertsBySeverity[severity] || 0) + 1;
    });

    rawData.users.forEach(user => {
        const role = user.role || 'user';
        usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    // Crear contenido HTML para imprimir
    const printContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte AlertaClimática</title>
            <style>
                @media print {
                    @page { margin: 1.5cm; }
                    body { margin: 0; }
                }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    padding: 30px; 
                    color: #333;
                    background: white;
                }
                .header {
                    border-bottom: 3px solid #0d6efd;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }
                .header h1 { 
                    color: #0d6efd; 
                    margin: 0;
                    font-size: 28px;
                }
                .header-info {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                    font-size: 12px;
                    color: #666;
                }
                .section {
                    margin: 25px 0;
                    page-break-inside: avoid;
                }
                .section h2 { 
                    color: #0d6efd; 
                    border-bottom: 2px solid #e0e0e0;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                    font-size: 20px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin: 20px 0;
                }
                .summary-card {
                    background: #f8f9fa;
                    border-left: 4px solid #0d6efd;
                    padding: 15px;
                    border-radius: 4px;
                }
                .summary-card h3 {
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #666;
                    text-transform: uppercase;
                }
                .summary-card .value {
                    font-size: 24px;
                    font-weight: bold;
                    color: #0d6efd;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 15px;
                    font-size: 12px;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 10px; 
                    text-align: left; 
                }
                th { 
                    background-color: #0d6efd; 
                    color: white;
                    font-weight: bold;
                }
                tr:nth-child(even) {
                    background-color: #f8f9fa;
                }
                .stats-table {
                    width: 50%;
                    margin: 15px 0;
                }
                .stats-table th {
                    background-color: #28a745;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e0e0e0;
                    font-size: 11px;
                    color: #666;
                    text-align: center;
                }
                .no-data {
                    text-align: center;
                    padding: 30px;
                    color: #999;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🌦️ Reporte AlertaClimática</h1>
                <div class="header-info">
                    <div>
                        <strong>Período:</strong> ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}
                    </div>
                    <div>
                        <strong>Generado:</strong> ${reportDate}<br>
                        <strong>Por:</strong> ${escapeHtml(userName)}
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📊 Resumen Ejecutivo</h2>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Total de Alertas</h3>
                        <div class="value">${report.alerts.total}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Alertas Activas</h3>
                        <div class="value">${report.alerts.active}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Total de Usuarios</h3>
                        <div class="value">${report.users.total}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Usuarios Activos</h3>
                        <div class="value">${report.users.active}</div>
                    </div>
                </div>
            </div>

            ${Object.keys(alertsByType).length > 0 ? `
            <div class="section">
                <h2>📈 Alertas por Tipo</h2>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Tipo de Alerta</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(alertsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => `
                            <tr>
                                <td>${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '))}</td>
                                <td><strong>${count}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${Object.keys(alertsBySeverity).length > 0 ? `
            <div class="section">
                <h2>⚠️ Alertas por Severidad</h2>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Severidad</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(alertsBySeverity).map(([severity, count]) => `
                            <tr>
                                <td>${escapeHtml(severity.charAt(0).toUpperCase() + severity.slice(1))}</td>
                                <td><strong>${count}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${Object.keys(usersByRole).length > 0 ? `
            <div class="section">
                <h2>👥 Usuarios por Rol</h2>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Rol</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(usersByRole).map(([role, count]) => `
                            <tr>
                                <td>${escapeHtml(role === 'admin' ? 'Administrador' : 'Usuario')}</td>
                                <td><strong>${count}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div class="section">
                <h2>📋 Detalle de Alertas</h2>
                ${rawData.alerts.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Tipo</th>
                            <th>Severidad</th>
                            <th>Estado</th>
                            <th>Fecha de Creación</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rawData.alerts.map(alert => {
                            const fecha = alert.fechaCreacion ? 
                                (alert.fechaCreacion.toDate ? 
                                    alert.fechaCreacion.toDate().toLocaleDateString('es-ES', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : 
                                    new Date(alert.fechaCreacion).toLocaleDateString('es-ES')
                                ) : 'N/A';
                            
                            return `
                                <tr>
                                    <td>${escapeHtml(alert.titulo || 'Sin título')}</td>
                                    <td>${escapeHtml((alert.tipo || 'N/A').charAt(0).toUpperCase() + (alert.tipo || 'N/A').slice(1).replace('_', ' '))}</td>
                                    <td>${escapeHtml((alert.severidad || 'N/A').charAt(0).toUpperCase() + (alert.severidad || 'N/A').slice(1))}</td>
                                    <td>${escapeHtml((alert.status || 'N/A').charAt(0).toUpperCase() + (alert.status || 'N/A').slice(1))}</td>
                                    <td>${fecha}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ` : `
                <div class="no-data">
                    <p>No hay alertas registradas en el período seleccionado.</p>
                </div>
                `}
            </div>

            <div class="footer">
                <p><strong>AlertaClimática</strong> - Sistema de Gestión de Alertas Climáticas</p>
                <p>Reporte generado automáticamente el ${reportDate}</p>
                <p>Este documento contiene información confidencial y está destinado únicamente para uso interno.</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Esperar un momento para que se cargue el contenido antes de imprimir
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

/**
 * Exporta reporte a CSV
 */
function exportToCSV(rawData) {
    // Encabezados CSV
    let csv = 'Tipo,Título,Severidad,Estado,Fecha Creación\n';
    
    rawData.alerts.forEach(alert => {
        const fecha = alert.fechaCreacion ? new Date(alert.fechaCreacion).toLocaleDateString('es-ES') : '';
        csv += `"${alert.tipo || ''}","${alert.titulo || ''}","${alert.severidad || ''}","${alert.status || ''}","${fecha}"\n`;
    });

    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_alertas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Exporta reporte a Excel (CSV con extensión .xlsx, compatible con Excel)
 */
function exportToExcel(rawData) {
    // Usar CSV como Excel (los navegadores no pueden generar XLSX nativamente sin librerías)
    exportToCSV(rawData);
}

/**
 * Carga datos del usuario en el navbar
 */
function loadUserDataInNavbar() {
    try {
        if (!currentUser) return;
        
        const userNameElement = document.getElementById('navbarUserName');
        const userEmailElement = document.getElementById('navbarUserEmail');
        
        if (userNameElement) userNameElement.textContent = currentUser.displayName || 'Usuario';
        if (userEmailElement) userEmailElement.textContent = currentUser.email || '';
    } catch (error) {
        console.error('❌ Error al cargar datos en navbar:', error);
    }
}

async function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        await authController.logout();
        window.location.href = '../../index.html';
    }
}

/**
 * Utilidades
 */
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.remove('d-none');
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('d-none');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('d-none');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('→ DOM cargado, iniciando aplicación de estadísticas...');
    initializeApp().catch(error => {
        console.error('❌ Error fatal al inicializar:', error);
        console.error('Stack trace:', error.stack);
        showError('Error fatal al cargar la página. Por favor, recarga.');
        hideLoading();
        // NO redirigir aquí - permitir que el usuario vea el error
    });
});

