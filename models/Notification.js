/**
 * ========================================
 * Notification - Modelo de Notificación
 * ========================================
 * 
 * Modelo que representa una notificación en el sistema.
 * 
 * @class Notification
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class Notification {
    /**
     * Tipos de notificación
     * @static
     */
    static TYPES = {
        ALERTA_NUEVA: 'alerta_nueva',
        ALERTA_ACTUALIZADA: 'alerta_actualizada',
        ALERTA_CANCELADA: 'alerta_cancelada',
        SISTEMA: 'sistema',
        OTRO: 'otro'
    };

    /**
     * Estados de la notificación
     * @static
     */
    static STATUS = {
        NO_LEIDA: 'no_leida',
        LEIDA: 'leida',
        ARCHIVADA: 'archivada'
    };

    /**
     * Constructor
     * @param {Object} data - Datos de la notificación
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.userId = data.userId || null; // ID del usuario destinatario
        this.alertId = data.alertId || null; // ID de la alerta relacionada (opcional)
        this.tipo = data.tipo || Notification.TYPES.OTRO;
        this.titulo = data.titulo || '';
        this.mensaje = data.mensaje || '';
        this.status = data.status || Notification.STATUS.NO_LEIDA;
        this.data = data.data || {}; // Datos adicionales
        this.createdAt = data.createdAt || new Date().toISOString();
        this.readAt = data.readAt || null;
    }

    /**
     * Valida los datos de la notificación
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validate() {
        const errors = [];

        if (!this.userId) {
            errors.push('El userId es requerido');
        }

        if (!this.titulo || this.titulo.trim().length < 1) {
            errors.push('El título es requerido');
        }

        if (!this.mensaje || this.mensaje.trim().length < 1) {
            errors.push('El mensaje es requerido');
        }

        if (!Object.values(Notification.TYPES).includes(this.tipo)) {
            errors.push('Tipo de notificación inválido');
        }

        if (!Object.values(Notification.STATUS).includes(this.status)) {
            errors.push('Estado de notificación inválido');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Convierte el modelo a un objeto plano para Firestore
     * @returns {Object}
     */
    toFirestore() {
        return {
            userId: this.userId,
            alertId: this.alertId || null,
            tipo: this.tipo,
            titulo: this.titulo,
            mensaje: this.mensaje,
            status: this.status,
            data: this.data,
            createdAt: this.createdAt,
            readAt: this.readAt || null
        };
    }

    /**
     * Crea una instancia de Notification desde datos de Firestore
     * @static
     * @param {string} id - ID del documento
     * @param {Object} data - Datos del documento
     * @returns {Notification}
     */
    static fromFirestore(id, data) {
        return new Notification({
            id: id,
            userId: data.userId,
            alertId: data.alertId || null,
            tipo: data.tipo,
            titulo: data.titulo,
            mensaje: data.mensaje,
            status: data.status || Notification.STATUS.NO_LEIDA,
            data: data.data || {},
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
            readAt: data.readAt ? (data.readAt.toDate ? data.readAt.toDate().toISOString() : data.readAt) : null
        });
    }

    /**
     * Marca la notificación como leída
     */
    markAsRead() {
        this.status = Notification.STATUS.LEIDA;
        this.readAt = new Date().toISOString();
    }

    /**
     * Marca la notificación como archivada
     */
    archive() {
        this.status = Notification.STATUS.ARCHIVADA;
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Notification;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.Notification = Notification;
}

