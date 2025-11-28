/**
 * ========================================
 * Alert - Modelo de Datos
 * ========================================
 * 
 * Modelo que representa una alerta climática en el sistema.
 * Define la estructura de datos y métodos de validación.
 * 
 * @class Alert
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class Alert {
    /**
     * Tipos de alerta disponibles
     * @static
     */
    static TYPES = {
        TORMENTA: 'tormenta',
        HURACAN: 'huracan',
        LLUVIA: 'lluvia',
        VIENTO: 'viento',
        SEQUIA: 'sequia',
        HELADA: 'helada',
        NIEVE: 'nieve',
        GRANIZO: 'granizo',
        CALOR_EXTREMO: 'calor_extremo',
        OTRO: 'otro'
    };

    /**
     * Niveles de severidad disponibles
     * @static
     */
    static SEVERITY = {
        LEVE: 'leve',
        MODERADA: 'moderada',
        GRAVE: 'grave',
        CRITICA: 'critica'
    };

    /**
     * Estados de la alerta
     * @static
     */
    static STATUS = {
        ACTIVA: 'activa',
        CANCELADA: 'cancelada',
        FINALIZADA: 'finalizada'
    };

    /**
     * Constructor del modelo Alert
     * @param {Object} data - Datos de la alerta
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.titulo = data.titulo || '';
        this.descripcion = data.descripcion || '';
        this.tipo = data.tipo || Alert.TYPES.OTRO;
        this.severidad = data.severidad || Alert.SEVERITY.LEVE;
        this.status = data.status || Alert.STATUS.ACTIVA;
        this.ubicaciones = data.ubicaciones || []; // Array de IDs de ubicaciones
        this.region = data.region || ''; // Mantener para compatibilidad
        this.ciudad = data.ciudad || ''; // Mantener para compatibilidad
        this.fechaInicio = data.fechaInicio || new Date().toISOString();
        this.fechaFin = data.fechaFin || null;
        this.recomendaciones = data.recomendaciones || [];
        this.createdBy = data.createdBy || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Valida los datos de la alerta
     * @returns {Object} { valid: boolean, errors: Object }
     */
    validate() {
        const errors = {};

        // Validar título
        if (!this.titulo || this.titulo.trim().length < 3) {
            errors.titulo = 'El título debe tener al menos 3 caracteres';
        }

        if (this.titulo && this.titulo.length > 100) {
            errors.titulo = 'El título no puede exceder 100 caracteres';
        }

        // Validar descripción
        if (!this.descripcion || this.descripcion.trim().length < 10) {
            errors.descripcion = 'La descripción debe tener al menos 10 caracteres';
        }

        // Validar tipo
        if (!Object.values(Alert.TYPES).includes(this.tipo)) {
            errors.tipo = 'Tipo de alerta inválido';
        }

        // Validar severidad
        if (!Object.values(Alert.SEVERITY).includes(this.severidad)) {
            errors.severidad = 'Nivel de severidad inválido';
        }

        // Validar ubicaciones (prioridad: usar ubicaciones si están disponibles)
        if (this.ubicaciones && Array.isArray(this.ubicaciones) && this.ubicaciones.length > 0) {
            // Validar que todos los IDs de ubicaciones sean strings válidos
            const invalidUbicaciones = this.ubicaciones.filter(id => !id || typeof id !== 'string');
            if (invalidUbicaciones.length > 0) {
                errors.ubicaciones = 'Las ubicaciones deben ser IDs válidos';
            }
        } else if (!this.region || this.region.trim().length < 2) {
            // Fallback: validar región/ciudad si no hay ubicaciones (compatibilidad)
            errors.region = 'Debe especificar al menos una ubicación o región';
        }

        // Validar fechas
        if (this.fechaFin && new Date(this.fechaFin) < new Date(this.fechaInicio)) {
            errors.fechaFin = 'La fecha de fin debe ser posterior a la fecha de inicio';
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    /**
     * Convierte el modelo a un objeto plano para Firestore
     * @returns {Object} Objeto compatible con Firestore
     */
    toFirestore() {
        return {
            titulo: this.titulo,
            descripcion: this.descripcion,
            tipo: this.tipo,
            severidad: this.severidad,
            status: this.status,
            ubicaciones: Array.isArray(this.ubicaciones) && this.ubicaciones.length > 0 
                ? this.ubicaciones 
                : [],
            region: this.region || '', // Mantener para compatibilidad
            ciudad: this.ciudad || '', // Mantener para compatibilidad
            fechaInicio: this.fechaInicio,
            fechaFin: this.fechaFin || null,
            recomendaciones: Array.isArray(this.recomendaciones) ? this.recomendaciones : [],
            createdBy: this.createdBy,
            createdAt: this.createdAt,
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Crea una instancia de Alert desde un documento de Firestore
     * @static
     * @param {string} id - ID del documento
     * @param {Object} data - Datos del documento
     * @returns {Alert} Instancia de Alert
     */
    static fromFirestore(id, data) {
        const alert = new Alert({
            id: id,
            ...data
        });
        return alert;
    }

    /**
     * Obtiene el color según la severidad
     * @returns {string} Clase CSS de Bootstrap para el color
     */
    getSeverityColor() {
        const colors = {
            [Alert.SEVERITY.LEVE]: 'success',
            [Alert.SEVERITY.MODERADA]: 'warning',
            [Alert.SEVERITY.GRAVE]: 'danger',
            [Alert.SEVERITY.CRITICA]: 'dark'
        };
        return colors[this.severidad] || 'secondary';
    }

    /**
     * Obtiene el ícono según el tipo
     * @returns {string} Clase Font Awesome del ícono
     */
    getTypeIcon() {
        const icons = {
            [Alert.TYPES.TORMENTA]: 'fa-bolt',
            [Alert.TYPES.HURACAN]: 'fa-hurricane',
            [Alert.TYPES.LLUVIA]: 'fa-cloud-rain',
            [Alert.TYPES.VIENTO]: 'fa-wind',
            [Alert.TYPES.SEQUIA]: 'fa-sun',
            [Alert.TYPES.HELADA]: 'fa-snowflake',
            [Alert.TYPES.NIEVE]: 'fa-snowman',
            [Alert.TYPES.GRANIZO]: 'fa-cloud-showers-heavy',
            [Alert.TYPES.CALOR_EXTREMO]: 'fa-temperature-high',
            [Alert.TYPES.OTRO]: 'fa-exclamation-triangle'
        };
        return icons[this.tipo] || 'fa-exclamation-circle';
    }

    /**
     * Obtiene el texto legible del tipo
     * @returns {string} Nombre del tipo formateado
     */
    getTypeLabel() {
        const labels = {
            [Alert.TYPES.TORMENTA]: 'Tormenta',
            [Alert.TYPES.HURACAN]: 'Huracán',
            [Alert.TYPES.LLUVIA]: 'Lluvia Intensa',
            [Alert.TYPES.VIENTO]: 'Vientos Fuertes',
            [Alert.TYPES.SEQUIA]: 'Sequía',
            [Alert.TYPES.HELADA]: 'Helada',
            [Alert.TYPES.NIEVE]: 'Nieve',
            [Alert.TYPES.GRANIZO]: 'Granizo',
            [Alert.TYPES.CALOR_EXTREMO]: 'Calor Extremo',
            [Alert.TYPES.OTRO]: 'Otro'
        };
        return labels[this.tipo] || 'Desconocido';
    }

    /**
     * Obtiene el texto legible de la severidad
     * @returns {string} Nombre de la severidad formateado
     */
    getSeverityLabel() {
        const labels = {
            [Alert.SEVERITY.LEVE]: 'Leve',
            [Alert.SEVERITY.MODERADA]: 'Moderada',
            [Alert.SEVERITY.GRAVE]: 'Grave',
            [Alert.SEVERITY.CRITICA]: 'Crítica'
        };
        return labels[this.severidad] || 'Desconocida';
    }

    /**
     * Verifica si la alerta está activa
     * @returns {boolean} True si está activa
     */
    isActive() {
        return this.status === Alert.STATUS.ACTIVA;
    }

    /**
     * Formatea la fecha para mostrar
     * @param {string} dateString - Fecha en formato ISO
     * @returns {string} Fecha formateada
     */
    static formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Alert;
}

