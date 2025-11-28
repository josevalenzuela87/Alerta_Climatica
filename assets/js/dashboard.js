/**
 * ========================================
 * Dashboard Page - Script del Panel Administrativo
 * ========================================
 * 
 * Script que maneja la lógica del panel administrativo.
 * Verifica autenticación, muestra información del usuario
 * y gestiona el cierre de sesión.
 * 
 * @author AlertaClimática Team
 * @version 1.4.0
 */

// Variables globales
let authController = null;
let userController = null;
let currentUser = null;

/**
 * Verifica que todas las dependencias estén cargadas
 */
function checkDependencies() {
    const required = {
        'EnvLoader': typeof EnvLoader !== 'undefined',
        'Validator': typeof Validator !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'AuthRepository': typeof AuthRepository !== 'undefined',
        'AuthController': typeof AuthController !== 'undefined',
        'UserRepository': typeof UserRepository !== 'undefined',
        'UserController': typeof UserController !== 'undefined',
        'RoleManager': typeof RoleManager !== 'undefined',
        'User': typeof User !== 'undefined',
        'Location': typeof Location !== 'undefined',
        'AlertRepository': typeof AlertRepository !== 'undefined',
        'AlertController': typeof AlertController !== 'undefined',
        'LocationRepository': typeof LocationRepository !== 'undefined',
        'LocationController': typeof LocationController !== 'undefined'
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

// Verificar dependencias adicionales para admin dashboard
function checkAdminDependencies() {
    return typeof AlertRepository !== 'undefined' && 
           typeof AlertController !== 'undefined' &&
           typeof LocationRepository !== 'undefined' &&
           typeof LocationController !== 'undefined';
}

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando dashboard...');

        // Verificar dependencias
        if (!checkDependencies()) {
            console.error('❌ No se pueden cargar dependencias. Revisa la consola.');
            redirectToLogin();
            return;
        }

        // 1. Cargar variables de entorno
        const config = await EnvLoader.loadEnv();
        
        // 2. Validar configuración
        if (!EnvLoader.validateConfig(config)) {
            console.error('❌ Configuración inválida');
            redirectToLogin();
            return;
        }

        // 3. Obtener instancia Singleton de FirebaseService
        const firebaseService = FirebaseService.getInstance();
        
        // 4. Inicializar Firebase
        await firebaseService.initialize(config);

        // 5. Crear instancias siguiendo la arquitectura
        const authRepository = new AuthRepository(firebaseService);
        authController = new AuthController(authRepository);

        // Crear UserController para obtener datos completos del usuario
        const userRepository = new UserRepository(firebaseService);
        userController = new UserController(userRepository, firebaseService);

        console.log('✓ Dashboard inicializado correctamente');

        // 6. Verificar autenticación
        if (!authController.isAuthenticated()) {
            console.warn('⚠️ Usuario no autenticado, redirigiendo...');
            setTimeout(() => {
                redirectToLogin();
            }, 500);
            return;
        }

        // 7. Obtener usuario completo con datos de Firestore
        currentUser = await userController.getCurrentUser();
        if (!currentUser) {
            console.warn('⚠️ No se pudo obtener datos del usuario, redirigiendo...');
            setTimeout(() => {
                redirectToLogin();
            }, 500);
            return;
        }

        // 8. Cargar datos del usuario en la UI
        loadUserData();

        // 9. Configurar permisos según rol y mostrar dashboard apropiado
        setupRoleBasedPermissions();
        
        // 9.1. Configurar navbar según rol
        if (typeof NavbarUtils !== 'undefined') {
            NavbarUtils.setupNavbarPermissions(currentUser);
        }
        
        await loadDashboardContent();

        // 10. Configurar event listeners
        setupEventListeners();

        // 11. Observar cambios de autenticación
        authController.onAuthStateChanged((user) => {
            if (!user) {
                console.log('⚠️ Sesión cerrada, redirigiendo...');
                setTimeout(() => {
                    redirectToLogin();
                }, 1000);
            }
        });

    } catch (error) {
        console.error('❌ Error al inicializar dashboard:', error);
        redirectToLogin();
    }
}

/**
 * Carga y muestra los datos del usuario
 */
function loadUserData() {
    try {
        if (!currentUser) return;

        // Actualizar nombre de usuario
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = currentUser.displayName || 'Usuario';
        }

        // Actualizar email
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email;
        }

        console.log('✓ Datos de usuario cargados:', currentUser.displayName || currentUser.email);

        // Verificación de email
        if (!currentUser.emailVerified) {
            console.warn('⚠️ Email no verificado');
        }
    } catch (error) {
        console.error('❌ Error al cargar datos del usuario:', error);
    }
}

// Variables adicionales para dashboard
let alertController = null;
let locationController = null;

/**
 * Configura los permisos basados en el rol del usuario
 */
