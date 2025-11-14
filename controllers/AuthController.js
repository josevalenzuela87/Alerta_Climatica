/**
 * ========================================
 * AuthController - Controlador de Autenticación
 * ========================================
 * 
 * Controlador que gestiona la lógica de negocio de autenticación.
 * Coordina entre la Vista (UI) y el Repositorio (Datos).
 * 
 * Patrón MVC - Controlador:
 * - Recibe eventos de la interfaz de usuario
 * - Valida las entradas del usuario
 * - Llama al Repository para operaciones de datos
 * - Maneja respuestas y errores
 * - Actualiza la interfaz
 * 
 * Principios de Codificación Segura:
 * - Validación estricta de todas las entradas
 * - Try-catch en todas las operaciones asíncronas
 * - No expone información sensible al usuario
 * - Sanitización de datos
 * 
 * @class AuthController
 * @pattern MVC - Controller
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class AuthController {
    /**
     * Repositorio de autenticación
     * @private
     */
    #authRepository;

    /**
     * Constructor
     * @param {AuthRepository} authRepository - Instancia del repositorio
     */
    constructor(authRepository) {
        if (!authRepository) {
            throw new Error('AuthController requiere una instancia de AuthRepository');
        }
        this.#authRepository = authRepository;
        console.log('✓ AuthController: Instancia creada');
    }

    /**
     * Registra un nuevo usuario
     * @async
     * @param {Object} formData - Datos del formulario de registro
     * @returns {Promise<Object>} { success: boolean, message: string, data: Object }
     */
    async register(formData) {
        try {
            console.log('→ AuthController: Procesando registro...');

            // 1. VALIDACIÓN DE ENTRADAS (Principio de Codificación Segura)
            const validation = Validator.validateRegistrationForm(formData);
            
            if (!validation.valid) {
                console.warn('⚠️ Validación fallida:', validation.errors);
                return {
                    success: false,
                    message: 'Por favor, corrige los errores en el formulario',
                    errors: validation.errors
                };
            }

            // 2. SANITIZACIÓN DE DATOS (Prevención XSS)
            const sanitizedData = {
                fullName: Validator.sanitize(formData.fullName.trim()),
                email: formData.email.trim().toLowerCase(),
                password: formData.password
            };

            // 3. LLAMAR AL REPOSITORY
            const result = await this.#authRepository.register(
                sanitizedData.email,
                sanitizedData.password,
                sanitizedData.fullName
            );

            // 4. MANEJO DE RESPUESTA
            if (result.success) {
                console.log('✓ Registro exitoso');
                
                // Guardar información básica en localStorage (opcional)
                this.#saveUserSession(result.user);
                
                return {
                    success: true,
                    message: result.message,
                    data: {
                        user: result.user,
                        redirectTo: 'dashboard.html'
                    }
                };
            } else {
                console.error('❌ Registro fallido:', result.message);
                return {
                    success: false,
                    message: result.message,
                    errors: { general: result.message }
                };
            }

        } catch (error) {
            console.error('❌ Error crítico en registro:', error);
            return {
                success: false,
                message: 'Error inesperado al registrar. Por favor, intenta nuevamente.',
                errors: { general: 'Error del sistema' }
            };
        }
    }

    /**
     * Inicia sesión de un usuario
     * @async
     * @param {Object} formData - Datos del formulario de login
     * @returns {Promise<Object>} { success: boolean, message: string, data: Object }
     */
    async login(formData) {
        try {
            console.log('→ AuthController: Procesando login...');

            // 1. VALIDACIÓN DE ENTRADAS (Principio de Codificación Segura)
            const validation = Validator.validateLoginForm(formData);
            
            if (!validation.valid) {
                console.warn('⚠️ Validación fallida:', validation.errors);
                return {
                    success: false,
                    message: 'Por favor, corrige los errores en el formulario',
                    errors: validation.errors
                };
            }

            // 2. SANITIZACIÓN DE DATOS
            const sanitizedData = {
                email: formData.email.trim().toLowerCase(),
                password: formData.password
            };

            // 3. LLAMAR AL REPOSITORY
            const result = await this.#authRepository.login(
                sanitizedData.email,
                sanitizedData.password
            );

            // 4. MANEJO DE RESPUESTA
            if (result.success) {
                console.log('✓ Login exitoso');
                
                // Guardar sesión
                this.#saveUserSession(result.user);
                
                // Guardar token JWT de forma segura
                if (result.token) {
                    this.#saveAuthToken(result.token);
                }
                
                // Opción de "Recordarme"
                if (formData.rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                }
                
                return {
                    success: true,
                    message: result.message,
                    data: {
                        user: result.user,
                        redirectTo: 'dashboard.html'
                    }
                };
            } else {
                console.error('❌ Login fallido:', result.message);
                return {
                    success: false,
                    message: result.message,
                    errors: { general: result.message }
                };
            }

        } catch (error) {
            console.error('❌ Error crítico en login:', error);
            return {
                success: false,
                message: 'Error inesperado al iniciar sesión. Por favor, intenta nuevamente.',
                errors: { general: 'Error del sistema' }
            };
        }
    }

    /**
     * Cierra la sesión del usuario actual
     * @async
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async logout() {
        try {
            console.log('→ AuthController: Cerrando sesión...');

            // Llamar al repository
            const result = await this.#authRepository.logout();

            if (result.success) {
                // Limpiar datos locales
                this.#clearUserSession();
                
                console.log('✓ Logout exitoso');
                
                return {
                    success: true,
                    message: result.message,
                    data: {
                        redirectTo: '../index.html'
                    }
                };
            } else {
                return {
                    success: false,
                    message: result.message
                };
            }

        } catch (error) {
            console.error('❌ Error en logout:', error);
            return {
                success: false,
                message: 'Error al cerrar sesión'
            };
        }
    }

    /**
     * Obtiene el usuario actualmente autenticado
     * @returns {Object|null} Usuario actual o null
     */
    getCurrentUser() {
        return this.#authRepository.getCurrentUser();
    }

    /**
     * Verifica si hay un usuario autenticado
     * @returns {boolean} True si hay usuario autenticado
     */
    isAuthenticated() {
        return this.#authRepository.isAuthenticated();
    }

    /**
     * Solicita restablecimiento de contraseña
     * @async
     * @param {string} email - Correo electrónico
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async resetPassword(email) {
        try {
            // Validar email
            const validation = Validator.validateEmail(email);
            
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.message
                };
            }

            // Llamar al repository
            const result = await this.#authRepository.resetPassword(email.trim().toLowerCase());
            
            return result;

        } catch (error) {
            console.error('❌ Error en reset password:', error);
            return {
                success: false,
                message: 'Error al enviar email de recuperación'
            };
        }
    }

    /**
     * Guarda la sesión del usuario en localStorage
     * @private
     * @param {Object} user - Datos del usuario
     */
    #saveUserSession(user) {
        try {
            const userSession = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                lastLogin: new Date().toISOString()
            };
            
            localStorage.setItem('userSession', JSON.stringify(userSession));
            console.log('✓ Sesión guardada en localStorage');
        } catch (error) {
            console.warn('⚠️ No se pudo guardar sesión en localStorage:', error);
        }
    }

    /**
     * Guarda el token de autenticación
     * @private
     * @param {string} token - Token JWT
     */
    #saveAuthToken(token) {
        try {
            // En una aplicación real, considera usar cookies httpOnly
            // o un sistema más seguro para tokens
            sessionStorage.setItem('authToken', token);
            console.log('✓ Token guardado');
        } catch (error) {
            console.warn('⚠️ No se pudo guardar token:', error);
        }
    }

    /**
     * Limpia la sesión del usuario
     * @private
     */
    #clearUserSession() {
        try {
            localStorage.removeItem('userSession');
            localStorage.removeItem('rememberMe');
            sessionStorage.removeItem('authToken');
            console.log('✓ Sesión limpiada');
        } catch (error) {
            console.warn('⚠️ Error al limpiar sesión:', error);
        }
    }

    /**
     * Obtiene la sesión guardada en localStorage
     * @returns {Object|null} Sesión del usuario o null
     */
    getSavedSession() {
        try {
            const session = localStorage.getItem('userSession');
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.warn('⚠️ Error al leer sesión guardada:', error);
            return null;
        }
    }

    /**
     * Observa cambios en el estado de autenticación
     * @param {Function} callback - Función a ejecutar cuando cambie el estado
     * @returns {Function} Función para cancelar la observación
     */
    onAuthStateChanged(callback) {
        return this.#authRepository.onAuthStateChanged(callback);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthController;
}

