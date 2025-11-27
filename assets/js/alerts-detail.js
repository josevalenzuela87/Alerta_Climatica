/**
 * ========================================
 * Alerts Detail Page - Script de Detalle de Alerta
 * ========================================
 * 
 * Script que maneja la lógica de la vista de detalle de alerta.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let alertController = null;
let authController = null;
let currentAlert = null;
let alertId = null;

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando detalle de alerta...');

        // Verificar dependencias
        if (!checkDependencies()) {
            hideLoading();
            return;
        }

        showLoading();

        // 1. Obtener ID de alerta de la URL
        const urlParams = new URLSearchParams(window.location.search);
        alertId = urlParams.get('id');

        if (!alertId) {
            showError('No se especificó un ID de alerta');
            hideLoading();
            return;
        }

        // 2. Cargar variables de entorno
        const config = await EnvLoader.loadEnv();
        
        if (!EnvLoader.validateConfig(config)) {
            showError('Error de configuración. Por favor, configura tu archivo firebase-config.js correctamente.');
            hideLoading();
            return;
        }

        // 3. Inicializar servicios
        const firebaseService = FirebaseService.getInstance();
        await firebaseService.initialize(config);

        // 4. Verificar autenticación
        const authRepository = new AuthRepository(firebaseService);
        authController = new AuthController(authRepository);

        if (!authController.isAuthenticated()) {
            window.location.replace('../login.html');
            return;
        }

        // 5. Crear controlador de alertas
        const alertRepository = new AlertRepository(firebaseService);
        alertController = new AlertController(alertRepository);

        console.log('✓ Aplicación inicializada correctamente');

        // 6. Cargar alerta
        await loadAlert();

        // 7. Configurar event listeners
        setupEventListeners();

        hideLoading();

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showError('Error al inicializar la aplicación. Por favor, recarga la página.');
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
        console.error('💡 Solución: Presiona Ctrl+Shift+R para recargar o limpia la caché del navegador');
        return false;
    }
    
    console.log('✓ Todas las dependencias cargadas correctamente');
    return true;
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Logout (puede estar en navbar o en sidebar)
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('navbarLogoutBtn')?.addEventListener('click', handleLogout);
    
    // Cargar datos del usuario en navbar
    loadUserDataInNavbar();
    document.getElementById('editBtn')?.addEventListener('click', handleEdit);
    document.getElementById('deleteBtn')?.addEventListener('click', handleDelete);
}

/**
 * Carga la alerta desde Firestore
 */
async function loadAlert() {
    try {
        const result = await alertController.getAlertById(alertId);

        if (result.success && result.alert) {
            currentAlert = result.alert;
            renderAlertDetail();
        } else {
            showError('Alerta no encontrada');
            renderNotFound();
        }
    } catch (error) {
        console.error('❌ Error al cargar alerta:', error);
        showError('Error al cargar la alerta');
        renderNotFound();
    }
}

/**
 * Renderiza el detalle de la alerta
 */
