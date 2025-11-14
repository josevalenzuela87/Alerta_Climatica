/**
 * ========================================
 * ENV Loader - Cargador de Variables de Entorno
 * ========================================
 * 
 * Este módulo simula la carga de variables de entorno
 * en el navegador, ya que .env no está disponible nativamente
 * en JavaScript del lado del cliente.
 * 
 * IMPORTANTE: En producción, usa variables de entorno
 * del servidor o un sistema de gestión de secretos.
 * 
 * @module EnvLoader
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class EnvLoader {
    /**
     * Carga las variables de entorno desde el archivo .env
     * NOTA: Este es un enfoque educativo. En producción real,
     * usa variables de entorno del servidor o Firebase Hosting config.
     */
    static async loadEnv() {
        try {
            // Intenta cargar el archivo .env
            const response = await fetch('../.env');
            
            if (!response.ok) {
                console.warn('⚠️ No se encontró archivo .env. Usando configuración de ejemplo.');
                return this.getExampleConfig();
            }

            const text = await response.text();
            const config = {};

            // Parse del archivo .env
            text.split('\n').forEach(line => {
                line = line.trim();
                
                // Ignora comentarios y líneas vacías
                if (line.startsWith('#') || !line) return;
                
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').trim();
                
                if (key && value) {
                    config[key.trim()] = value;
                }
            });

            return config;
        } catch (error) {
            console.error('❌ Error cargando .env:', error);
            return this.getExampleConfig();
        }
    }

    /**
     * Retorna configuración de ejemplo para desarrollo
     * IMPORTANTE: Reemplaza con tus credenciales reales
     */
    static getExampleConfig() {
        return {
            FIREBASE_API_KEY: 'tu_api_key_aqui',
            FIREBASE_AUTH_DOMAIN: 'tu_proyecto.firebaseapp.com',
            FIREBASE_PROJECT_ID: 'tu_proyecto_id',
            FIREBASE_STORAGE_BUCKET: 'tu_proyecto.appspot.com',
            FIREBASE_MESSAGING_SENDER_ID: '123456789',
            FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
            FIREBASE_MEASUREMENT_ID: 'G-XXXXXXXXXX'
        };
    }

    /**
     * Valida que todas las variables requeridas estén presentes
     * @param {Object} config - Configuración cargada
     * @returns {boolean} - True si la configuración es válida
     */
    static validateConfig(config) {
        const requiredKeys = [
            'FIREBASE_API_KEY',
            'FIREBASE_AUTH_DOMAIN',
            'FIREBASE_PROJECT_ID',
            'FIREBASE_STORAGE_BUCKET',
            'FIREBASE_MESSAGING_SENDER_ID',
            'FIREBASE_APP_ID'
        ];

        const missingKeys = requiredKeys.filter(key => !config[key] || config[key].includes('tu_'));

        if (missingKeys.length > 0) {
            console.error('❌ Faltan variables de entorno:', missingKeys);
            console.warn('⚠️ Por favor, configura tu archivo .env con credenciales reales de Firebase');
            return false;
        }

        return true;
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvLoader;
}

