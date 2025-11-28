/**
 * ========================================
 * StatisticsRepository - Repositorio de Estadísticas
 * ========================================
 * 
 * Repositorio que maneja el acceso a datos estadísticos desde Firestore.
 * 
 * @class StatisticsRepository
 * @pattern Repository
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class StatisticsRepository {
    /**
     * Instancia del FirebaseService
     * @private
     */
    #firebaseService;

    /**
     * Instancia de Firestore
     * @private
     */
    #firestore;

    /**
     * Constructor
     * @param {FirebaseService} firebaseService - Instancia del servicio Firebase
     */
    constructor(firebaseService) {
        if (!firebaseService) {
            throw new Error('StatisticsRepository requiere una instancia de FirebaseService');
        }
        this.#firebaseService = firebaseService;
        this.#firestore = firebaseService.getFirestore();
        console.log('✓ StatisticsRepository: Instancia creada');
    }

    /**
     * Obtiene todas las alertas para análisis estadístico
     * @async
     * @returns {Promise<Array>} Array de alertas
     */
    async getAllAlertsForStatistics() {
        try {
            const snapshot = await this.#firestore.collection('alerts').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Error al obtener alertas para estadísticas:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las ubicaciones para análisis estadístico
     * @async
     * @returns {Promise<Array>} Array de ubicaciones
     */
    async getAllLocationsForStatistics() {
        try {
            const snapshot = await this.#firestore.collection('locations').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Error al obtener ubicaciones para estadísticas:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los usuarios para análisis estadístico
     * @async
     * @returns {Promise<Array>} Array de usuarios
     */
    async getAllUsersForStatistics() {
        try {
            const snapshot = await this.#firestore.collection('users').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Error al obtener usuarios para estadísticas:', error);
            throw error;
        }
    }

    /**
     * Obtiene alertas filtradas por rango de fechas
     * @async
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Promise<Array>} Array de alertas en el rango
     */
    async getAlertsByDateRange(startDate, endDate) {
        try {
            const snapshot = await this.#firestore
                .collection('alerts')
                .where('fechaCreacion', '>=', startDate)
                .where('fechaCreacion', '<=', endDate)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('❌ Error al obtener alertas por rango de fechas:', error);
            // Si falla por índices, obtener todas y filtrar en cliente
            const allAlerts = await this.getAllAlertsForStatistics();
            return allAlerts.filter(alert => {
                const alertDate = alert.fechaCreacion?.toDate ? alert.fechaCreacion.toDate() : new Date(alert.fechaCreacion);
                return alertDate >= startDate && alertDate <= endDate;
            });
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsRepository;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.StatisticsRepository = StatisticsRepository;
}

