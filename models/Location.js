/**
 * ========================================
 * Location - Modelo de Ubicación/Región
 * ========================================
 * 
 * Modelo que define la estructura y validación de una ubicación/región.
 * 
 * @class Location
 * @pattern Model
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class Location {
    /**
     * Constructor
     * @param {Object} data - Datos de la ubicación
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.nombre = data.nombre || '';
        this.tipo = data.tipo || ''; // 'pais', 'estado', 'ciudad', 'municipio'
        this.codigo = data.codigo || ''; // Código único (ej: 'SON', 'HER')
        this.pais = data.pais || 'México';
        this.estado = data.estado || '';
        this.ciudad = data.ciudad || '';
        this.municipio = data.municipio || '';
        this.coordenadas = data.coordenadas || {
            lat: null,
            lng: null
        };
        this.poblacion = data.poblacion || null;
        this.codigoPostal = data.codigoPostal || '';
        this.activa = data.activa !== undefined ? data.activa : true;
        this.descripcion = data.descripcion || '';
        this.fechaCreacion = data.fechaCreacion || null;
        this.fechaActualizacion = data.fechaActualizacion || null;
        this.creadorId = data.creadorId || null;
    }

    /**
     * Valida si el objeto Location es válido
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validate() {
        const errors = [];

        // Validar nombre
        if (!this.nombre || this.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }

        if (this.nombre && this.nombre.length > 100) {
            errors.push('El nombre no puede exceder 100 caracteres');
        }

        // Validar tipo
        const tiposValidos = ['pais', 'estado', 'ciudad', 'municipio'];
        if (!this.tipo || !tiposValidos.includes(this.tipo)) {
            errors.push('El tipo debe ser: pais, estado, ciudad o municipio');
        }

        // Validar coordenadas si están presentes
        if (this.coordenadas) {
            if (this.coordenadas.lat !== null && (this.coordenadas.lat < -90 || this.coordenadas.lat > 90)) {
                errors.push('La latitud debe estar entre -90 y 90');
            }
            if (this.coordenadas.lng !== null && (this.coordenadas.lng < -180 || this.coordenadas.lng > 180)) {
                errors.push('La longitud debe estar entre -180 y 180');
            }
        }

        // Validar población
        if (this.poblacion !== null && this.poblacion < 0) {
            errors.push('La población no puede ser negativa');
        }

        // Validar descripción
        if (this.descripcion && this.descripcion.length > 500) {
            errors.push('La descripción no puede exceder 500 caracteres');
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
            nombre: this.nombre.trim(),
            tipo: this.tipo,
            codigo: this.codigo.trim().toUpperCase(),
            pais: this.pais.trim(),
            estado: this.estado.trim(),
            ciudad: this.ciudad.trim(),
            municipio: this.municipio.trim(),
            coordenadas: this.coordenadas,
            poblacion: this.poblacion,
            codigoPostal: this.codigoPostal.trim(),
            activa: this.activa,
            descripcion: this.descripcion.trim(),
            fechaActualizacion: new Date()
        };

        // Solo agregar fechaCreacion si es nuevo
        if (!this.id) {
            data.fechaCreacion = new Date();
        }

        // Agregar creadorId si está disponible
        if (this.creadorId) {
            data.creadorId = this.creadorId;
        }

        // Eliminar campos vacíos
        Object.keys(data).forEach(key => {
            if (data[key] === '' || data[key] === null) {
                delete data[key];
            }
        });

        return data;
    }

    /**
     * Crea una instancia de Location desde datos de Firestore
     * @static
     * @param {string} id - ID del documento
     * @param {Object} data - Datos del documento
     * @returns {Location}
     */
    static fromFirestore(id, data) {
        const location = new Location({
            id: id,
            nombre: data.nombre || '',
            tipo: data.tipo || '',
            codigo: data.codigo || '',
            pais: data.pais || 'México',
            estado: data.estado || '',
            ciudad: data.ciudad || '',
            municipio: data.municipio || '',
            coordenadas: data.coordenadas || { lat: null, lng: null },
            poblacion: data.poblacion || null,
            codigoPostal: data.codigoPostal || '',
            activa: data.activa !== undefined ? data.activa : true,
            descripcion: data.descripcion || '',
            fechaCreacion: data.fechaCreacion ? data.fechaCreacion.toDate() : null,
            fechaActualizacion: data.fechaActualizacion ? data.fechaActualizacion.toDate() : null,
            creadorId: data.creadorId || null
        });

        return location;
    }

    /**
     * Obtiene el nombre completo de la ubicación
     * @returns {string}
     */
    getFullName() {
        const parts = [this.nombre];
        
        if (this.municipio && this.tipo !== 'municipio') {
            parts.push(this.municipio);
        }
        if (this.ciudad && this.tipo !== 'ciudad') {
            parts.push(this.ciudad);
        }
        if (this.estado && this.tipo !== 'estado') {
            parts.push(this.estado);
        }
        if (this.pais && this.tipo !== 'pais') {
            parts.push(this.pais);
        }

        return parts.join(', ');
    }

    /**
     * Obtiene la etiqueta del tipo
     * @returns {string}
     */
    getTypeLabel() {
        const labels = {
            'pais': 'País',
            'estado': 'Estado',
            'ciudad': 'Ciudad',
            'municipio': 'Municipio'
        };
        return labels[this.tipo] || this.tipo;
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Verifica si tiene coordenadas válidas
     * @returns {boolean}
     */
    hasCoordinates() {
        return this.coordenadas && 
               this.coordenadas.lat !== null && 
               this.coordenadas.lng !== null;
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Location;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.Location = Location;
}

