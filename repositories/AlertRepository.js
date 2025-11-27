/**
 * ========================================
 * AlertRepository - Capa de Acceso a Datos
 * ========================================
 * 
 * Repositorio que gestiona todas las operaciones de alertas
 * con Firebase Firestore, proporcionando una capa de abstracción limpia.
 * 
 * @class AlertRepository
 * @pattern Repository
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class AlertRepository {
    /**
     * Instancia del FirebaseService (Singleton)
     * @private
     */
    #firebaseService;

    /**
     * Nombre de la colección en Firestore
     * @private
     */
    #collectionName = 'alerts';

    /**
     * Constructor
     * @param {FirebaseService} firebaseService - Instancia del servicio Firebase
     */
    constructor(firebaseService) {
        if (!firebaseService) {
            throw new Error('AlertRepository requiere una instancia de FirebaseService');
        }
        this.#firebaseService = firebaseService;
        console.log('✓ AlertRepository: Instancia creada');
    }

    /**
     * Obtiene la colección de alertas
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
     * Obtiene todas las alertas
     * @async
     * @param {Object} filters - Filtros opcionales
     * @returns {Promise<Array>} Array de alertas
     */
    async getAll(filters = {}) {
        try {
            console.log('→ AlertRepository: Obteniendo todas las alertas...');

            const collection = this.#getCollection();
            if (!collection) {
                return [];
            }
            
            let query = collection;

            // Aplicar filtros
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }

            if (filters.tipo) {
                query = query.where('tipo', '==', filters.tipo);
            }

            if (filters.severidad) {
                query = query.where('severidad', '==', filters.severidad);
            }

            if (filters.region) {
                query = query.where('region', '==', filters.region);
            }

            // Ordenar por fecha de creación (más recientes primero)
            query = query.orderBy('createdAt', 'desc');

            // Límite de resultados (opcional)
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const snapshot = await query.get();

            const alerts = [];
            snapshot.forEach((doc) => {
                alerts.push(Alert.fromFirestore(doc.id, doc.data()));
            });

            console.log(`✓ Se encontraron ${alerts.length} alertas`);
            return alerts;

        } catch (error) {
            console.error('❌ Error al obtener alertas:', error);
            throw new Error(`No se pudieron obtener las alertas: ${error.message}`);
        }
    }

    /**
     * Obtiene una alerta por su ID
     * @async
     * @param {string} alertId - ID de la alerta
     * @returns {Promise<Alert|null>} Alerta encontrada o null
     */
    async getById(alertId) {
        try {
            console.log(`→ AlertRepository: Obteniendo alerta ${alertId}...`);

            const doc = await this.#getCollection().doc(alertId).get();

            if (!doc.exists) {
                console.warn(`⚠️ Alerta ${alertId} no encontrada`);
                return null;
            }

            const alert = Alert.fromFirestore(doc.id, doc.data());
            console.log('✓ Alerta obtenida');
            return alert;

        } catch (error) {
            console.error('❌ Error al obtener alerta:', error);
            throw new Error(`No se pudo obtener la alerta: ${error.message}`);
        }
    }

    /**
     * Crea una nueva alerta
     * @async
     * @param {Alert} alert - Instancia de Alert a crear
     * @returns {Promise<Object>} { success: boolean, id: string, message: string }
     */
    async create(alert) {
        try {
            console.log('→ AlertRepository: Creando nueva alerta...');

            // Validar la alerta antes de guardar
            const validation = alert.validate();
            if (!validation.valid) {
                return {
                    success: false,
                    id: null,
                    message: 'Datos inválidos',
                    errors: validation.errors
                };
            }

            // Obtener usuario actual
            const currentUser = this.#firebaseService.getCurrentUser();
            if (!currentUser) {
                return {
                    success: false,
                    id: null,
                    message: 'Debes estar autenticado para crear alertas'
                };
            }

            // Asignar creador
            alert.createdBy = currentUser.uid;

            // Guardar en Firestore
            const docRef = await this.#getCollection().add(alert.toFirestore());

            console.log(`✓ Alerta creada con ID: ${docRef.id}`);
            return {
                success: true,
                id: docRef.id,
                message: 'Alerta creada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al crear alerta:', error);
            return {
                success: false,
                id: null,
                message: `Error al crear la alerta: ${error.message}`
            };
        }
    }

    /**
     * Actualiza una alerta existente
     * @async
     * @param {string} alertId - ID de la alerta
     * @param {Alert} alert - Datos actualizados
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async update(alertId, alert) {
        try {
            console.log(`→ AlertRepository: Actualizando alerta ${alertId}...`);

            // Validar la alerta
            const validation = alert.validate();
            if (!validation.valid) {
                return {
                    success: false,
                    message: 'Datos inválidos',
                    errors: validation.errors
                };
            }

            // Actualizar en Firestore
            await this.#getCollection().doc(alertId).update(alert.toFirestore());

            console.log('✓ Alerta actualizada');
            return {
                success: true,
                message: 'Alerta actualizada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al actualizar alerta:', error);
            return {
                success: false,
                message: `Error al actualizar la alerta: ${error.message}`
            };
        }
    }

    /**
     * Elimina una alerta
     * @async
     * @param {string} alertId - ID de la alerta
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async delete(alertId) {
        try {
            console.log(`→ AlertRepository: Eliminando alerta ${alertId}...`);

            await this.#getCollection().doc(alertId).delete();

            console.log('✓ Alerta eliminada');
            return {
                success: true,
                message: 'Alerta eliminada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al eliminar alerta:', error);
            return {
                success: false,
                message: `Error al eliminar la alerta: ${error.message}`
            };
        }
    }

    /**
     * Observa cambios en tiempo real en las alertas
     * @param {Function} callback - Función a ejecutar cuando cambien las alertas
     * @param {Object} filters - Filtros opcionales
     * @returns {Function} Función para cancelar la suscripción
     */
    onAlertsChanged(callback, filters = {}) {
        try {
            let query = this.#getCollection();

            // Aplicar filtros
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }

            if (filters.tipo) {
                query = query.where('tipo', '==', filters.tipo);
            }

            query = query.orderBy('createdAt', 'desc');

            return query.onSnapshot((snapshot) => {
                const alerts = [];
                snapshot.forEach((doc) => {
                    alerts.push(Alert.fromFirestore(doc.id, doc.data()));
                });
                callback(alerts);
            }, (error) => {
                console.error('❌ Error en tiempo real:', error);
            });

        } catch (error) {
            console.error('❌ Error al observar alertas:', error);
            return () => {};
        }
    }

    /**
     * Obtiene estadísticas de alertas
     * @async
     * @returns {Promise<Object>} Estadísticas de alertas
     */
    async getStatistics() {
        try {
            console.log('→ AlertRepository: Obteniendo estadísticas...');

            const allAlerts = await this.getAll();

            const stats = {
                total: allAlerts.length,
                activas: allAlerts.filter(a => a.status === 'activa').length,
                porTipo: {},
                porSeveridad: {
                    leve: 0,
                    moderada: 0,
                    grave: 0,
                    critica: 0
                }
            };

            // Contar por tipo
            allAlerts.forEach(alert => {
                stats.porTipo[alert.tipo] = (stats.porTipo[alert.tipo] || 0) + 1;
                stats.porSeveridad[alert.severidad] = (stats.porSeveridad[alert.severidad] || 0) + 1;
            });

            console.log('✓ Estadísticas obtenidas');
            return stats;

        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            throw new Error(`No se pudieron obtener las estadísticas: ${error.message}`);
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertRepository;
}

