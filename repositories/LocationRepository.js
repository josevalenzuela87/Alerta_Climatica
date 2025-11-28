/**
 * ========================================
 * LocationRepository - Capa de Acceso a Datos
 * ========================================
 * 
 * Repositorio que gestiona todas las operaciones de ubicaciones/regiones
 * con Firebase Firestore, proporcionando una capa de abstracción limpia.
 * 
 * @class LocationRepository
 * @pattern Repository
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class LocationRepository {
    /**
     * Instancia del FirebaseService (Singleton)
     * @private
     */
    #firebaseService;

    /**
     * Nombre de la colección en Firestore
     * @private
     */
    #collectionName = 'locations';

    /**
     * Constructor
     * @param {FirebaseService} firebaseService - Instancia del servicio Firebase
     */
    constructor(firebaseService) {
        if (!firebaseService) {
            throw new Error('LocationRepository requiere una instancia de FirebaseService');
        }
        this.#firebaseService = firebaseService;
        console.log('✓ LocationRepository: Instancia creada');
    }

    /**
     * Obtiene la colección de ubicaciones
     * @private
     * @returns {firebase.firestore.CollectionReference|null} Referencia a la colección o null
     */
    #getCollection() {
        const firestore = this.#firebaseService.getFirestore();
        if (!firestore) {
            console.error('❌ Firestore no está disponible. Verifica que esté habilitado en Firebase Console.');
            return null;
        }
        return firestore.collection(this.#collectionName);
    }

    /**
     * Crea una nueva ubicación
     * @async
     * @param {Location} location - Instancia de Location
     * @returns {Promise<Location>} Ubicación creada con ID
     */
    async create(location) {
        try {
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const data = location.toFirestore();
            const docRef = await collection.add(data);
            
            console.log('✓ LocationRepository: Ubicación creada con ID:', docRef.id);
            
            // Retornar ubicación con ID
            location.id = docRef.id;
            return location;

        } catch (error) {
            console.error('❌ Error al crear ubicación:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las ubicaciones con filtros opcionales
     * @async
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array<Location>>} Array de ubicaciones
     */
    async getAll(filters = {}) {
        try {
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            // Obtener TODAS las ubicaciones sin filtros en Firestore
            // Esto evita completamente la necesidad de índices compuestos
            // Los filtros y ordenamiento se harán en el cliente
            const snapshot = await collection.get();
            let locations = [];

            snapshot.forEach(doc => {
                const location = Location.fromFirestore(doc.id, doc.data());
                locations.push(location);
            });

            // Aplicar TODOS los filtros en el cliente
            if (filters.activa !== undefined) {
                locations = locations.filter(l => l.activa === filters.activa);
            } else {
                // Por defecto solo activas
                locations = locations.filter(l => l.activa === true);
            }

            if (filters.tipo) {
                locations = locations.filter(l => l.tipo === filters.tipo);
            }
            if (filters.pais) {
                locations = locations.filter(l => l.pais === filters.pais);
            }
            if (filters.estado) {
                locations = locations.filter(l => l.estado === filters.estado);
            }

            // Ordenar en el cliente (siempre)
            const orderBy = filters.orderBy || 'nombre';
            const orderDirection = filters.orderDirection || 'asc';
            
            locations.sort((a, b) => {
                let aVal = a[orderBy] || '';
                let bVal = b[orderBy] || '';
                
                // Convertir a string para comparación
                if (typeof aVal !== 'string') {
                    aVal = String(aVal);
                }
                if (typeof bVal !== 'string') {
                    bVal = String(bVal);
                }
                
                const comparison = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
                return orderDirection === 'asc' ? comparison : -comparison;
            });

            // Aplicar límite después de filtrar y ordenar
            if (filters.limit) {
                locations = locations.slice(0, filters.limit);
            }

            console.log(`✓ LocationRepository: ${locations.length} ubicaciones obtenidas`);
            return locations;

        } catch (error) {
            console.error('❌ Error al obtener ubicaciones:', error);
            throw error;
        }
    }

    /**
     * Obtiene una ubicación por ID
     * @async
     * @param {string} locationId - ID de la ubicación
     * @returns {Promise<Location|null>} Ubicación o null si no existe
     */
    async getById(locationId) {
        try {
            if (!locationId) {
                return null;
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const doc = await collection.doc(locationId).get();

            if (!doc.exists) {
                console.warn('⚠️ LocationRepository: Ubicación no encontrada:', locationId);
                return null;
            }

            const location = Location.fromFirestore(doc.id, doc.data());
            console.log('✓ LocationRepository: Ubicación obtenida:', locationId);
            return location;

        } catch (error) {
            console.error('❌ Error al obtener ubicación:', error);
            throw error;
        }
    }

    /**
     * Actualiza una ubicación existente
     * @async
     * @param {string} locationId - ID de la ubicación
     * @param {Location} location - Instancia de Location con datos actualizados
     * @returns {Promise<Location>} Ubicación actualizada
     */
    async update(locationId, location) {
        try {
            if (!locationId) {
                throw new Error('ID de ubicación requerido');
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const data = location.toFirestore();
            await collection.doc(locationId).update(data);

            console.log('✓ LocationRepository: Ubicación actualizada:', locationId);
            
            location.id = locationId;
            return location;

        } catch (error) {
            console.error('❌ Error al actualizar ubicación:', error);
            throw error;
        }
    }

    /**
     * Elimina una ubicación (soft delete)
     * @async
     * @param {string} locationId - ID de la ubicación
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async delete(locationId) {
        try {
            if (!locationId) {
                throw new Error('ID de ubicación requerido');
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            // Soft delete: marcar como inactiva
            await collection.doc(locationId).update({
                activa: false,
                fechaActualizacion: new Date()
            });

            console.log('✓ LocationRepository: Ubicación eliminada (soft delete):', locationId);
            return true;

        } catch (error) {
            console.error('❌ Error al eliminar ubicación:', error);
            throw error;
        }
    }

    /**
     * Busca ubicaciones por término
     * @async
     * @param {string} searchTerm - Término de búsqueda
     * @param {Object} filters - Filtros adicionales
     * @returns {Promise<Array<Location>>} Array de ubicaciones encontradas
     */
    async search(searchTerm, filters = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return [];
            }

            const term = searchTerm.toLowerCase().trim();
            
            // Obtener todas las ubicaciones sin filtros (para evitar índices compuestos)
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const snapshot = await collection.get();
            const allLocations = [];

            snapshot.forEach(doc => {
                const location = Location.fromFirestore(doc.id, doc.data());
                allLocations.push(location);
            });

            // Filtrar por término de búsqueda
            let results = allLocations.filter(location => {
                const searchableText = [
                    location.nombre,
                    location.codigo,
                    location.estado,
                    location.ciudad,
                    location.municipio,
                    location.pais,
                    location.getFullName()
                ].join(' ').toLowerCase();

                return searchableText.includes(term);
            });

            // Aplicar filtros adicionales si existen
            if (filters.activa !== undefined) {
                results = results.filter(l => l.activa === filters.activa);
            }
            if (filters.tipo) {
                results = results.filter(l => l.tipo === filters.tipo);
            }
            if (filters.pais) {
                results = results.filter(l => l.pais === filters.pais);
            }
            if (filters.estado) {
                results = results.filter(l => l.estado === filters.estado);
            }

            console.log(`✓ LocationRepository: ${results.length} ubicaciones encontradas para: "${searchTerm}"`);
            return results;

        } catch (error) {
            console.error('❌ Error al buscar ubicaciones:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de ubicaciones
     * @async
     * @returns {Promise<Object>} Estadísticas
     */
    async getStatistics() {
        try {
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            // Obtener todas las ubicaciones sin filtros (sin ordenar para evitar índice)
            const snapshot = await collection.get();
            const allLocations = [];

            snapshot.forEach(doc => {
                const location = Location.fromFirestore(doc.id, doc.data());
                allLocations.push(location);
            });
            
            const stats = {
                total: allLocations.length,
                activas: allLocations.filter(l => l.activa).length,
                inactivas: allLocations.filter(l => !l.activa).length,
                porTipo: {
                    pais: allLocations.filter(l => l.tipo === 'pais').length,
                    estado: allLocations.filter(l => l.tipo === 'estado').length,
                    ciudad: allLocations.filter(l => l.tipo === 'ciudad').length,
                    municipio: allLocations.filter(l => l.tipo === 'municipio').length
                },
                conCoordenadas: allLocations.filter(l => l.hasCoordinates()).length
            };

            console.log('✓ LocationRepository: Estadísticas obtenidas');
            return stats;

        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            throw error;
        }
    }

    /**
     * Observa cambios en tiempo real de ubicaciones
     * @param {Function} callback - Función a ejecutar cuando cambien las ubicaciones
     * @param {Object} filters - Filtros opcionales
     * @returns {Function} Función para cancelar la suscripción
     */
    onLocationsChanged(callback, filters = {}) {
        try {
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            // Usar solo un filtro a la vez para evitar índices compuestos
            let query = collection.where('activa', '==', filters.activa !== undefined ? filters.activa : true);

            // No aplicar filtro de tipo en tiempo real para evitar índice compuesto
            // Filtrar en el cliente si es necesario
            const tipoFilter = filters.tipo;

            const unsubscribe = query.onSnapshot(
                (snapshot) => {
                    const locations = [];
                    snapshot.forEach(doc => {
                        const location = Location.fromFirestore(doc.id, doc.data());
                        locations.push(location);
                    });

                    // Aplicar filtro de tipo en el cliente si existe
                    const filteredLocations = tipoFilter 
                        ? locations.filter(l => l.tipo === tipoFilter)
                        : locations;

                    callback(filteredLocations);
                },
                (error) => {
                    console.error('❌ Error en suscripción de ubicaciones:', error);
                    callback([]);
                }
            );

            return unsubscribe;

        } catch (error) {
            console.error('❌ Error al suscribirse a cambios:', error);
            return () => {}; // Retornar función vacía
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationRepository;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.LocationRepository = LocationRepository;
}

