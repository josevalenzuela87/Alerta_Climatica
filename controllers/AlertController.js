/**
 * ========================================
 * AlertController - Controlador de Alertas
 * ========================================
 * 
 * Controlador que gestiona la lógica de negocio de alertas.
 * Coordina entre la Vista (UI) y el Repositorio (Datos).
 * 
 * @class AlertController
 * @pattern MVC - Controller
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class AlertController {
    /**
     * Repositorio de alertas
     * @private
     */
    #alertRepository;

    /**
     * Constructor
     * @param {AlertRepository} alertRepository - Instancia del repositorio
     */
    constructor(alertRepository) {
        if (!alertRepository) {
            throw new Error('AlertController requiere una instancia de AlertRepository');
        }
        this.#alertRepository = alertRepository;
        console.log('✓ AlertController: Instancia creada');
    }

    /**
     * Obtiene todas las alertas con filtros opcionales
     * @async
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>} { success: boolean, alerts: Array, message: string }
     */
    async getAllAlerts(filters = {}) {
        try {
            console.log('→ AlertController: Obteniendo alertas...');

            const alerts = await this.#alertRepository.getAll(filters);

            return {
                success: true,
                alerts: alerts,
                message: `${alerts.length} alertas encontradas`
            };

        } catch (error) {
            console.error('❌ Error en AlertController:', error);
            return {
                success: false,
                alerts: [],
                message: `Error al obtener alertas: ${error.message}`
            };
        }
    }

    /**
     * Obtiene una alerta por ID
     * @async
     * @param {string} alertId - ID de la alerta
     * @returns {Promise<Object>} { success: boolean, alert: Alert, message: string }
     */
    async getAlertById(alertId) {
        try {
            if (!alertId) {
                return {
                    success: false,
                    alert: null,
                    message: 'ID de alerta requerido'
                };
            }

            const alert = await this.#alertRepository.getById(alertId);

            if (!alert) {
                return {
                    success: false,
                    alert: null,
                    message: 'Alerta no encontrada'
                };
            }

            return {
                success: true,
                alert: alert,
                message: 'Alerta obtenida exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al obtener alerta:', error);
            return {
                success: false,
                alert: null,
                message: `Error al obtener la alerta: ${error.message}`
            };
        }
    }

    /**
     * Crea una nueva alerta
     * @async
     * @param {Object} formData - Datos del formulario
     * @returns {Promise<Object>} { success: boolean, alert: Alert, message: string }
     */
    async createAlert(formData) {
        try {
            console.log('→ AlertController: Creando nueva alerta...');

            // Crear instancia de Alert desde los datos del formulario
            const alert = new Alert({
                titulo: formData.titulo?.trim(),
                descripcion: formData.descripcion?.trim(),
                tipo: formData.tipo,
                severidad: formData.severidad,
                status: formData.status || 'activa',
                region: formData.region?.trim(),
                ciudad: formData.ciudad?.trim(),
                fechaInicio: formData.fechaInicio || new Date().toISOString(),
                fechaFin: formData.fechaFin || null,
                recomendaciones: Array.isArray(formData.recomendaciones) 
                    ? formData.recomendaciones 
                    : (formData.recomendaciones ? formData.recomendaciones.split('\n').filter(r => r.trim()) : [])
            });

            // Llamar al repositorio
            const result = await this.#alertRepository.create(alert);

            if (result.success) {
                // Obtener la alerta recién creada
                const createdAlert = await this.#alertRepository.getById(result.id);
                
                return {
                    success: true,
                    alert: createdAlert,
                    message: result.message,
                    id: result.id
                };
            } else {
                return {
                    success: false,
                    alert: null,
                    message: result.message,
                    errors: result.errors || {}
                };
            }

        } catch (error) {
            console.error('❌ Error crítico al crear alerta:', error);
            return {
                success: false,
                alert: null,
                message: 'Error inesperado al crear la alerta',
                errors: {}
            };
        }
    }

    /**
     * Actualiza una alerta existente
     * @async
     * @param {string} alertId - ID de la alerta
     * @param {Object} formData - Datos actualizados
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async updateAlert(alertId, formData) {
        try {
            console.log(`→ AlertController: Actualizando alerta ${alertId}...`);

            // Obtener alerta actual
            const currentAlert = await this.#alertRepository.getById(alertId);
            if (!currentAlert) {
                return {
                    success: false,
                    message: 'Alerta no encontrada'
                };
            }

            // Actualizar datos
            const updatedAlert = new Alert({
                ...currentAlert,
                titulo: formData.titulo?.trim() || currentAlert.titulo,
                descripcion: formData.descripcion?.trim() || currentAlert.descripcion,
                tipo: formData.tipo || currentAlert.tipo,
                severidad: formData.severidad || currentAlert.severidad,
                status: formData.status || currentAlert.status,
                region: formData.region?.trim() || currentAlert.region,
                ciudad: formData.ciudad?.trim() || currentAlert.ciudad,
                fechaInicio: formData.fechaInicio || currentAlert.fechaInicio,
                fechaFin: formData.fechaFin || currentAlert.fechaFin,
                recomendaciones: Array.isArray(formData.recomendaciones)
                    ? formData.recomendaciones
                    : (formData.recomendaciones ? formData.recomendaciones.split('\n').filter(r => r.trim()) : currentAlert.recomendaciones)
            });

            const result = await this.#alertRepository.update(alertId, updatedAlert);

            return result;

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
    async deleteAlert(alertId) {
        try {
            console.log(`→ AlertController: Eliminando alerta ${alertId}...`);

            const result = await this.#alertRepository.delete(alertId);

            return result;

        } catch (error) {
            console.error('❌ Error al eliminar alerta:', error);
            return {
                success: false,
                message: `Error al eliminar la alerta: ${error.message}`
            };
        }
    }

    /**
     * Obtiene estadísticas de alertas
     * @async
     * @returns {Promise<Object>} { success: boolean, stats: Object }
     */
    async getStatistics() {
        try {
            const stats = await this.#alertRepository.getStatistics();
            return {
                success: true,
                stats: stats
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
     * Observa cambios en tiempo real de alertas
     * @param {Function} callback - Función a ejecutar cuando cambien las alertas
     * @param {Object} filters - Filtros opcionales
     * @returns {Function} Función para cancelar la suscripción
     */
    onAlertsChanged(callback, filters = {}) {
        return this.#alertRepository.onAlertsChanged(callback, filters);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertController;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.AlertController = AlertController;
}

