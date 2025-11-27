/**
 * ========================================
 * LocationController - Controlador de Ubicaciones
 * ========================================
 * 
 * Controlador que gestiona la lógica de negocio de ubicaciones/regiones.
 * Coordina entre la Vista (UI) y el Repositorio (Datos).
 * 
 * @class LocationController
 * @pattern MVC - Controller
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class LocationController {
    /**
     * Repositorio de ubicaciones
     * @private
     */
    #locationRepository;

    /**
     * Constructor
     * @param {LocationRepository} locationRepository - Instancia del repositorio
     */
    constructor(locationRepository) {
        if (!locationRepository) {
            throw new Error('LocationController requiere una instancia de LocationRepository');
        }
        this.#locationRepository = locationRepository;
        console.log('✓ LocationController: Instancia creada');
    }

    /**
     * Crea una nueva ubicación
     * @async
     * @param {Object} locationData - Datos de la ubicación
     * @returns {Promise<Object>} { success: boolean, location: Location, message: string }
     */
    async createLocation(locationData) {
        try {
            console.log('→ LocationController: Creando ubicación...');

            // Validar datos requeridos
            if (!locationData.nombre || !locationData.tipo) {
                return {
                    success: false,
                    location: null,
                    message: 'El nombre y tipo son requeridos'
                };
            }

            // Crear instancia de Location
            const location = new Location(locationData);

            // Validar
            const validation = location.validate();
            if (!validation.valid) {
                return {
                    success: false,
                    location: null,
                    message: `Errores de validación: ${validation.errors.join(', ')}`
                };
            }

            // Verificar si ya existe una ubicación con el mismo código
            // Obtener todas las ubicaciones y buscar en cliente (evita índices)
            if (location.codigo) {
                try {
                    const allLocations = await this.#locationRepository.getAll({ activa: undefined });
                    const existing = allLocations.filter(l => 
                        l.codigo && 
                        l.codigo.toUpperCase() === location.codigo.toUpperCase() && 
                        l.tipo === location.tipo
                    );
                    
                    if (existing.length > 0) {
                        return {
                            success: false,
                            location: null,
                            message: 'Ya existe una ubicación con este código y tipo'
                        };
                    }
                } catch (error) {
                    // Si hay error al verificar, continuar con la creación
                    // (mejor permitir duplicados que bloquear la creación)
                    console.warn('⚠️ No se pudo verificar duplicados:', error);
                }
            }

            // Crear en Firestore
            const createdLocation = await this.#locationRepository.create(location);

            return {
                success: true,
                location: createdLocation,
                message: 'Ubicación creada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error en LocationController:', error);
            return {
                success: false,
                location: null,
                message: `Error al crear ubicación: ${error.message}`
            };
        }
    }

    /**
     * Obtiene todas las ubicaciones con filtros opcionales
     * @async
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>} { success: boolean, locations: Array, message: string }
     */
    async getAllLocations(filters = {}) {
        try {
            console.log('→ LocationController: Obteniendo ubicaciones...');

            const locations = await this.#locationRepository.getAll(filters);

            return {
                success: true,
                locations: locations,
                message: `${locations.length} ubicaciones encontradas`
            };

        } catch (error) {
            console.error('❌ Error al obtener ubicaciones:', error);
            return {
                success: false,
                locations: [],
                message: `Error al obtener ubicaciones: ${error.message}`
            };
        }
    }

    /**
     * Obtiene una ubicación por ID
     * @async
     * @param {string} locationId - ID de la ubicación
     * @returns {Promise<Object>} { success: boolean, location: Location, message: string }
     */
    async getLocationById(locationId) {
        try {
            if (!locationId) {
                return {
                    success: false,
                    location: null,
                    message: 'ID de ubicación requerido'
                };
            }

            const location = await this.#locationRepository.getById(locationId);

            if (!location) {
                return {
                    success: false,
                    location: null,
                    message: 'Ubicación no encontrada'
                };
            }

            return {
                success: true,
                location: location,
                message: 'Ubicación obtenida exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al obtener ubicación:', error);
            return {
                success: false,
                location: null,
                message: `Error al obtener la ubicación: ${error.message}`
            };
        }
    }

    /**
     * Actualiza una ubicación existente
     * @async
     * @param {string} locationId - ID de la ubicación
     * @param {Object} locationData - Datos actualizados
     * @returns {Promise<Object>} { success: boolean, location: Location, message: string }
     */
    async updateLocation(locationId, locationData) {
        try {
            console.log('→ LocationController: Actualizando ubicación...');

            if (!locationId) {
                return {
                    success: false,
                    location: null,
                    message: 'ID de ubicación requerido'
                };
            }

            // Obtener ubicación existente
            const existingLocation = await this.#locationRepository.getById(locationId);
            if (!existingLocation) {
                return {
                    success: false,
                    location: null,
                    message: 'Ubicación no encontrada'
                };
            }

            // Actualizar datos
            const updatedData = {
                ...existingLocation,
                ...locationData,
                id: locationId // Mantener el ID
            };

            const location = new Location(updatedData);

            // Validar
            const validation = location.validate();
            if (!validation.valid) {
                return {
                    success: false,
                    location: null,
                    message: `Errores de validación: ${validation.errors.join(', ')}`
                };
            }

            // Actualizar en Firestore
            const updatedLocation = await this.#locationRepository.update(locationId, location);

            return {
                success: true,
                location: updatedLocation,
                message: 'Ubicación actualizada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al actualizar ubicación:', error);
            return {
                success: false,
                location: null,
                message: `Error al actualizar ubicación: ${error.message}`
            };
        }
    }

    /**
     * Elimina una ubicación
     * @async
     * @param {string} locationId - ID de la ubicación
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async deleteLocation(locationId) {
        try {
            console.log('→ LocationController: Eliminando ubicación...');

            if (!locationId) {
                return {
                    success: false,
                    message: 'ID de ubicación requerido'
                };
            }

            // Verificar que existe
            const location = await this.#locationRepository.getById(locationId);
            if (!location) {
                return {
                    success: false,
                    message: 'Ubicación no encontrada'
                };
            }

            // Eliminar (soft delete)
            await this.#locationRepository.delete(locationId);

            return {
                success: true,
                message: 'Ubicación eliminada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al eliminar ubicación:', error);
            return {
                success: false,
                message: `Error al eliminar ubicación: ${error.message}`
            };
        }
    }

    /**
     * Busca ubicaciones por término
     * @async
     * @param {string} searchTerm - Término de búsqueda
     * @param {Object} filters - Filtros adicionales
     * @returns {Promise<Object>} { success: boolean, locations: Array, message: string }
     */
    async searchLocations(searchTerm, filters = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return {
                    success: false,
                    locations: [],
                    message: 'El término de búsqueda debe tener al menos 2 caracteres'
                };
            }

            const locations = await this.#locationRepository.search(searchTerm, filters);

            return {
                success: true,
                locations: locations,
                message: `${locations.length} ubicaciones encontradas`
            };

        } catch (error) {
            console.error('❌ Error al buscar ubicaciones:', error);
            return {
                success: false,
                locations: [],
                message: `Error al buscar ubicaciones: ${error.message}`
            };
        }
    }

    /**
     * Obtiene estadísticas de ubicaciones
     * @async
     * @returns {Promise<Object>} { success: boolean, stats: Object, message: string }
     */
    async getStatistics() {
        try {
            const stats = await this.#locationRepository.getStatistics();

            return {
                success: true,
                stats: stats,
                message: 'Estadísticas obtenidas exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            return {
                success: false,
                stats: null,
                message: error.message
            };
        }
    }

    /**
     * Observa cambios en tiempo real de ubicaciones
     * @param {Function} callback - Función a ejecutar cuando cambien las ubicaciones
     * @param {Object} filters - Filtros opcionales
     * @returns {Function} Función para cancelar la suscripción
     */
    onLocationsChanged(callback, filters = {}) {
        return this.#locationRepository.onLocationsChanged(callback, filters);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationController;
}

