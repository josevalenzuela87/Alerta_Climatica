/**
 * ========================================
 * Alerts List Page - Script de Lista de Alertas
 * ========================================
 * 
 * Script que maneja la lógica de la lista de alertas
 * con visualizaciones interactivas y filtros en tiempo real.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let alertController = null;
let authController = null;
let allAlerts = [];
let filteredAlerts = [];
let typeChart = null;
let severityChart = null;

/**
 * Carga datos del usuario en el navbar
 */
function loadUserDataInNavbar() {
    try {
        if (!authController) return;
        
        const user = authController.getCurrentUser();
        if (user) {
            const userNameElement = document.getElementById('navbarUserName');
            const userEmailElement = document.getElementById('navbarUserEmail');
            
            if (userNameElement) userNameElement.textContent = user.displayName || 'Usuario';
            if (userEmailElement) userEmailElement.textContent = user.email;
        }
    } catch (error) {
        console.error('❌ Error al cargar datos en navbar:', error);
    }
}

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando lista de alertas...');

        // Verificar dependencias
        if (!checkDependencies()) {
            hideLoading();
            return;
        }

        showLoading();

        // 1. Cargar variables de entorno
        const config = await EnvLoader.loadEnv();
        
        if (!EnvLoader.validateConfig(config)) {
            showAlert('error', 'Error de configuración. Por favor, configura tu archivo .env correctamente.');
            hideLoading();
            return;
        }

        // 2. Inicializar servicios
        const firebaseService = FirebaseService.getInstance();
        await firebaseService.initialize(config);

        // 3. Verificar autenticación
        const authRepository = new AuthRepository(firebaseService);
        authController = new AuthController(authRepository);

        if (!authController.isAuthenticated()) {
            window.location.href = '../login.html';
            return;
        }

        // 4. Crear controlador de alertas
        const alertRepository = new AlertRepository(firebaseService);
        alertController = new AlertController(alertRepository);

        console.log('✓ Aplicación inicializada correctamente');

        // 5. Configurar event listeners
        setupEventListeners();

        // 6. Cargar datos del usuario en navbar
        loadUserDataInNavbar();

        // 7. Cargar alertas
        await loadAlerts();

        // 8. Configurar actualización en tiempo real
        setupRealtimeUpdates();

        hideLoading();

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showAlert('error', 'Error al inicializar la aplicación. Por favor, recarga la página.');
        hideLoading();
    }
}

/**
 * Verifica dependencias
 */
function checkDependencies() {
    const required = {
        'EnvLoader': typeof EnvLoader !== 'undefined',
        'Alert': typeof Alert !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'AlertRepository': typeof AlertRepository !== 'undefined',
        'AlertController': typeof AlertController !== 'undefined'
    };

    const missing = Object.keys(required).filter(dep => !required[dep]);
    
    if (missing.length > 0) {
        console.error('❌ Dependencias faltantes:', missing);
        alert('Error: No se pudieron cargar todos los archivos necesarios.\n\nDependencias faltantes: ' + missing.join(', '));
        return false;
    }
    
    console.log('✓ Todas las dependencias cargadas correctamente');
    return true;
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Filtros
    document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
    document.getElementById('filterType')?.addEventListener('change', applyFilters);
    document.getElementById('filterSeverity')?.addEventListener('change', applyFilters);
    document.getElementById('filterRegion')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);

    // Búsqueda
    document.getElementById('searchInput')?.addEventListener('input', debounce(handleSearch, 300));

    // Logout (puede estar en navbar o en sidebar)
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('navbarLogoutBtn')?.addEventListener('click', handleLogout);
}

/**
 * Carga las alertas desde Firestore
 */
async function loadAlerts() {
    try {
        showLoading();
        
        const result = await alertController.getAllAlerts();

        if (result.success) {
            allAlerts = result.alerts;
            filteredAlerts = [...allAlerts];
            
            updateStats();
            renderAlerts();
            updateCharts();
            
            console.log(`✓ ${allAlerts.length} alertas cargadas`);
        } else {
            showAlert('error', result.message);
            renderEmptyState();
        }

        hideLoading();
    } catch (error) {
        console.error('❌ Error al cargar alertas:', error);
        showAlert('error', 'Error al cargar las alertas');
        hideLoading();
    }
}

