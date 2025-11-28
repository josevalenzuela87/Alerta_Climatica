/**
 * ========================================
 * User - Modelo de Usuario
 * ========================================
 * 
 * Modelo que define la estructura y validación de un usuario.
 * Extiende la información de Firebase Auth con datos adicionales.
 * 
 * @class User
 * @pattern Model
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class User {
    /**
     * Constructor
     * @param {Object} data - Datos del usuario
     */
    constructor(data = {}) {
        this.uid = data.uid || null;
        this.email = data.email || '';
        this.displayName = data.displayName || '';
        this.photoURL = data.photoURL || null;
        this.emailVerified = data.emailVerified || false;
        this.role = data.role || 'user'; // 'admin' o 'user'
        this.activo = data.activo !== undefined ? data.activo : true;
        this.regionesInteres = data.regionesInteres || []; // Array de locationIds
        this.preferenciasNotificaciones = data.preferenciasNotificaciones || {
            activas: true,
            email: true,
            push: false,
            tiposAlertas: [], // Tipos de alertas a recibir
            severidadMinima: 'leve' // 'leve', 'moderada', 'grave', 'critica'
        };
        this.fechaCreacion = data.fechaCreacion || null;
        this.fechaActualizacion = data.fechaActualizacion || null;
        this.ultimoAcceso = data.ultimoAcceso || null;
        this.contadorAlertas = data.contadorAlertas || 0; // Total de alertas recibidas
    }

    /**
     * Valida si el objeto User es válido
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validate() {
        const errors = [];

        // Validar email
        if (!this.email || !this.email.trim()) {
            errors.push('El email es requerido');
        } else if (!Validator.isValidEmail(this.email)) {
            errors.push('El email no es válido');
        }

        // Validar nombre
        if (this.displayName && this.displayName.length > 100) {
            errors.push('El nombre no puede exceder 100 caracteres');
        }

        // Validar rol
        const rolesValidos = ['admin', 'user'];
        if (this.role && !rolesValidos.includes(this.role)) {
            errors.push('El rol debe ser: admin o user');
        }

        // Validar regiones de interés
        if (this.regionesInteres && !Array.isArray(this.regionesInteres)) {
            errors.push('Las regiones de interés deben ser un array');
        }

        // Validar severidad mínima
        const severidadesValidas = ['leve', 'moderada', 'grave', 'critica'];
        if (this.preferenciasNotificaciones && 
            this.preferenciasNotificaciones.severidadMinima &&
            !severidadesValidas.includes(this.preferenciasNotificaciones.severidadMinima)) {
            errors.push('La severidad mínima no es válida');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Convierte el objeto a un formato para Firestore
     * @returns {Object}
     */
    toFirestore() {
        const data = {
            email: this.email.trim().toLowerCase(),
            displayName: this.displayName.trim(),
            photoURL: this.photoURL,
            emailVerified: this.emailVerified,
            role: this.role,
            activo: this.activo,
            regionesInteres: this.regionesInteres || [],
            preferenciasNotificaciones: this.preferenciasNotificaciones,
            contadorAlertas: this.contadorAlertas || 0,
            fechaActualizacion: new Date()
        };

        // Solo agregar fechaCreacion si es nuevo
        if (!this.uid || !this.fechaCreacion) {
            data.fechaCreacion = new Date();
        }

        // Agregar último acceso si está disponible
        if (this.ultimoAcceso) {
            data.ultimoAcceso = this.ultimoAcceso;
        }

        // Eliminar campos nulos o vacíos
        Object.keys(data).forEach(key => {
            if (data[key] === '' || data[key] === null) {
                delete data[key];
            }
        });

        return data;
    }

    /**
     * Crea una instancia de User desde datos de Firebase Auth y Firestore
     * @static
     * @param {Object} authUser - Usuario de Firebase Auth
     * @param {Object} firestoreData - Datos adicionales de Firestore (opcional)
     * @returns {User}
     */
    static fromFirebase(authUser, firestoreData = {}) {
        return new User({
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || '',
            photoURL: authUser.photoURL || null,
            emailVerified: authUser.emailVerified || false,
            role: firestoreData.role || 'user',
            activo: firestoreData.activo !== undefined ? firestoreData.activo : true,
            regionesInteres: firestoreData.regionesInteres || [],
            preferenciasNotificaciones: firestoreData.preferenciasNotificaciones || {
                activas: true,
                email: true,
                push: false,
                tiposAlertas: [],
                severidadMinima: 'leve'
            },
            fechaCreacion: firestoreData.fechaCreacion 
                ? (firestoreData.fechaCreacion.toDate ? firestoreData.fechaCreacion.toDate() : new Date(firestoreData.fechaCreacion))
                : (authUser.metadata?.creationTime ? new Date(authUser.metadata.creationTime) : null),
            fechaActualizacion: firestoreData.fechaActualizacion
                ? (firestoreData.fechaActualizacion.toDate ? firestoreData.fechaActualizacion.toDate() : new Date(firestoreData.fechaActualizacion))
                : null,
            ultimoAcceso: firestoreData.ultimoAcceso
                ? (firestoreData.ultimoAcceso.toDate ? firestoreData.ultimoAcceso.toDate() : new Date(firestoreData.ultimoAcceso))
                : null,
            contadorAlertas: firestoreData.contadorAlertas || 0
        });
    }

    /**
     * Crea una instancia de User desde datos de Firestore
     * @static
     * @param {string} uid - ID del usuario
     * @param {Object} firestoreData - Datos del documento
     * @returns {User}
     */
    static fromFirestore(uid, firestoreData) {
        return new User({
            uid: uid,
            email: firestoreData.email || '',
            displayName: firestoreData.displayName || '',
            photoURL: firestoreData.photoURL || null,
            emailVerified: firestoreData.emailVerified || false,
            role: firestoreData.role || 'user',
            activo: firestoreData.activo !== undefined ? firestoreData.activo : true,
            regionesInteres: firestoreData.regionesInteres || [],
            preferenciasNotificaciones: firestoreData.preferenciasNotificaciones || {
                activas: true,
                email: true,
                push: false,
                tiposAlertas: [],
                severidadMinima: 'leve'
            },
            fechaCreacion: firestoreData.fechaCreacion ? firestoreData.fechaCreacion.toDate() : null,
            fechaActualizacion: firestoreData.fechaActualizacion ? firestoreData.fechaActualizacion.toDate() : null,
            ultimoAcceso: firestoreData.ultimoAcceso ? firestoreData.ultimoAcceso.toDate() : null,
            contadorAlertas: firestoreData.contadorAlertas || 0
        });
    }

    /**
     * Verifica si el usuario es administrador
     * @returns {boolean}
     */
    isAdmin() {
        return this.role === 'admin';
    }

    /**
     * Verifica si el usuario está activo
     * @returns {boolean}
     */
    isActive() {
        return this.activo === true;
    }

    /**
     * Obtiene la etiqueta del rol
     * @returns {string}
     */
    getRoleLabel() {
        const labels = {
            'admin': 'Administrador',
            'user': 'Usuario'
        };
        return labels[this.role] || this.role;
    }

    /**
     * Formatea la fecha de creación
     * @returns {string}
     */
    getFormattedCreationDate() {
        if (!this.fechaCreacion) return '-';
        return this.fechaCreacion.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Formatea la fecha de último acceso
     * @returns {string}
     */
    getFormattedLastAccess() {
        if (!this.ultimoAcceso) return 'Nunca';
        return this.ultimoAcceso.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Agrega una región de interés
     * @param {string} locationId - ID de la ubicación
     */
    addRegionInteres(locationId) {
        if (!this.regionesInteres.includes(locationId)) {
            this.regionesInteres.push(locationId);
        }
    }

    /**
     * Elimina una región de interés
     * @param {string} locationId - ID de la ubicación
     */
    removeRegionInteres(locationId) {
        this.regionesInteres = this.regionesInteres.filter(id => id !== locationId);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = User;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.User = User;
}

