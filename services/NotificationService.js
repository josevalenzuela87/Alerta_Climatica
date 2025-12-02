/**
 * ========================================
 * NotificationService - Servicio de Notificaciones Push
 * ========================================
 * 
 * Maneja la inicialización y configuración de Firebase Cloud Messaging (FCM).
 * 
 * @class NotificationService
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class NotificationService {
    /**
     * Instancia de FirebaseService
     * @private
     */
    #firebaseService;

    /**
     * Instancia de NotificationController
     * @private
     */
    #notificationController;

    /**
     * Token FCM actual
     * @private
     */
    #currentToken = null;

    /**
     * Constructor
     * @param {FirebaseService} firebaseService - Instancia de FirebaseService
     * @param {NotificationController} notificationController - Instancia de NotificationController
     */
    constructor(firebaseService, notificationController) {
        if (!firebaseService) {
            throw new Error('NotificationService requiere FirebaseService');
        }
        if (!notificationController) {
            throw new Error('NotificationService requiere NotificationController');
        }
        this.#firebaseService = firebaseService;
        this.#notificationController = notificationController;
        console.log('✓ NotificationService: Instancia creada');
    }

    /**
     * Inicializa el servicio de notificaciones y solicita permisos
     * @async
     * @param {string} userId - ID del usuario actual
     * @returns {Promise<Object>} { success: boolean, token: string|null }
     */
    async initialize(userId) {
        try {
            // Verificar si el navegador soporta notificaciones
            if (!('Notification' in window)) {
                console.warn('⚠️ Este navegador no soporta notificaciones');
                return { success: false, message: 'Navegador no compatible' };
            }

            // Verificar si Firebase Messaging está disponible
            if (typeof firebase === 'undefined' || !firebase.messaging) {
                console.warn('⚠️ Firebase Messaging no está disponible');
                return { success: false, message: 'Firebase Messaging no disponible' };
            }

            // Obtener instancia de Messaging
            const messaging = firebase.messaging();
            
            // Solicitar permisos y obtener token
            try {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    console.log('✓ Permiso de notificaciones concedido');
                    
                    // Obtener token FCM
                    const token = await messaging.getToken({
                        vapidKey: this.#getVapidKey()
                    });
                    
                    if (token) {
                        this.#currentToken = token;
                        console.log('✓ Token FCM obtenido:', token.substring(0, 20) + '...');
                        
                        // Guardar token en Firestore
                        if (userId) {
                            await this.#notificationController.saveFCMToken(userId, token, {
                                userAgent: navigator.userAgent,
                                platform: navigator.platform,
                                language: navigator.language
                            });
                        }
                        
                        // Configurar listener para cuando se recibe un mensaje en foreground
                        messaging.onMessage((payload) => {
                            console.log('📨 Mensaje recibido en foreground:', payload);
                            this.#showNotification(payload);
                        });

                        // Configurar listener para cuando el token se actualiza
                        messaging.onTokenRefresh(async () => {
                            console.log('🔄 Token FCM actualizado');
                            const newToken = await messaging.getToken({
                                vapidKey: this.#getVapidKey()
                            });
                            if (newToken && userId) {
                                await this.#notificationController.saveFCMToken(userId, newToken);
                                this.#currentToken = newToken;
                            }
                        });

                        return { success: true, token: token };
                    } else {
                        console.warn('⚠️ No se pudo obtener token FCM');
                        return { success: false, message: 'No se pudo obtener token' };
                    }
                } else {
                    console.warn('⚠️ Permiso de notificaciones denegado');
                    return { success: false, message: 'Permiso denegado' };
                }
            } catch (error) {
                console.error('❌ Error al solicitar permisos:', error);
                return { success: false, message: error.message };
            }
        } catch (error) {
            console.error('❌ Error al inicializar NotificationService:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Obtiene la VAPID key desde la configuración
     * @private
     * @returns {string|null}
     */
    #getVapidKey() {
        // Intentar obtener VAPID key desde la configuración de Firebase
        if (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.VAPID_KEY) {
            return FIREBASE_CONFIG.VAPID_KEY;
        }
        // Si no está en la configuración, retornar null
        // Firebase intentará usar la key configurada en Firebase Console
        return null;
    }

    /**
     * Muestra una notificación cuando la app está en foreground
     * @private
     * @param {Object} payload - Payload del mensaje FCM
     */
    #showNotification(payload) {
        const notification = payload.notification || {};
        const title = notification.title || 'Nueva notificación';
        const body = notification.body || '';
        const icon = notification.icon || '/favicon.ico';

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, {
                    body: body,
                    icon: icon,
                    badge: '/favicon.ico',
                    tag: payload.data?.alertId || 'notification',
                    data: payload.data || {}
                });
            });
        } else {
            // Fallback: usar Notification API nativa
            new Notification(title, {
                body: body,
                icon: icon
            });
        }
    }

    /**
     * Obtiene el token FCM actual
     * @returns {string|null}
     */
    getToken() {
        return this.#currentToken;
    }

    /**
     * Elimina el token FCM del usuario
     * @async
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} { success: boolean }
     */
    async deleteToken(userId) {
        try {
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                const messaging = firebase.messaging();
                const token = this.#currentToken || await messaging.getToken();
                
                if (token) {
                    await messaging.deleteToken();
                    this.#currentToken = null;
                }
            }

            if (userId) {
                await this.#notificationController.deleteFCMToken(userId);
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Error al eliminar token:', error);
            throw new Error(`No se pudo eliminar el token: ${error.message}`);
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.NotificationService = NotificationService;
}