/**
 * Configura actualización en tiempo real
 */
function setupRealtimeUpdates() {
    alertController.onAlertsChanged((alerts) => {
        console.log('→ Actualización en tiempo real:', alerts.length, 'alertas');
        allAlerts = alerts;
        applyFilters(); // Reaplica filtros con nuevos datos
    });
}

/**
 * Aplica los filtros seleccionados
 */
function applyFilters() {
    const status = document.getElementById('filterStatus').value;
    const type = document.getElementById('filterType').value;
    const severity = document.getElementById('filterSeverity').value;
    const region = document.getElementById('filterRegion').value.toLowerCase();

    filteredAlerts = allAlerts.filter(alert => {
        if (status && alert.status !== status) return false;
        if (type && alert.tipo !== type) return false;
        if (severity && alert.severidad !== severity) return false;
        if (region && !alert.region.toLowerCase().includes(region)) return false;
        return true;
    });

    // Aplicar búsqueda si existe
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredAlerts = filteredAlerts.filter(alert => {
            return alert.titulo.toLowerCase().includes(searchTerm) ||
                   alert.descripcion.toLowerCase().includes(searchTerm) ||
                   alert.region.toLowerCase().includes(searchTerm) ||
                   alert.ciudad.toLowerCase().includes(searchTerm);
        });
    }

    updateStats();
    renderAlerts();
    updateCharts();
}

/**
 * Maneja la búsqueda de alertas
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (!searchTerm) {
        applyFilters();
        return;
    }

    filteredAlerts = allAlerts.filter(alert => {
        return alert.titulo.toLowerCase().includes(searchTerm) ||
               alert.descripcion.toLowerCase().includes(searchTerm) ||
               alert.region.toLowerCase().includes(searchTerm) ||
               alert.ciudad.toLowerCase().includes(searchTerm);
    });

    updateStats();
    renderAlerts();
}

/**
 * Limpia todos los filtros
 */
function clearFilters() {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterSeverity').value = '';
    document.getElementById('filterRegion').value = '';
    document.getElementById('searchInput').value = '';
    
    filteredAlerts = [...allAlerts];
    updateStats();
    renderAlerts();
    updateCharts();
}

/**
 * Actualiza las estadísticas en las tarjetas
 */
function updateStats() {
    const total = filteredAlerts.length;
    const active = filteredAlerts.filter(a => a.status === 'activa').length;
    const grave = filteredAlerts.filter(a => a.severidad === 'grave').length;
    const critical = filteredAlerts.filter(a => a.severidad === 'critica').length;

    document.getElementById('totalAlerts').textContent = total;
    document.getElementById('activeAlerts').textContent = active;
    document.getElementById('graveAlerts').textContent = grave;
    document.getElementById('criticalAlerts').textContent = critical;
}

/**
 * Renderiza las alertas en la lista
 */