function setupRoleBasedPermissions() {
    if (!currentUser || !RoleManager) {
        console.warn('⚠️ No se puede configurar permisos: usuario o RoleManager no disponible');
        return;
    }

    try {
        const isAdmin = RoleManager.isAdmin(currentUser);

        // Ocultar elementos del navbar que solo son para administradores
        const navItems = {
            alerts: document.querySelector('a[href="alerts/list.html"]')?.closest('li.nav-item'),
            locations: document.querySelector('a[href="locations/list.html"]')?.closest('li.nav-item'),
            users: document.querySelector('a[href="users/list.html"]')?.closest('li.nav-item'),
            stats: (() => {
                // Buscar por múltiples criterios: href, texto e icono
                const allNavLinks = Array.from(document.querySelectorAll('.nav-link'));
                for (const link of allNavLinks) {
                    const href = link.getAttribute('href') || '';
                    const text = link.textContent.trim().toLowerCase();
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : '';
                    
                    if (href.includes('statistics') || 
                        href.includes('estadisticas') ||
                        text.includes('estadísticas') ||
                        iconClass.includes('fa-chart-line')) {
                        return link.closest('li.nav-item');
                    }
                }
                return null;
            })(),
            config: Array.from(document.querySelectorAll('.nav-link')).find(item => 
                item.getAttribute('href') === '#' && item.textContent.includes('Configuración')
            )?.closest('li.nav-item')
        };

        // Para usuarios normales, ocultar elementos de administración
        if (!isAdmin) {
            // Ocultar gestión de alertas, ubicaciones, usuarios, estadísticas y configuración
            if (navItems.alerts) navItems.alerts.style.display = 'none';
            if (navItems.locations) navItems.locations.style.display = 'none';
            if (navItems.users) navItems.users.style.display = 'none';
            if (navItems.stats) {
                navItems.stats.style.display = 'none';
                console.log('✓ Estadísticas oculto para usuario normal');
            }
            if (navItems.config) navItems.config.style.display = 'none';
        } else {
            // Para administradores, mostrar todo
            if (navItems.alerts) navItems.alerts.style.display = '';
            if (navItems.locations) navItems.locations.style.display = '';
            if (navItems.users) navItems.users.style.display = '';
            if (navItems.stats) navItems.stats.style.display = '';
            if (navItems.config) navItems.config.style.display = '';
        }

        // Mostrar/ocultar dashboards según rol
        const adminDashboard = document.getElementById('adminDashboard');
        const userDashboard = document.getElementById('userDashboard');
        
        if (adminDashboard && userDashboard) {
            if (isAdmin) {
                adminDashboard.classList.remove('d-none');
                userDashboard.classList.add('d-none');
            } else {
                adminDashboard.classList.add('d-none');
                userDashboard.classList.remove('d-none');
            }
        }

        console.log('✓ Permisos configurados según rol:', currentUser.role);
    } catch (error) {
        console.error('❌ Error al configurar permisos:', error);
    }
}

/**
 * Carga el contenido del dashboard según el rol
 */
async function loadDashboardContent() {
    if (!currentUser) return;

    const isAdmin = RoleManager.isAdmin(currentUser);

    if (isAdmin) {
        await loadAdminDashboard();
    } else {
        await loadUserDashboard();
    }
}

/**
 * Carga el contenido del dashboard de administrador
 */
async function loadAdminDashboard() {
    try {
        // Verificar dependencias adicionales
        if (!checkAdminDependencies()) {
            console.warn('⚠️ Faltan dependencias para dashboard de admin');
            return;
        }

        // Crear controladores necesarios
        const firebaseService = FirebaseService.getInstance();
        
        if (!alertController) {
            const alertRepository = new AlertRepository(firebaseService);
            alertController = new AlertController(alertRepository);
        }

        if (!locationController) {
            const locationRepository = new LocationRepository(firebaseService);
            locationController = new LocationController(locationRepository);
        }

        // Cargar estadísticas
        await Promise.all([
            loadAdminStatistics(),
            loadRecentAlerts(),
            loadRecentUsers()
        ]);

    } catch (error) {
        console.error('❌ Error al cargar dashboard de admin:', error);
    }
}

/**
 * Carga estadísticas para el dashboard de admin
 */
async function loadAdminStatistics() {
    try {
        // Estadísticas de alertas
        const alertsResult = await alertController.getAllAlerts();
        if (alertsResult.success) {
            const totalAlerts = alertsResult.alerts.length;
            const activeAlerts = alertsResult.alerts.filter(a => a.activa).length;
            
            document.getElementById('adminStatAlerts').textContent = totalAlerts;
            document.getElementById('adminStatActiveAlerts').textContent = activeAlerts;
        }

        // Estadísticas de ubicaciones
        if (locationController) {
            const locationsResult = await locationController.getStatistics();
            if (locationsResult.success) {
                document.getElementById('adminStatLocations').textContent = locationsResult.stats.total || 0;
            }
        }

        // Estadísticas de usuarios
        const usersResult = await userController.getStatistics();
        if (usersResult.success) {
            document.getElementById('adminStatUsers').textContent = usersResult.stats.total || 0;
        }

    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
    }
}

