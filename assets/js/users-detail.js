/**
 * ========================================
 * Users Detail Page - Script de Detalle de Usuario
 * ========================================
 * 
 * Script que maneja la lógica de la vista de detalle de usuario.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let userController = null;
let authController = null;
let currentUser = null;
let detailUser = null;
let userId = null;

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando detalle de usuario...');

        // Verificar dependencias
        if (!checkDependencies()) {
            hideLoading();
            return;
        }

        showLoading();

        // 1. Obtener ID de usuario de la URL
        const urlParams = new URLSearchParams(window.location.search);
        userId = urlParams.get('id');

        if (!userId) {
            showError('No se especificó un ID de usuario');
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

        // 5. Obtener usuario actual completo para verificar rol
        const userRepository = new UserRepository(firebaseService);
        userController = new UserController(userRepository, firebaseService);
        currentUser = await userController.getCurrentUser();

        if (!currentUser) {
            window.location.replace('../login.html');
            return;
        }

        // 6. Verificar que sea administrador
        if (!currentUser.isAdmin()) {
            showError('No tienes permiso para ver esta sección.');
            setTimeout(() => {
                window.location.replace('../dashboard.html');
            }, 2000);
            hideLoading();
            return;
        }

        // 7. Configurar navbar según rol
        if (typeof NavbarUtils !== 'undefined') {
            NavbarUtils.setupNavbarPermissions(currentUser);
        }

        // 8. Configurar botón "Volver" según rol
        setupBackButton();

        console.log('✓ Aplicación inicializada correctamente');

        // 9. Cargar usuario
        await loadUser();

        // 10. Configurar event listeners
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
        'User': typeof User !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'UserRepository': typeof UserRepository !== 'undefined',
        'UserController': typeof UserController !== 'undefined',
        'AuthRepository': typeof AuthRepository !== 'undefined',
        'AuthController': typeof AuthController !== 'undefined'
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
 * Configura el botón "Volver" según el rol del usuario
 */
function setupBackButton() {
    const backButton = document.getElementById('backButton');
    if (!backButton) return;

    backButton.href = 'list.html';
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Logout
    document.getElementById('navbarLogoutBtn')?.addEventListener('click', handleLogout);
    
    // Cargar datos del usuario en navbar
    loadUserDataInNavbar();
    
    // Botón editar
    document.getElementById('editBtn')?.addEventListener('click', handleEdit);
}

/**
 * Carga el usuario desde Firestore
 */
async function loadUser() {
    try {
        const result = await userController.getUserById(userId);

        if (result.success && result.user) {
            detailUser = result.user;
            renderUserDetail();
        } else {
            showError('Usuario no encontrado');
            renderNotFound();
        }
    } catch (error) {
        console.error('❌ Error al cargar usuario:', error);
        showError('Error al cargar el usuario');
        renderNotFound();
    }
}

/**
 * Renderiza el detalle del usuario
 */