function renderAlertDetail() {
    const container = document.getElementById('alertDetailContainer');
    
    if (!currentAlert) return;

    const isOwner = authController.getCurrentUser()?.uid === currentAlert.createdBy;
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    if (isOwner) {
        editBtn?.classList.remove('d-none');
        deleteBtn?.classList.remove('d-none');
    }

    container.innerHTML = `
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-${currentAlert.getSeverityColor()} text-white">
                <div class="d-flex align-items-center">
                    <i class="fas ${currentAlert.getTypeIcon()} fa-2x me-3"></i>
                    <div>
                        <h4 class="mb-0">${escapeHtml(currentAlert.titulo)}</h4>
                        <small>ID: ${currentAlert.id}</small>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <!-- Información Principal -->
                <div class="row mb-4">
                    <div class="col-md-6 mb-3">
                        <h6 class="text-muted mb-2">
                            <i class="fas fa-tag me-2"></i>Tipo
                        </h6>
                        <span class="badge bg-secondary fs-6">
                            <i class="fas ${currentAlert.getTypeIcon()} me-2"></i>
                            ${currentAlert.getTypeLabel()}
                        </span>
                    </div>
                    <div class="col-md-6 mb-3">
                        <h6 class="text-muted mb-2">
                            <i class="fas fa-exclamation-triangle me-2"></i>Severidad
                        </h6>
                        <span class="badge bg-${currentAlert.getSeverityColor()} fs-6">
                            ${currentAlert.getSeverityLabel()}
                        </span>
                    </div>
                    <div class="col-md-6 mb-3">
                        <h6 class="text-muted mb-2">
                            <i class="fas fa-info-circle me-2"></i>Estado
                        </h6>
                        <span class="badge bg-${currentAlert.isActive() ? 'success' : 'secondary'} fs-6">
                            ${currentAlert.status === 'activa' ? 'Activa' : currentAlert.status === 'cancelada' ? 'Cancelada' : 'Finalizada'}
                        </span>
                    </div>
                    <div class="col-md-6 mb-3">
                        <h6 class="text-muted mb-2">
                            <i class="fas fa-map-marker-alt me-2"></i>Ubicación
                        </h6>
                        <p class="mb-0">
                            <i class="fas fa-city me-2"></i>${escapeHtml(currentAlert.ciudad)}, ${escapeHtml(currentAlert.region)}
                        </p>
                    </div>
                </div>

                <!-- Descripción -->
                <div class="mb-4">
                    <h6 class="text-muted mb-3">
                        <i class="fas fa-align-left me-2"></i>Descripción
                    </h6>
                    <p class="lead">${escapeHtml(currentAlert.descripcion)}</p>
                </div>

                <!-- Fechas -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-2">
                            <i class="fas fa-calendar-alt me-2"></i>Fecha de Inicio
                        </h6>
                        <p class="mb-0">${Alert.formatDate(currentAlert.fechaInicio)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-2">
                            <i class="fas fa-calendar-times me-2"></i>Fecha de Fin
                        </h6>
                        <p class="mb-0">${currentAlert.fechaFin ? Alert.formatDate(currentAlert.fechaFin) : 'No especificada'}</p>
                    </div>
                </div>

                <!-- Recomendaciones -->
                ${currentAlert.recomendaciones && currentAlert.recomendaciones.length > 0 ? `
                <div class="mb-4">
                    <h6 class="text-muted mb-3">
                        <i class="fas fa-lightbulb me-2"></i>Recomendaciones
                    </h6>
                    <ul class="list-group">
                        ${currentAlert.recomendaciones.map(rec => `
                            <li class="list-group-item">
                                <i class="fas fa-check-circle text-success me-2"></i>
                                ${escapeHtml(rec)}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}

                <!-- Información Adicional -->
                <hr>
                <div class="row text-muted small">
                    <div class="col-md-6">
                        <p class="mb-1">
                            <i class="fas fa-clock me-2"></i>
                            Creada: ${Alert.formatDate(currentAlert.createdAt)}
                        </p>
                        <p class="mb-0">
                            <i class="fas fa-edit me-2"></i>
                            Actualizada: ${Alert.formatDate(currentAlert.updatedAt)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza mensaje de no encontrado
 */
function renderNotFound() {
    const container = document.getElementById('alertDetailContainer');
    container.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body text-center py-5">
                <i class="fas fa-exclamation-triangle fa-4x text-warning mb-3"></i>
                <h4>Alerta no encontrada</h4>
                <p class="text-muted">La alerta que buscas no existe o fue eliminada.</p>
                <a href="list.html" class="btn btn-primary">
                    <i class="fas fa-arrow-left me-2"></i>
                    Volver a Alertas
                </a>
            </div>
        </div>
    `;
}

/**
 * Maneja la edición de alerta
 */
function handleEdit() {
    if (!alertId) return;
    // Redirigir a la vista de edición
    window.location.href = `edit.html?id=${alertId}`;
}

/**
 * Maneja la eliminación de alerta
 */
async function handleDelete() {
    if (!confirm('¿Estás seguro de que deseas eliminar esta alerta? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        showLoading();
        const result = await alertController.deleteAlert(alertId);

        if (result.success) {
            showAlert('success', 'Alerta eliminada exitosamente. Redirigiendo...');
            setTimeout(() => {
                window.location.href = 'list.html';
            }, 1500);
        } else {
            showAlert('error', result.message);
            hideLoading();
        }
    } catch (error) {
        console.error('❌ Error al eliminar alerta:', error);
        showAlert('error', 'Error al eliminar la alerta');
        hideLoading();
    }
}

/**
 * Maneja el logout
 */
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

async function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        await authController.logout();
        window.location.href = '../../index.html';
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
}

function showError(message) {
    showAlert('error', message);
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