function renderAlerts() {
    const container = document.getElementById('alertsContainer');

    if (filteredAlerts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-inbox fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">No se encontraron alertas</h5>
                <p class="text-muted">Intenta cambiar los filtros o crear una nueva alerta.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredAlerts.map(alert => `
        <div class="card mb-3 alert-card" data-alert-id="${alert.id}">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-start">
                            <div class="alert-icon me-3">
                                <i class="fas ${alert.getTypeIcon()} fa-2x text-${alert.getSeverityColor()}"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h5 class="card-title mb-1">
                                    <a href="detail.html?id=${alert.id}" class="text-decoration-none">
                                        ${escapeHtml(alert.titulo)}
                                    </a>
                                </h5>
                                <p class="card-text text-muted mb-2">
                                    <small>${escapeHtml(alert.descripcion.substring(0, 150))}${alert.descripcion.length > 150 ? '...' : ''}</small>
                                </p>
                                <div class="d-flex flex-wrap gap-2">
                                    <span class="badge bg-${alert.getSeverityColor()}">
                                        <i class="fas fa-exclamation-circle me-1"></i>
                                        ${alert.getSeverityLabel()}
                                    </span>
                                    <span class="badge bg-secondary">
                                        <i class="fas ${alert.getTypeIcon()} me-1"></i>
                                        ${alert.getTypeLabel()}
                                    </span>
                                    <span class="badge bg-info">
                                        <i class="fas fa-map-marker-alt me-1"></i>
                                        ${escapeHtml(alert.ciudad)}, ${escapeHtml(alert.region)}
                                    </span>
                                    <span class="badge bg-${alert.isActive() ? 'success' : 'secondary'}">
                                        ${alert.status === 'activa' ? 'Activa' : alert.status === 'cancelada' ? 'Cancelada' : 'Finalizada'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end mt-3 mt-md-0">
                        <div class="text-muted small mb-2">
                            <i class="fas fa-calendar me-1"></i>
                            ${Alert.formatDate(alert.fechaInicio)}
                        </div>
                        <a href="detail.html?id=${alert.id}" class="btn btn-sm btn-primary">
                            <i class="fas fa-eye me-1"></i>
                            Ver Detalle
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Renderiza estado vacío
 */
function renderEmptyState() {
    const container = document.getElementById('alertsContainer');
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-bell-slash fa-4x text-muted mb-3"></i>
            <h5 class="text-muted">No hay alertas disponibles</h5>
            <p class="text-muted">Crea tu primera alerta climática.</p>
            <a href="create.html" class="btn btn-primary">
                <i class="fas fa-plus me-2"></i>
                Crear Primera Alerta
            </a>
        </div>
    `;
}

/**
 * Actualiza los gráficos interactivos
 */
function updateCharts() {
    // Gráfico por Tipo
    const typeData = {};
    filteredAlerts.forEach(alert => {
        typeData[alert.tipo] = (typeData[alert.tipo] || 0) + 1;
    });

    const typeCtx = document.getElementById('typeChart');
    if (typeChart) {
        typeChart.destroy();
    }

    typeChart = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeData).map(key => {
                const alert = new Alert({ tipo: key });
                return alert.getTypeLabel();
            }),
            datasets: [{
                data: Object.values(typeData),
                backgroundColor: [
                    '#0d6efd', '#6610f2', '#6f42c1', '#d63384',
                    '#dc3545', '#fd7e14', '#ffc107', '#20c997',
                    '#0dcaf0', '#6c757d'
                ]
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

    // Gráfico por Severidad
    const severityData = {
        leve: 0,
        moderada: 0,
        grave: 0,
        critica: 0
    };

    filteredAlerts.forEach(alert => {
        severityData[alert.severidad] = (severityData[alert.severidad] || 0) + 1;
    });

    const severityCtx = document.getElementById('severityChart');
    if (severityChart) {
        severityChart.destroy();
    }

    severityChart = new Chart(severityCtx, {
        type: 'bar',
        data: {
            labels: ['Leve', 'Moderada', 'Grave', 'Crítica'],
            datasets: [{
                label: 'Cantidad de Alertas',
                data: [
                    severityData.leve || 0,
                    severityData.moderada || 0,
                    severityData.grave || 0,
                    severityData.critica || 0
                ],
                backgroundColor: [
                    '#198754', // success
                    '#ffc107', // warning
                    '#fd7e14', // danger (naranja)
                    '#dc3545'  // danger (rojo)
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
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
}

/**
 * Maneja el logout
 */
async function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        try {
            await authController.logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('❌ Error en logout:', error);
        }
    }
}

/**
 * Utilidades
 */
function showAlert(type, message) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
        ${message}
    `;
    alertDiv.classList.remove('d-none');
    
    setTimeout(() => {
        alertDiv.classList.add('d-none');
    }, 5000);
}

function showLoading() {
    document.getElementById('loadingSpinner')?.classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingSpinner')?.classList.add('d-none');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

