/**
 * ========================================
 * NotificationController - Controlador de Notificaciones
 * ========================================
 * 
 * Maneja la lógica de negocio de notificaciones.
 * 
 * @class NotificationController
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class NotificationController {
    /**
     * Repositorio de notificaciones
     * @private
     */
    #notificationRepository;

    /**
     * Instancia de FirebaseService
     * @private
     */
    #firebaseService;

    /**
     * Constructor
     * @param {NotificationRepository} notificationRepository - Repositorio de notificaciones
     * @param {FirebaseService} firebaseService - Servicio de Firebase
     */
    constructor(notificationRepository, firebaseService) {
        if (!notificationRepository) {
            throw new Error('NotificationController requiere NotificationRepository');
        }
        if (!firebaseService) {
            throw new Error('NotificationController requiere FirebaseService');
        }
        this.#notificationRepository = notificationRepository;
        this.#firebaseService = firebaseService;
        console.log('✓ NotificationController: Instancia creada');
    }

    /**
     * Envía una notificación push a un usuario
     * @async
     * @param {string} userId - ID del usuario destinatario
     * @param {Object} notificationData - Datos de la notificación
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async sendPushNotification(userId, notificationData) {
        try {
            // Obtener token FCM del usuario
            const token = await this.#notificationRepository.getFCMToken(userId);
            
            if (!token) {
                console.warn(`⚠️ Usuario ${userId} no tiene token FCM registrado`);
                return { success: false, message: 'Usuario no tiene token FCM' };
            }

            // Enviar notificación usando Firebase Admin SDK (desde backend)
            // Por ahora, solo guardamos la notificación en Firestore
            // El servicio web deberá implementar el envío real de FCM
            
            // Crear notificación en Firestore
            const notification = new Notification({
                userId: userId,
                alertId: notificationData.alertId || null,
                tipo: notificationData.tipo || Notification.TYPES.ALERTA_NUEVA,
                titulo: notificationData.titulo || 'Nueva alerta',
                mensaje: notificationData.mensaje || '',
                data: notificationData.data || {}
            });

            await this.#notificationRepository.create(notification);

            return { success: true, message: 'Notificación enviada' };
        } catch (error) {
            console.error('❌ Error al enviar notificación push:', error);
            throw new Error(`No se pudo enviar la notificación: ${error.message}`);
        }
    }

    /**
     * Notifica a usuarios sobre una nueva alerta
     * @async
     * @param {Alert} alert - Alerta creada
     * @param {Array<User>} targetUsers - Usuarios a notificar
     * @returns {Promise<Object>} { success: boolean, count: number }
     */
    async notifyNewAlert(alert, targetUsers) {
        try {
            if (!targetUsers || targetUsers.length === 0) {
                return { success: true, count: 0 };
            }

            const notifications = [];
            const tokens = [];

            for (const user of targetUsers) {
                // Verificar preferencias de notificaciones
                const prefs = user.preferenciasNotificaciones || {};
                
                // Solo notificar si las notificaciones están activas
                if (prefs.activas === false) {
                    continue;
                }

                // Verificar severidad mínima
                const severidadOrder = {
                    'leve': 1,
                    'moderada': 2,
                    'grave': 3,
                    'critica': 4
                };
                const alertSeveridad = alert.severidad || 'leve';
                const minimaSeveridad = prefs.severidadMinima || 'leve';
                
                if ((severidadOrder[alertSeveridad] || 1) < (severidadOrder[minimaSeveridad] || 1)) {
                    continue; // La alerta no cumple la severidad mínima
                }

                // Crear notificación
                const notification = new Notification({
                    userId: user.uid,
                    alertId: alert.id,
                    tipo: Notification.TYPES.ALERTA_NUEVA,
                    titulo: `Nueva alerta: ${alert.titulo}`,
                    mensaje: alert.descripcion || 'Una nueva alerta climática ha sido publicada',
                    data: {
                        alertId: alert.id,
                        tipo: alert.tipo,
                        severidad: alert.severidad,
                        ubicaciones: alert.ubicaciones || []
                    }
                });

                notifications.push(notification);

                // Obtener token FCM si está disponible
                try {
                    const token = await this.#notificationRepository.getFCMToken(user.uid);
                    if (token) {
                        tokens.push({
                            userId: user.uid,
                            token: token,
                            notification: notification
                        });
                    }
                } catch (tokenError) {
                    console.warn(`⚠️ No se pudo obtener token FCM para usuario ${user.uid}`);
                }
            }

            // Guardar notificaciones en Firestore
            if (notifications.length > 0) {
                await this.#notificationRepository.createBatch(notifications);
            }

            // Enviar notificaciones push (requiere servicio web con Admin SDK)
            // Por ahora, esto se hará desde un servicio backend

            console.log(`✓ ${notifications.length} notificaciones creadas, ${tokens.length} tokens FCM disponibles`);
            
            return {
                success: true,
                count: notifications.length,
                tokensCount: tokens.length
            };
        } catch (error) {
            console.error('❌ Error al notificar nueva alerta:', error);
            throw new Error(`No se pudieron enviar las notificaciones: ${error.message}`);
        }
    }

    /**
     * Obtiene las notificaciones de un usuario
     * @async
     * @param {string} userId - ID del usuario
     * @param {Object} options - Opciones de filtrado
     * @returns {Promise<Object>} { success: boolean, notifications: Array }
     */
    async getUserNotifications(userId, options = {}) {
        try {
            const notifications = await this.#notificationRepository.getByUser(userId, options);
            return {
                success: true,
                notifications: notifications
            };
        } catch (error) {
            console.error('❌ Error al obtener notificaciones:', error);
            throw new Error(`No se pudieron obtener las notificaciones: ${error.message}`);
        }
    }

    /**
     * Marca una notificación como leída
     * @async
     * @param {string} notificationId - ID de la notificación
     * @returns {Promise<Object>} { success: boolean }
     */
    async markAsRead(notificationId) {
        try {
            return await this.#notificationRepository.markAsRead(notificationId);
        } catch (error) {
            console.error('❌ Error al marcar como leída:', error);
            throw new Error(`No se pudo marcar la notificación: ${error.message}`);
        }
    }

    /**
     * Marca todas las notificaciones de un usuario como leídas
     * @async
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} { success: boolean, count: number }
     */
    async markAllAsRead(userId) {
        try {
            return await this.#notificationRepository.markAllAsRead(userId);
        } catch (error) {
            console.error('❌ Error al marcar todas como leídas:', error);
            throw new Error(`No se pudieron marcar las notificaciones: ${error.message}`);
        }
    }

    /**
     * Obtiene el conteo de notificaciones no leídas
     * @async
     * @param {string} userId - ID del usuario
     * @returns {Promise<number>} Número de notificaciones no leídas
     */
    async getUnreadCount(userId) {
        try {
            return await this.#notificationRepository.getUnreadCount(userId);
        } catch (error) {
            console.error('❌ Error al obtener conteo:', error);
            return 0;
        }
    }

    /**
     * Guarda o actualiza el token FCM de un usuario
     * @async
     * @param {string} userId - ID del usuario
     * @param {string} token - Token FCM
     * @param {Object} deviceInfo - Información del dispositivo
     * @returns {Promise<Object>} { success: boolean }
     */
    async saveFCMToken(userId, token, deviceInfo = {}) {
        try {
            return await this.#notificationRepository.saveFCMToken(userId, token, deviceInfo);
        } catch (error) {
            console.error('❌ Error al guardar token FCM:', error);
            throw new Error(`No se pudo guardar el token: ${error.message}`);
        }
    }

    /**
     * Elimina el token FCM de un usuario
     * @async
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} { success: boolean }
     */
    async deleteFCMToken(userId) {
        try {
            return await this.#notificationRepository.deleteFCMToken(userId);
        } catch (error) {
            console.error('❌ Error al eliminar token FCM:', error);
            throw new Error(`No se pudo eliminar el token: ${error.message}`);
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationController;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.NotificationController = NotificationController;
}

