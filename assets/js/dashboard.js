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
 * @version 1.0.0
 */

// Variables globales
let authController = null;

/**
 * Verifica que todas las dependencias estén cargadas
 */
function checkDependencies() {
    const required = {
        'EnvLoader': typeof EnvLoader !== 'undefined',
        'Validator': typeof Validator !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'AuthRepository': typeof AuthRepository !== 'undefined',
        'AuthController': typeof AuthController !== 'undefined'
    };

    const missing = Object.keys(required).filter(dep => !required[dep]);
    
    if (missing.length > 0) {
        console.error('❌ Dependencias faltantes:', missing);
        alert('Error: No se pudieron cargar todos los archivos necesarios.\n\nDependencias faltantes: ' + missing.join(', ') + '\n\nPor favor:\n1. Presiona Ctrl+Shift+R para recargar\n2. O limpia la caché del navegador');
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
        console.log('→ Inicializando dashboard...');

        // Verificar dependencias
        if (!checkDependencies()) {
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

        console.log('✓ Dashboard inicializado correctamente');

        // 6. Verificar autenticación
        if (!authController.isAuthenticated()) {
            console.warn('⚠️ Usuario no autenticado');
            redirectToLogin();
            return;
        }

        // 7. Cargar datos del usuario
        loadUserData();

        // 8. Configurar event listeners
        setupEventListeners();

        // 9. Observar cambios de autenticación
        authController.onAuthStateChanged((user) => {
            if (!user) {
                console.log('⚠️ Sesión cerrada');
                redirectToLogin();
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
        const user = authController.getCurrentUser();
        const savedSession = authController.getSavedSession();

        if (user) {
            // Actualizar nombre de usuario
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.displayName || 'Usuario';
            }

            // Actualizar email
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = user.email;
            }

            // Actualizar última conexión
            if (savedSession && savedSession.lastLogin) {
                const lastLoginElement = document.getElementById('lastLogin');
                if (lastLoginElement) {
                    const lastLogin = new Date(savedSession.lastLogin);
                    lastLoginElement.textContent = formatDate(lastLogin);
                }
            }

            console.log('✓ Datos de usuario cargados:', user.displayName);

            // Verificación de email
            if (!user.emailVerified) {
                showEmailVerificationBanner();
            }
        }
    } catch (error) {
        console.error('❌ Error al cargar datos del usuario:', error);
    }
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
 * Redirige a la página de login
 */
function redirectToLogin() {
    console.log('→ Redirigiendo a login...');
    window.location.href = 'login.html';
}

/**
 * Muestra banner de verificación de email
 */
function showEmailVerificationBanner() {
    const welcomeAlert = document.querySelector('.alert-success');
    if (welcomeAlert) {
        const banner = document.createElement('div');
        banner.className = 'alert alert-warning mb-4';
        banner.innerHTML = `
            <h4 class="alert-heading">
                <i class="fas fa-envelope me-2"></i>
                Verifica tu correo electrónico
            </h4>
            <p>Te hemos enviado un correo de verificación. Por favor, revisa tu bandeja de entrada.</p>
        `;
        welcomeAlert.parentNode.insertBefore(banner, welcomeAlert.nextSibling);
    }
}

/**
 * Formatea una fecha a texto legible
 */
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
        return 'Hace un momento';
    } else if (minutes < 60) {
        return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (hours < 24) {
        return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (days < 7) {
        return `Hace ${days} día${days > 1 ? 's' : ''}`;
    } else {
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

