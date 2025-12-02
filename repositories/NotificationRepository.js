/**
 * ========================================
 * NotificationRepository - Repositorio de Notificaciones
 * ========================================
 * 
 * Maneja las operaciones CRUD de notificaciones en Firestore.
 * 
 * @class NotificationRepository
 * @pattern Repository
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class NotificationRepository {
    /**
     * Nombre de la colección en Firestore
     * @private
     */
    #collectionName = 'notifications';

    /**
     * Nombre de la colección para tokens FCM
     * @private
     */
    #tokensCollectionName = 'fcm_tokens';

    /**
     * Instancia de FirebaseService
     * @private
     */
    #firebaseService;

    /**
     * Constructor
     * @param {FirebaseService} firebaseService - Instancia del servicio de Firebase
     */
    constructor(firebaseService) {
        if (!firebaseService) {
            throw new Error('NotificationRepository: firebaseService es requerido');
        }
        this.#firebaseService = firebaseService;
        console.log('✓ NotificationRepository: Instancia creada');
    }

    /**
     * Obtiene la referencia a la colección de notificaciones
     * @private
     * @returns {firebase.firestore.CollectionReference}
     */
    #getCollection() {
        const firestore = this.#firebaseService.getFirestore();
        if (!firestore) {
            throw new Error('Firestore no está inicializado');
        }
        return firestore.collection(this.#collectionName);
    }

    /**
     * Obtiene la referencia a la colección de tokens FCM
     * @private
     * @returns {firebase.firestore.CollectionReference}
     */
    #getTokensCollection() {
        const firestore = this.#firebaseService.getFirestore();
        if (!firestore) {
            throw new Error('Firestore no está inicializado');
        }
        return firestore.collection(this.#tokensCollectionName);
    }

    /**
     * Guarda o actualiza un token FCM para un usuario
     * @async
     * @param {string} userId - ID del usuario
     * @param {string} token - Token FCM
     * @param {Object} deviceInfo - Información del dispositivo (opcional)
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async saveFCMToken(userId, token, deviceInfo = {}) {
        try {
            if (!userId || !token) {
                throw new Error('userId y token son requeridos');
            }

            const tokensRef = this.#getTokensCollection();
            const tokenDoc = await tokensRef.doc(userId).get();

            const tokenData = {
                userId: userId,
                token: token,
                deviceInfo: {
                    userAgent: deviceInfo.userAgent || navigator.userAgent,
                    platform: deviceInfo.platform || navigator.platform,
                    language: deviceInfo.language || navigator.language,
                    ...deviceInfo
                },
                updatedAt: new Date().toISOString()
            };

            if (tokenDoc.exists) {
                // Actualizar token existente
                await tokensRef.doc(userId).update(tokenData);
                console.log(`✓ Token FCM actualizado para usuario ${userId}`);
            } else {
                // Crear nuevo token
                tokenData.createdAt = new Date().toISOString();
                await tokensRef.doc(userId).set(tokenData);
                console.log(`✓ Token FCM guardado para usuario ${userId}`);
            }

            return { success: true, message: 'Token guardado correctamente' };
        } catch (error) {
            console.error('❌ Error al guardar token FCM:', error);
            throw new Error(`No se pudo guardar el token FCM: ${error.message}`);
        }
    }

    /**
     * Obtiene el token FCM de un usuario
     * @async
     * @param {string} userId - ID del usuario
     * @returns {Promise<string|null>} Token FCM o null si no existe
     */
    async getFCMToken(userId) {
        try {
            const tokenDoc = await this.#getTokensCollection().doc(userId).get();
            
            if (tokenDoc.exists) {
                return tokenDoc.data().token || null;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error al obtener token FCM:', error);
            return null;
        }
    }

    /**
     * Obtiene todos los tokens FCM de usuarios específicos
     * @async
     * @param {Array<string>} userIds - Array de IDs de usuarios
     * @returns {Promise<Array>} Array de objetos { userId, token }
     */
    async getFCMTokensByUsers(userIds) {
        try {
            if (!userIds || userIds.length === 0) {
                return [];
            }

            const tokensRef = this.#getTokensCollection();
            const tokens = [];

            // Firestore no permite consultas con 'in' de más de 10 elementos
            // Dividir en lotes de 10
            const batchSize = 10;
            for (let i = 0; i < userIds.length; i += batchSize) {
                const batch = userIds.slice(i, i + batchSize);
                const snapshot = await tokensRef.where('userId', 'in', batch).get();
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.token) {
                        tokens.push({
                            userId: data.userId,
                            token: data.token,
                            deviceInfo: data.deviceInfo || {}
                        });
                    }
                });
            }

            return tokens;
        } catch (error) {
            console.error('❌ Error al obtener tokens FCM:', error);
            return [];
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
            await this.#getTokensCollection().doc(userId).delete();
            console.log(`✓ Token FCM eliminado para usuario ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error al eliminar token FCM:', error);
            throw new Error(`No se pudo eliminar el token FCM: ${error.message}`);
        }
    }

    /**
     * Crea una notificación en Firestore
     * @async
     * @param {Notification} notification - Instancia de Notification
     * @returns {Promise<Object>} { success: boolean, notification: Notification, id: string }
     */
    async create(notification) {
        try {
            const validation = notification.validate();
            if (!validation.valid) {
                throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
            }

            const docRef = await this.#getCollection().add(notification.toFirestore());
            notification.id = docRef.id;
            
            console.log(`✓ Notificación creada: ${docRef.id}`);
            return {
                success: true,
                notification: notification,
                id: docRef.id
            };
        } catch (error) {
            console.error('❌ Error al crear notificación:', error);
            throw new Error(`No se pudo crear la notificación: ${error.message}`);
        }
    }

    /**
     * Crea múltiples notificaciones (para notificar a varios usuarios)
     * @async
     * @param {Array<Notification>} notifications - Array de instancias de Notification
     * @returns {Promise<Object>} { success: boolean, count: number }
     */
    async createBatch(notifications) {
        try {
            if (!notifications || notifications.length === 0) {
                return { success: true, count: 0 };
            }

            const batch = this.#firebaseService.getFirestore().batch();
            const collection = this.#getCollection();

            notifications.forEach(notification => {
                const validation = notification.validate();
                if (validation.valid) {
                    const docRef = collection.doc();
                    batch.set(docRef, notification.toFirestore());
                }
            });

            await batch.commit();
            console.log(`✓ ${notifications.length} notificaciones creadas en lote`);
            
            return {
                success: true,
                count: notifications.length
            };
        } catch (error) {
            console.error('❌ Error al crear notificaciones en lote:', error);
            throw new Error(`No se pudieron crear las notificaciones: ${error.message}`);
        }
    }

    /**
     * Obtiene las notificaciones de un usuario
     * @async
     * @param {string} userId - ID del usuario
     * @param {Object} options - Opciones de filtrado
     * @returns {Promise<Array>} Array de Notification
     */
    async getByUser(userId, options = {}) {
        try {
            let query = this.#getCollection().where('userId', '==', userId);

            // Filtrar por estado si se especifica
            if (options.status) {
                query = query.where('status', '==', options.status);
            }

            // Filtrar por tipo si se especifica
            if (options.tipo) {
                query = query.where('tipo', '==', options.tipo);
            }

            // Ordenar por fecha (más recientes primero)
            query = query.orderBy('createdAt', 'desc');

            // Límite de resultados
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const snapshot = await query.get();
            const notifications = [];

            snapshot.forEach(doc => {
                notifications.push(Notification.fromFirestore(doc.id, doc.data()));
            });

            return notifications;
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
            await this.#getCollection().doc(notificationId).update({
                status: Notification.STATUS.LEIDA,
                readAt: new Date().toISOString()
            });

            console.log(`✓ Notificación ${notificationId} marcada como leída`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error al marcar notificación como leída:', error);
            throw new Error(`No se pudo marcar la notificación como leída: ${error.message}`);
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
            const snapshot = await this.#getCollection()
                .where('userId', '==', userId)
                .where('status', '==', Notification.STATUS.NO_LEIDA)
                .get();

            const batch = this.#firebaseService.getFirestore().batch();
            let count = 0;

            snapshot.forEach(doc => {
                batch.update(doc.ref, {
                    status: Notification.STATUS.LEIDA,
                    readAt: new Date().toISOString()
                });
                count++;
            });

            if (count > 0) {
                await batch.commit();
            }

            console.log(`✓ ${count} notificaciones marcadas como leídas`);
            return { success: true, count: count };
        } catch (error) {
            console.error('❌ Error al marcar notificaciones como leídas:', error);
            throw new Error(`No se pudieron marcar las notificaciones: ${error.message}`);
        }
    }

    /**
     * Elimina una notificación
     * @async
     * @param {string} notificationId - ID de la notificación
     * @returns {Promise<Object>} { success: boolean }
     */
    async delete(notificationId) {
        try {
            await this.#getCollection().doc(notificationId).delete();
            console.log(`✓ Notificación ${notificationId} eliminada`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error al eliminar notificación:', error);
            throw new Error(`No se pudo eliminar la notificación: ${error.message}`);
        }
    }

    /**
     * Obtiene el conteo de notificaciones no leídas de un usuario
     * @async
     * @param {string} userId - ID del usuario
     * @returns {Promise<number>} Número de notificaciones no leídas
     */
    async getUnreadCount(userId) {
        try {
            const snapshot = await this.#getCollection()
                .where('userId', '==', userId)
                .where('status', '==', Notification.STATUS.NO_LEIDA)
                .get();

            return snapshot.size;
        } catch (error) {
            console.error('❌ Error al obtener conteo de notificaciones:', error);
            return 0;
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationRepository;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.NotificationRepository = NotificationRepository;
}

