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
    
    // Verificar dependencias opcionales de notificaciones (no bloquean la inicialización)
    const optionalDeps = {
        'Notification': typeof Notification !== 'undefined',
        'NotificationRepository': typeof NotificationRepository !== 'undefined',
        'NotificationController': typeof NotificationController !== 'undefined',
        'NotificationService': typeof NotificationService !== 'undefined'
    };
    
    const missingOptional = Object.keys(optionalDeps).filter(dep => !optionalDeps[dep]);
    if (missingOptional.length > 0) {
        console.warn('⚠️ Dependencias opcionales de notificaciones no disponibles:', missingOptional);
        console.warn('⚠️ Las notificaciones push no estarán disponibles');
    }
    
    console.log('✓ Todas las dependencias críticas cargadas correctamente');
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

        // 7.1. Inicializar notificaciones push si el usuario no es admin (opcional, no bloquea la app)
        if (currentUser && 
            typeof NotificationService !== 'undefined' && 
            typeof NotificationController !== 'undefined' && 
            typeof NotificationRepository !== 'undefined' &&
            typeof Notification !== 'undefined' &&
            typeof firebase !== 'undefined' &&
            firebase.messaging &&
            currentUser.role !== 'admin') {
            try {
                const notificationRepository = new NotificationRepository(firebaseService);
                const notificationController = new NotificationController(
                    notificationRepository, 
                    firebaseService
                );
                const notificationService = new NotificationService(
                    firebaseService, 
                    notificationController
                );
                
                // Inicializar de forma asíncrona sin bloquear
                notificationService.initialize(currentUser.uid).then(() => {
                    console.log('✓ Notificaciones push inicializadas');
                }).catch((notifError) => {
                    console.warn('⚠️ No se pudieron inicializar notificaciones:', notifError);
                });
            } catch (notifError) {
                console.warn('⚠️ Error al configurar notificaciones (no crítico):', notifError);
            }
        } else {
            console.log('ℹ️ Notificaciones push no disponibles (opcional)');
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
let allLocations = []; // Para mapeo de regiones

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
        // RECARGAR datos del usuario desde Firestore para asegurar que tenemos la información más actualizada
        console.log('🔄 Recargando datos del usuario desde Firestore...');
        const updatedUser = await userController.getCurrentUser();
        if (updatedUser) {
            currentUser = updatedUser;
            console.log('✓ Usuario actualizado desde Firestore');
        }
        
        // Verificar si tiene regiones seleccionadas
        const regionesInteres = currentUser.regionesInteres || [];
        
        console.log('🔍 Debug loadUserDashboard: regionesInteres del usuario:', regionesInteres);
        console.log('🔍 Debug loadUserDashboard: tipo de regionesInteres:', typeof regionesInteres, Array.isArray(regionesInteres));
        
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
        
        // Normalizar regionesInteres - asegurar que sea un array y convertir a strings
        const regionesInteresNormalizado = Array.isArray(regionesInteres) 
            ? regionesInteres.map(r => {
                // Si es un objeto, extraer el id; si es string, usarlo directamente
                return typeof r === 'object' && r !== null && r.id ? String(r.id) : String(r);
            }).filter(Boolean)
            : [];
        
        console.log('🔍 Debug: Regiones de interés del usuario (raw):', regionesInteres);
        console.log('🔍 Debug: Regiones de interés normalizadas:', regionesInteresNormalizado);
        console.log('🔍 Debug: Total de alertas recibidas:', result.alerts.length);
        console.log('🔍 Debug: Ejemplos de alertas:', result.alerts.slice(0, 3).map(a => ({
            titulo: a.titulo,
            ubicaciones: a.ubicaciones,
            status: a.status
        })));
        
        if (regionesInteresNormalizado.length === 0) {
            // Si no tiene regiones seleccionadas, no mostrar alertas
            console.log('⚠️ Usuario no tiene regiones de interés configuradas');
            userAlerts = [];
        } else {
            // Cargar ubicaciones para poder hacer el mapeo de region/ciudad a IDs (compatibilidad con alertas viejas)
            let locationsMap = {};
            try {
                if (!locationController) {
                    const firebaseService = FirebaseService.getInstance();
                    const locationRepository = new LocationRepository(firebaseService);
                    locationController = new LocationController(locationRepository);
                }
                const locationsResult = await locationController.getAllLocations();
                if (locationsResult.success && locationsResult.locations) {
                    // Crear un mapa de ubicaciones por nombre para búsqueda rápida
                    locationsResult.locations.forEach(loc => {
                        const key = `${loc.nombre}_${loc.ciudad || ''}_${loc.estado || ''}`.toLowerCase().trim();
                        if (key) locationsMap[key] = loc.id;
                        
                        // También mapear solo por nombre
                        if (loc.nombre) {
                            const nombreKey = loc.nombre.toLowerCase().trim();
                            if (nombreKey && !locationsMap[nombreKey]) {
                                locationsMap[nombreKey] = loc.id;
                            }
                        }
                        
                        // Mapear por ciudad si existe
                        if (loc.ciudad) {
                            const ciudadKey = loc.ciudad.toLowerCase().trim();
                            if (ciudadKey && !locationsMap[ciudadKey]) {
                                locationsMap[ciudadKey] = loc.id;
                            }
                        }
                        
                        // Mapear por estado si existe
                        if (loc.estado) {
                            const estadoKey = loc.estado.toLowerCase().trim();
                            if (estadoKey && !locationsMap[estadoKey]) {
                                locationsMap[estadoKey] = loc.id;
                            }
                        }
                    });
                    console.log('🗺️ Mapa de ubicaciones cargado:', Object.keys(locationsMap).length, 'entradas');
                }
            } catch (error) {
                console.warn('⚠️ No se pudieron cargar ubicaciones para mapeo:', error);
            }
            
            // Filtrar por regiones de interés - SOLO mostrar alertas que coincidan con las regiones del usuario
            userAlerts = result.alerts.filter(alert => {
                // Verificar que la alerta esté activa
                const isActive = alert.status === 'activa' || alert.activa === true;
                if (!isActive) {
                    return false;
                }
                
                // La alerta puede tener ubicaciones asignadas o usar region/ciudad (compatibilidad)
                let alertUbicacionesIds = [];
                
                if (alert.ubicaciones && Array.isArray(alert.ubicaciones) && alert.ubicaciones.length > 0) {
                    // Normalizar los IDs de ubicaciones de la alerta a strings
                    alertUbicacionesIds = alert.ubicaciones.map(u => {
                        // Si es un objeto, extraer el id; si es string, usarlo directamente
                        return typeof u === 'object' && u !== null && u.id ? String(u.id) : String(u);
                    }).filter(Boolean);
                } else if (alert.region || alert.ciudad) {
                    // Fallback: si la alerta no tiene ubicaciones pero tiene region/ciudad,
                    // buscar la ubicación correspondiente
                    const regionNombre = alert.region || alert.ciudad || '';
                    if (regionNombre) {
                        // Buscar ubicación por nombre
                        const locationId = locationsMap[regionNombre.toLowerCase()];
                        if (locationId) {
                            alertUbicacionesIds = [String(locationId)];
                            console.log(`🔄 Alerta "${alert.titulo}" usa fallback: región "${regionNombre}" → ubicación ID: ${locationId}`);
                        } else {
                            // Buscar por nombre completo
                            const fullKey = `${regionNombre}_${alert.ciudad || ''}_${alert.region || ''}`.toLowerCase();
                            const locationId2 = locationsMap[fullKey];
                            if (locationId2) {
                                alertUbicacionesIds = [String(locationId2)];
                                console.log(`🔄 Alerta "${alert.titulo}" usa fallback: "${fullKey}" → ubicación ID: ${locationId2}`);
                            }
                        }
                    }
                }
                
                if (alertUbicacionesIds.length === 0) {
                    console.log(`❌ Alerta "${alert.titulo}" NO tiene ubicaciones asignadas ni region/ciudad válida`);
                    return false;
                }
                
                console.log(`🔍 Debug: Alerta "${alert.titulo}" - ubicaciones IDs:`, alertUbicacionesIds);
                
                // Verificar si alguna de las ubicaciones de la alerta está en las regiones de interés del usuario
                const hasLocationMatch = alertUbicacionesIds.some(ubicacionId => 
                    regionesInteresNormalizado.includes(ubicacionId)
                );
                
                if (!hasLocationMatch) {
                    console.log(`❌ Alerta "${alert.titulo}" NO coincide en ubicaciones (ubicaciones: ${alertUbicacionesIds.join(', ')}, usuario tiene: ${regionesInteresNormalizado.join(', ')})`);
                    return false;
                }
                
                // Filtrar por severidad mínima configurada en preferencias del usuario
                const preferencias = currentUser.preferenciasNotificaciones || {};
                const severidadMinima = preferencias.severidadMinima || 'leve';
                
                // Definir orden de severidad (mayor índice = más severa)
                const severidadOrder = {
                    'leve': 1,
                    'moderada': 2,
                    'grave': 3,
                    'critica': 4
                };
                
                const alertSeveridad = alert.severidad || 'leve';
                const alertSeveridadOrder = severidadOrder[alertSeveridad] || 1;
                const minimaSeveridadOrder = severidadOrder[severidadMinima] || 1;
                
                // Solo incluir si la severidad de la alerta es igual o mayor a la mínima configurada
                const hasSeverityMatch = alertSeveridadOrder >= minimaSeveridadOrder;
                
                if (!hasSeverityMatch) {
                    console.log(`❌ Alerta "${alert.titulo}" NO cumple severidad mínima (severidad: ${alertSeveridad}, mínima requerida: ${severidadMinima})`);
                    return false;
                }
                
                console.log(`✅ Alerta "${alert.titulo}" incluida (ubicaciones: ${alertUbicacionesIds.join(', ')}, severidad: ${alertSeveridad})`);
                return true;
            });
        }
        
        console.log(`✅ Total de alertas filtradas para el usuario: ${userAlerts.length} de ${result.alerts.length}`);

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
