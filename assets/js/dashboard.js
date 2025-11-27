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

        console.log('✓ Dashboard inicializado correctamente');

        // 6. Verificar autenticación
        if (!authController.isAuthenticated()) {
            console.warn('⚠️ Usuario no autenticado, redirigiendo...');
            setTimeout(() => {
                redirectToLogin();
            }, 500);
            return;
        }

        // 7. Cargar datos del usuario
        loadUserData();

        // 8. Configurar event listeners
        setupEventListeners();

        // 9. Observar cambios de autenticación
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
        const user = authController.getCurrentUser();

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

            console.log('✓ Datos de usuario cargados:', user.displayName || user.email);

            // Verificación de email
            if (!user.emailVerified) {
                console.warn('⚠️ Email no verificado');
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
