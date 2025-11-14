/**
 * ========================================
 * FirebaseService - Patrón Singleton
 * ========================================
 * 
 * Servicio que gestiona la conexión con Firebase utilizando
 * el Patrón Singleton para garantizar una única instancia
 * en toda la aplicación.
 * 
 * Principios de Codificación Segura:
 * - Única instancia de Firebase (Singleton)
 * - Validación de configuración
 * - Manejo de errores robusto
 * - Encapsulación de la lógica de conexión
 * 
 * @class FirebaseService
 * @pattern Singleton
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class FirebaseService {
    /**
     * Instancia única del servicio (Singleton)
     * @private
     * @static
     */
    static #instance = null;

    /**
     * Instancia de Firebase App
     * @private
     */
    #firebaseApp = null;

    /**
     * Instancia de Firebase Auth
     * @private
     */
    #firebaseAuth = null;

    /**
     * Estado de inicialización
     * @private
     */
    #initialized = false;

    /**
     * Constructor privado (Patrón Singleton)
     * @private
     */
    constructor() {
        if (FirebaseService.#instance) {
            throw new Error('FirebaseService: No se puede crear múltiples instancias. Usa getInstance()');
        }
    }

    /**
     * Obtiene la instancia única de FirebaseService (Singleton)
     * @static
     * @returns {FirebaseService} Instancia única del servicio
     */
    static getInstance() {
        if (!FirebaseService.#instance) {
            FirebaseService.#instance = new FirebaseService();
            console.log('✓ Firebase Service: Instancia Singleton creada');
        }
        return FirebaseService.#instance;
    }

    /**
     * Inicializa Firebase con la configuración proporcionada
     * @async
     * @param {Object} config - Configuración de Firebase
     * @returns {Promise<boolean>} True si la inicialización fue exitosa
     * @throws {Error} Si la configuración es inválida o la inicialización falla
     */
    async initialize(config) {
        try {
            // Evitar múltiples inicializaciones
            if (this.#initialized) {
                console.warn('⚠️ Firebase ya está inicializado');
                return true;
            }

            // Validar configuración
            if (!this.#validateConfig(config)) {
                throw new Error('Configuración de Firebase inválida');
            }

            // Verificar que firebase esté disponible
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK no está cargado. Asegúrate de incluir los scripts de Firebase.');
            }

            // Configuración de Firebase
            const firebaseConfig = {
                apiKey: config.FIREBASE_API_KEY,
                authDomain: config.FIREBASE_AUTH_DOMAIN,
                projectId: config.FIREBASE_PROJECT_ID,
                storageBucket: config.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
                appId: config.FIREBASE_APP_ID,
                measurementId: config.FIREBASE_MEASUREMENT_ID
            };

            // Inicializar Firebase
            this.#firebaseApp = firebase.initializeApp(firebaseConfig);
            this.#firebaseAuth = firebase.auth();

            // Configurar persistencia de sesión
            await this.#firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

            this.#initialized = true;
            console.log('✓ Firebase inicializado correctamente');
            console.log('✓ Proyecto:', config.FIREBASE_PROJECT_ID);

            return true;

        } catch (error) {
            console.error('❌ Error al inicializar Firebase:', error);
            throw new Error(`No se pudo inicializar Firebase: ${error.message}`);
        }
    }

    /**
     * Valida que la configuración contenga todos los campos requeridos
     * @private
     * @param {Object} config - Configuración a validar
     * @returns {boolean} True si la configuración es válida
     */
    #validateConfig(config) {
        const requiredFields = [
            'FIREBASE_API_KEY',
            'FIREBASE_AUTH_DOMAIN',
            'FIREBASE_PROJECT_ID',
            'FIREBASE_STORAGE_BUCKET',
            'FIREBASE_MESSAGING_SENDER_ID',
            'FIREBASE_APP_ID'
        ];

        for (const field of requiredFields) {
            if (!config[field]) {
                console.error(`❌ Falta el campo requerido: ${field}`);
                return false;
            }

            // Verificar que no sean valores de ejemplo
            if (config[field].includes('tu_') || config[field].includes('ejemplo')) {
                console.error(`❌ Debes reemplazar los valores de ejemplo en .env: ${field}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Obtiene la instancia de Firebase Auth
     * @returns {firebase.auth.Auth} Instancia de Firebase Auth
     * @throws {Error} Si Firebase no está inicializado
     */
    getAuth() {
        if (!this.#initialized || !this.#firebaseAuth) {
            throw new Error('Firebase no está inicializado. Llama a initialize() primero.');
        }
        return this.#firebaseAuth;
    }

    /**
     * Obtiene la instancia de Firebase App
     * @returns {firebase.app.App} Instancia de Firebase App
     * @throws {Error} Si Firebase no está inicializado
     */
    getApp() {
        if (!this.#initialized || !this.#firebaseApp) {
            throw new Error('Firebase no está inicializado. Llama a initialize() primero.');
        }
        return this.#firebaseApp;
    }

    /**
     * Verifica si Firebase está inicializado
     * @returns {boolean} True si está inicializado
     */
    isInitialized() {
        return this.#initialized;
    }

    /**
     * Obtiene el usuario actualmente autenticado
     * @returns {firebase.User|null} Usuario actual o null
     */
    getCurrentUser() {
        if (!this.#initialized) {
            return null;
        }
        return this.#firebaseAuth.currentUser;
    }

    /**
     * Observa cambios en el estado de autenticación
     * @param {Function} callback - Función a ejecutar cuando cambie el estado
     * @returns {Function} Función para cancelar la observación
     */
    onAuthStateChanged(callback) {
        if (!this.#initialized) {
            console.error('❌ Firebase no está inicializado');
            return () => {};
        }
        return this.#firebaseAuth.onAuthStateChanged(callback);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseService;
}

