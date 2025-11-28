/**
 * ========================================
 * AuthRepository - Capa de Acceso a Datos
 * ========================================
 * 
 * Repositorio que gestiona todas las operaciones de autenticación
 * con Firebase, proporcionando una capa de abstracción limpia.
 * 
 * Patrón Repository:
 * - Separa la lógica de acceso a datos
 * - Proporciona métodos limpios y reutilizables
 * - Usa el FirebaseService (Singleton)
 * - Manejo robusto de errores
 * 
 * Principios de Codificación Segura:
 * - Try-catch en todas las operaciones
 * - Mensajes de error claros y seguros
 * - No expone información sensible
 * - Validación de respuestas
 * 
 * @class AuthRepository
 * @pattern Repository
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class AuthRepository {
    /**
     * Instancia del FirebaseService (Singleton)
     * @private
     */
    #firebaseService;

    /**
     * Constructor
     * @param {FirebaseService} firebaseService - Instancia del servicio Firebase
     */
    constructor(firebaseService) {
        if (!firebaseService) {
            throw new Error('AuthRepository requiere una instancia de FirebaseService');
        }
        this.#firebaseService = firebaseService;
        console.log('✓ AuthRepository: Instancia creada');
    }

    /**
     * Registra un nuevo usuario con email y contraseña
     * @async
     * @param {string} email - Correo electrónico del usuario
     * @param {string} password - Contraseña del usuario
     * @param {string} displayName - Nombre completo del usuario (opcional)
     * @returns {Promise<Object>} { success: boolean, user: Object, message: string }
     */
    async register(email, password, displayName = null) {
        try {
            console.log('→ AuthRepository: Intentando registrar usuario...');

            // Obtener instancia de Auth
            const auth = this.#firebaseService.getAuth();

            // Crear usuario con email y contraseña
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('✓ Usuario registrado:', user.uid);

            // Actualizar perfil con el nombre (si se proporcionó)
            if (displayName) {
                await user.updateProfile({
                    displayName: displayName
                });
                console.log('✓ Perfil actualizado con nombre:', displayName);
            }

            // Enviar email de verificación (opcional)
            try {
                await user.sendEmailVerification();
                console.log('✓ Email de verificación enviado');
            } catch (emailError) {
                console.warn('⚠️ No se pudo enviar email de verificación:', emailError.message);
            }

            // Guardar usuario en Firestore si está disponible
            try {
                const firestore = this.#firebaseService.getFirestore();
                if (firestore) {
                    const userData = {
                        email: user.email,
                        displayName: displayName || '',
                        emailVerified: user.emailVerified,
                        role: 'user', // Por defecto todos son usuarios
                        activo: true,
                        regionesInteres: [],
                        preferenciasNotificaciones: {
                            activas: true,
                            email: true,
                            push: false,
                            tiposAlertas: [],
                            severidadMinima: 'leve'
                        },
                        contadorAlertas: 0,
                        fechaCreacion: new Date(),
                        fechaActualizacion: new Date()
                    };
                    await firestore.collection('users').doc(user.uid).set(userData);
                    console.log('✓ Usuario guardado en Firestore');
                }
            } catch (firestoreError) {
                console.warn('⚠️ No se pudo guardar usuario en Firestore:', firestoreError.message);
                // No fallar el registro si Firestore falla
            }

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    emailVerified: user.emailVerified,
                    createdAt: user.metadata.creationTime
                },
                message: 'Usuario registrado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error en registro:', error);
            return {
                success: false,
                user: null,
                message: this.#parseAuthError(error)
            };
        }
    }

    /**
     * Inicia sesión con email y contraseña
     * @async
     * @param {string} email - Correo electrónico del usuario
     * @param {string} password - Contraseña del usuario
     * @returns {Promise<Object>} { success: boolean, user: Object, token: string, message: string }
     */
    async login(email, password) {
        try {
            console.log('→ AuthRepository: Intentando iniciar sesión...');

            // Obtener instancia de Auth
            const auth = this.#firebaseService.getAuth();

            // Iniciar sesión
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('✓ Sesión iniciada:', user.uid);

            // Obtener token JWT
            const token = await user.getIdToken();

            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    emailVerified: user.emailVerified,
                    lastSignIn: user.metadata.lastSignInTime
                },
                token: token,
                message: 'Sesión iniciada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error en login:', error);
            return {
                success: false,
                user: null,
                token: null,
                message: this.#parseAuthError(error)
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
            console.log('→ AuthRepository: Cerrando sesión...');

            const auth = this.#firebaseService.getAuth();
            await auth.signOut();

            console.log('✓ Sesión cerrada');

            return {
                success: true,
                message: 'Sesión cerrada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            return {
                success: false,
                message: 'Error al cerrar sesión: ' + error.message
            };
        }
    }

    /**
     * Obtiene el usuario actualmente autenticado
     * @returns {Object|null} Usuario actual o null
     */
    getCurrentUser() {
        const user = this.#firebaseService.getCurrentUser();
        
        if (!user) {
            return null;
        }

        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
            photoURL: user.photoURL
        };
    }

    /**
     * Verifica si hay un usuario autenticado
     * @returns {boolean} True si hay usuario autenticado
     */
    isAuthenticated() {
        return this.#firebaseService.getCurrentUser() !== null;
    }

    /**
     * Envía un email para restablecer la contraseña
     * @async
     * @param {string} email - Correo electrónico del usuario
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async resetPassword(email) {
        try {
            console.log('→ AuthRepository: Enviando email de recuperación...');

            const auth = this.#firebaseService.getAuth();
            await auth.sendPasswordResetEmail(email);

            console.log('✓ Email de recuperación enviado');

            return {
                success: true,
                message: 'Email de recuperación enviado. Revisa tu bandeja de entrada.'
            };

        } catch (error) {
            console.error('❌ Error al enviar email de recuperación:', error);
            return {
                success: false,
                message: this.#parseAuthError(error)
            };
        }
    }

    /**
     * Parsea los errores de Firebase Auth a mensajes amigables en español
     * @private
     * @param {Error} error - Error de Firebase
     * @returns {string} Mensaje de error en español
     */
    #parseAuthError(error) {
        const errorCode = error.code;

        const errorMessages = {
            // Errores de registro
            'auth/email-already-in-use': 'Este correo electrónico ya está registrado',
            'auth/invalid-email': 'El correo electrónico no es válido',
            'auth/weak-password': 'La contraseña es demasiado débil. Usa al menos 6 caracteres',
            
            // Errores de login
            'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
            'auth/wrong-password': 'La contraseña es incorrecta',
            'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
            
            // Errores generales
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
            'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
            'auth/operation-not-allowed': 'Esta operación no está permitida',
            
            // Errores de token
            'auth/invalid-api-key': 'Clave de API inválida. Verifica la configuración',
            'auth/app-deleted': 'La aplicación de Firebase fue eliminada',
            
            // Otros
            'auth/requires-recent-login': 'Esta operación requiere que inicies sesión nuevamente'
        };

        return errorMessages[errorCode] || `Error de autenticación: ${error.message}`;
    }

    /**
     * Observa cambios en el estado de autenticación
     * @param {Function} callback - Función a ejecutar cuando cambie el estado
     * @returns {Function} Función para cancelar la observación
     */
    onAuthStateChanged(callback) {
        return this.#firebaseService.onAuthStateChanged((user) => {
            if (user) {
                callback({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    emailVerified: user.emailVerified
                });
            } else {
                callback(null);
            }
        });
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthRepository;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.AuthRepository = AuthRepository;
}