function renderUserDetail() {
    const container = document.getElementById('userDetailContainer');
    
    if (!detailUser) return;

    const editBtn = document.getElementById('editBtn');

    // Mostrar botón editar solo para administradores
    if (currentUser.isAdmin()) {
        editBtn?.classList.remove('d-none');
    }

    // Formatear fechas
    const fechaRegistro = detailUser.createdAt 
        ? new Date(detailUser.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'No disponible';

    const ultimoAcceso = detailUser.lastAccess 
        ? new Date(detailUser.lastAccess).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'No disponible';

    // Badges de estado y rol
    const roleBadge = detailUser.role === 'admin' 
        ? '<span class="badge bg-danger">Administrador</span>'
        : '<span class="badge bg-primary">Usuario</span>';

    const statusBadge = detailUser.active 
        ? '<span class="badge bg-success">Activo</span>'
        : '<span class="badge bg-secondary">Inactivo</span>';

    const emailVerifiedBadge = detailUser.emailVerified 
        ? '<span class="badge bg-info">Email Verificado</span>'
        : '<span class="badge bg-warning">Email No Verificado</span>';

    // Foto de perfil o placeholder
    const profilePhoto = detailUser.photoURL || 'https://via.placeholder.com/150?text=' + encodeURIComponent(detailUser.displayName || 'U');

    container.innerHTML = `
        <div class="row">
            <!-- Información Principal -->
            <div class="col-md-4 mb-4">
                <div class="card shadow-sm border-0">
                    <div class="card-body text-center">
                        <img src="${profilePhoto}" 
                             alt="${escapeHtml(detailUser.displayName || 'Usuario')}" 
                             class="rounded-circle mb-3" 
                             style="width: 150px; height: 150px; object-fit: cover; border: 3px solid var(--primary-color);"
                             onerror="this.src='https://via.placeholder.com/150?text=${encodeURIComponent(detailUser.displayName || 'U')}'">
                        <h4 class="card-title mb-2">${escapeHtml(detailUser.displayName || 'Sin nombre')}</h4>
                        <p class="text-muted mb-3">${escapeHtml(detailUser.email || '')}</p>
                        <div class="d-flex justify-content-center gap-2 mb-3">
                            ${roleBadge}
                            ${statusBadge}
                            ${emailVerifiedBadge}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Información Detallada -->
            <div class="col-md-8">
                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-header bg-white border-0">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-info-circle me-2 text-primary"></i>
                            Información Personal
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-user me-2"></i>Nombre Completo
                                </label>
                                <p class="form-control-plaintext">${escapeHtml(detailUser.displayName || 'No especificado')}</p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-envelope me-2"></i>Email
                                </label>
                                <p class="form-control-plaintext">${escapeHtml(detailUser.email || 'No especificado')}</p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-user-tag me-2"></i>Rol
                                </label>
                                <p class="form-control-plaintext">${roleBadge}</p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-toggle-on me-2"></i>Estado
                                </label>
                                <p class="form-control-plaintext">${statusBadge}</p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-calendar-plus me-2"></i>Fecha de Registro
                                </label>
                                <p class="form-control-plaintext">${fechaRegistro}</p>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-clock me-2"></i>Último Acceso
                                </label>
                                <p class="form-control-plaintext">${ultimoAcceso}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Preferencias -->
                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-header bg-white border-0">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-cog me-2 text-primary"></i>
                            Preferencias
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-bell me-2"></i>Preferencias de Notificaciones
                                </label>
                                <div class="mt-2">
                                    ${detailUser.preferenciasNotificaciones && detailUser.preferenciasNotificaciones.length > 0
                                        ? detailUser.preferenciasNotificaciones.map(pref => 
                                            `<span class="badge bg-info me-2 mb-2">${escapeHtml(pref)}</span>`
                                        ).join('')
                                        : '<p class="text-muted mb-0">No se han configurado preferencias</p>'}
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="form-label fw-semibold text-muted">
                                    <i class="fas fa-map-marker-alt me-2"></i>Regiones de Interés
                                </label>
                                <div class="mt-2">
                                    ${detailUser.regionesInteres && detailUser.regionesInteres.length > 0
                                        ? '<p class="text-muted mb-2">El usuario tiene ' + detailUser.regionesInteres.length + ' región(es) de interés configurada(s)</p>'
                                        : '<p class="text-muted mb-0">No se han configurado regiones de interés</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza vista de usuario no encontrado
 */
function renderNotFound() {
    const container = document.getElementById('userDetailContainer');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-warning text-center" role="alert">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <h4>Usuario no encontrado</h4>
                <p>El usuario que buscas no existe o no tienes permiso para verlo.</p>
                <a href="list.html" class="btn btn-primary mt-3">
                    <i class="fas fa-arrow-left me-2"></i>Volver a la lista
                </a>
            </div>
        `;
    }
}

/**
 * Maneja el click en editar
 */
function handleEdit() {
    if (!detailUser) return;
    window.location.href = `profile.html?id=${detailUser.uid}`;
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
document.addEventListener('DOMContentLoaded', initializeApp);