/**
 * Carga alertas recientes para admin
 */
async function loadRecentAlerts() {
    try {
        const result = await alertController.getAllAlerts();
        
        const container = document.getElementById('adminRecentAlerts');
        if (!container) return;

        if (result.success && result.alerts.length > 0) {
            // Ordenar por fecha más reciente y tomar las primeras 5
            const recentAlerts = result.alerts
                .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
                .slice(0, 5);

            container.innerHTML = recentAlerts.map(alert => `
                <div class="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${escapeHtml(alert.titulo)}</h6>
                        <p class="text-muted mb-1 small">${escapeHtml(alert.descripcion || '').substring(0, 60)}...</p>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${new Date(alert.fechaCreacion).toLocaleDateString('es-ES')}
                        </small>
                    </div>
                    <a href="alerts/detail.html?id=${alert.id}" class="btn btn-sm btn-outline-primary">
                        Ver
                    </a>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted text-center mb-0">No hay alertas recientes</p>';
        }
    } catch (error) {
        console.error('❌ Error al cargar alertas recientes:', error);
    }
}

/**
 * Carga usuarios recientes para admin
 */
async function loadRecentUsers() {
    try {
        const result = await userController.getAllUsers();
        
        const container = document.getElementById('adminRecentUsers');
        if (!container) return;

        if (result.success && result.users.length > 0) {
            // Ordenar por fecha más reciente y tomar los primeros 5
            const recentUsers = result.users
                .filter(u => u.fechaCreacion)
                .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
                .slice(0, 5);

            if (recentUsers.length === 0) {
                container.innerHTML = '<p class="text-muted text-center mb-0">No hay usuarios recientes</p>';
                return;
            }

            container.innerHTML = recentUsers.map(user => `
                <div class="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${escapeHtml(user.displayName || 'Sin nombre')}</h6>
                        <p class="text-muted mb-1 small">${escapeHtml(user.email)}</p>
                        <small class="text-muted">
                            <span class="badge bg-${user.role === 'admin' ? 'danger' : 'secondary'}">
                                ${RoleManager.getRoleLabel(user.role)}
                            </span>
                        </small>
                    </div>
                    <a href="users/list.html" class="btn btn-sm btn-outline-primary">
                        Ver
                    </a>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted text-center mb-0">No hay usuarios recientes</p>';
        }
    } catch (error) {
        console.error('❌ Error al cargar usuarios recientes:', error);
    }
}

/**
 * Carga el contenido del dashboard de usuario normal
 */
async function loadUserDashboard() {
    try {
        // Verificar si tiene regiones seleccionadas
        const regionesInteres = currentUser.regionesInteres || [];
        
        const alertInfo = document.getElementById('userAlertInfo');
        if (regionesInteres.length === 0 && alertInfo) {
            alertInfo.classList.remove('d-none');
        } else if (alertInfo) {
            alertInfo.classList.add('d-none');
        }

        // Cargar alertas de las regiones de interés del usuario
        await loadUserAlerts(regionesInteres);

    } catch (error) {
        console.error('❌ Error al cargar dashboard de usuario:', error);
    }
}

/**
 * Carga las alertas del usuario filtradas por sus regiones de interés
 */
async function loadUserAlerts(regionesInteres) {
    try {
        // Verificar dependencias
        if (!checkAdminDependencies()) {
            console.warn('⚠️ Faltan dependencias para cargar alertas');
            return;
        }

        if (!alertController) {
            const firebaseService = FirebaseService.getInstance();
            const alertRepository = new AlertRepository(firebaseService);
            alertController = new AlertController(alertRepository);
        }

        // Obtener todas las alertas activas
        const result = await alertController.getAllAlerts();
        
        const container = document.getElementById('userAlertsList');
        const countElement = document.getElementById('userAlertsCount');
        
        if (!container) return;

        if (!result.success || !result.alerts || result.alerts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">No hay alertas disponibles</p>
                </div>
            `;
            if (countElement) countElement.textContent = '0 alertas';
            return;
        }

        // Filtrar alertas por regiones de interés del usuario
        let userAlerts = [];
        
        if (regionesInteres.length === 0) {
            // Si no tiene regiones seleccionadas, mostrar todas las alertas activas
            userAlerts = result.alerts.filter(a => a.status === 'activa' || a.activa);
        } else {
            // Filtrar por regiones de interés
            userAlerts = result.alerts.filter(alert => {
                // Verificar que la alerta esté activa (puede ser 'activa' o status === 'activa')
                const isActive = alert.status === 'activa' || alert.activa === true;
                if (!isActive) return false;
                
                // Si la alerta tiene ubicaciones asignadas
                if (alert.ubicaciones && Array.isArray(alert.ubicaciones) && alert.ubicaciones.length > 0) {
                    // Verificar si alguna de las ubicaciones de la alerta está en las regiones de interés del usuario
                    return alert.ubicaciones.some(ubicacionId => regionesInteres.includes(ubicacionId));
                }
                // Si no tiene ubicaciones específicas, incluirla (alertas generales)
                return true;
            });
        }

        // Ordenar por fecha más reciente
        userAlerts.sort((a, b) => {
            const dateA = new Date(a.fechaCreacion);
            const dateB = new Date(b.fechaCreacion);
            return dateB - dateA;
        });

        // Actualizar contador
        if (countElement) {
            countElement.textContent = `${userAlerts.length} alerta${userAlerts.length !== 1 ? 's' : ''}`;
        }

        // Renderizar alertas
        if (userAlerts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-2">No hay alertas para tus regiones de interés</p>
                    <p class="text-muted small">Ve a <a href="users/profile.html#preferences">tu perfil > Preferencias</a> para seleccionar regiones</p>
                </div>
            `;
        } else {
            container.innerHTML = userAlerts.map(alert => {
                const severityBadge = {
                    'leve': '<span class="badge bg-info">Leve</span>',
                    'moderada': '<span class="badge bg-warning">Moderada</span>',
                    'grave': '<span class="badge bg-danger">Grave</span>',
                    'critica': '<span class="badge bg-dark">Crítica</span>'
                }[alert.severidad] || '<span class="badge bg-secondary">Sin clasificar</span>';

                // Formatear fecha correctamente
                let fechaFormateada = 'Fecha no disponible';
                try {
                    const fecha = alert.fechaCreacion || alert.createdAt || alert.fechaInicio;
                    if (fecha) {
                        const fechaObj = new Date(fecha);
                        if (!isNaN(fechaObj.getTime())) {
                            fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Error al formatear fecha:', e);
                }

                return `
                    <div class="card mb-3 border-0 shadow-sm user-alert-card">
                        <div class="card-body p-3 p-md-4">
                            <div class="row g-3">
                                <div class="col-12 col-md-8">
                                    <div class="d-flex flex-column">
                                        <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
                                            <h5 class="card-title mb-0 fw-bold">${escapeHtml(alert.titulo)}</h5>
                                            ${severityBadge}
                                        </div>
                                        ${alert.descripcion ? `
                                            <p class="card-text text-muted mb-2 small">${escapeHtml(alert.descripcion).substring(0, 120)}${alert.descripcion.length > 120 ? '...' : ''}</p>
                                        ` : ''}
                                        <small class="text-muted d-flex align-items-center">
                                            <i class="fas fa-calendar-alt me-2"></i>
                                            ${fechaFormateada}
                                        </small>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4 d-flex align-items-start justify-content-md-end">
                                    <a href="alerts/detail.html?id=${alert.id}" class="btn btn-primary w-100 w-md-auto">
                                        <i class="fas fa-eye me-2 d-none d-sm-inline"></i>
                                        Ver Detalles
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

    } catch (error) {
        console.error('❌ Error al cargar alertas del usuario:', error);
        const container = document.getElementById('userAlertsList');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error al cargar las alertas. Por favor, intenta recargar la página.
                </div>
            `;
        }
    }
}

/**
 * Escapar HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Maneja el cierre de sesión
 */
async function handleLogout() {
    try {
        console.log('→ Cerrando sesión...');

        // Deshabilitar botón
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cerrando...';
        }

        // Llamar al controlador
        const result = await authController.logout();

        if (result.success) {
            console.log('✓ Sesión cerrada exitosamente');
            
            // Redirigir a página principal
            setTimeout(() => {
                window.location.href = result.data.redirectTo;
            }, 500);
        } else {
            console.error('❌ Error al cerrar sesión');
            alert('Error al cerrar sesión. Por favor, intenta nuevamente.');
            
            // Restaurar botón
            if (logoutBtn) {
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión';
            }
        }

    } catch (error) {
        console.error('❌ Error crítico en logout:', error);
        alert('Error inesperado al cerrar sesión.');
    }
}

/**
 * Redirige a la página de login (con protección contra bucles)
 */
let redirecting = false;
function redirectToLogin() {
    if (redirecting) {
        console.warn('⚠️ Ya se está redirigiendo, evitando bucle');
        return;
    }
    redirecting = true;
    console.log('→ Redirigiendo a login...');
    // Usar replace en lugar de href para evitar historial
    window.location.replace('login.html');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);
