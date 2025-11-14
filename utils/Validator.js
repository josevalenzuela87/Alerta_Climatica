/**
 * ========================================
 * Validator - Utilidad de Validación
 * ========================================
 * 
 * Utilidad para validar entradas de usuario siguiendo
 * principios de Codificación Segura.
 * 
 * Principios de Codificación Segura:
 * - Validación estricta de todas las entradas
 * - Prevención de inyecciones
 * - Mensajes de error descriptivos
 * - Validaciones del lado del cliente
 * 
 * @class Validator
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class Validator {
    /**
     * Expresiones regulares para validación
     * @static
     * @private
     */
    static #patterns = {
        // Email según RFC 5322 (simplificado pero robusto)
        email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        
        // Nombre: letras, espacios, acentos, guiones
        name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]{2,50}$/,
        
        // Al menos una letra y un número (opcional: símbolo)
        strongPassword: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/
    };

    /**
     * Valida un correo electrónico
     * @static
     * @param {string} email - Email a validar
     * @returns {Object} { valid: boolean, message: string }
     */
    static validateEmail(email) {
        // Verificar que no esté vacío
        if (!email || email.trim() === '') {
            return {
                valid: false,
                message: 'El correo electrónico es requerido'
            };
        }

        // Eliminar espacios
        email = email.trim();

        // Verificar longitud
        if (email.length > 254) {
            return {
                valid: false,
                message: 'El correo electrónico es demasiado largo'
            };
        }

        // Validar formato
        if (!this.#patterns.email.test(email)) {
            return {
                valid: false,
                message: 'El formato del correo electrónico no es válido'
            };
        }

        return {
            valid: true,
            message: 'Email válido'
        };
    }

    /**
     * Valida una contraseña
     * @static
     * @param {string} password - Contraseña a validar
     * @param {Object} options - Opciones de validación
     * @returns {Object} { valid: boolean, message: string }
     */
    static validatePassword(password, options = {}) {
        const {
            minLength = 6,
            requireStrong = false
        } = options;

        // Verificar que no esté vacía
        if (!password) {
            return {
                valid: false,
                message: 'La contraseña es requerida'
            };
        }

        // Verificar longitud mínima
        if (password.length < minLength) {
            return {
                valid: false,
                message: `La contraseña debe tener al menos ${minLength} caracteres`
            };
        }

        // Verificar longitud máxima (seguridad)
        if (password.length > 128) {
            return {
                valid: false,
                message: 'La contraseña es demasiado larga'
            };
        }

        // Si se requiere contraseña fuerte
        if (requireStrong && !this.#patterns.strongPassword.test(password)) {
            return {
                valid: false,
                message: 'La contraseña debe contener al menos una letra y un número'
            };
        }

        return {
            valid: true,
            message: 'Contraseña válida'
        };
    }

    /**
     * Valida que dos contraseñas coincidan
     * @static
     * @param {string} password - Contraseña original
     * @param {string} confirmPassword - Confirmación de contraseña
     * @returns {Object} { valid: boolean, message: string }
     */
    static validatePasswordMatch(password, confirmPassword) {
        if (!confirmPassword) {
            return {
                valid: false,
                message: 'Debes confirmar tu contraseña'
            };
        }

        if (password !== confirmPassword) {
            return {
                valid: false,
                message: 'Las contraseñas no coinciden'
            };
        }

        return {
            valid: true,
            message: 'Las contraseñas coinciden'
        };
    }

    /**
     * Valida un nombre completo
     * @static
     * @param {string} name - Nombre a validar
     * @returns {Object} { valid: boolean, message: string }
     */
    static validateName(name) {
        // Verificar que no esté vacío
        if (!name || name.trim() === '') {
            return {
                valid: false,
                message: 'El nombre es requerido'
            };
        }

        // Eliminar espacios extras
        name = name.trim();

        // Verificar longitud
        if (name.length < 2) {
            return {
                valid: false,
                message: 'El nombre es demasiado corto'
            };
        }

        if (name.length > 50) {
            return {
                valid: false,
                message: 'El nombre es demasiado largo'
            };
        }

        // Validar formato
        if (!this.#patterns.name.test(name)) {
            return {
                valid: false,
                message: 'El nombre solo puede contener letras, espacios y guiones'
            };
        }

        return {
            valid: true,
            message: 'Nombre válido'
        };
    }

    /**
     * Sanitiza una cadena de texto (prevención XSS básica)
     * @static
     * @param {string} input - Texto a sanitizar
     * @returns {string} Texto sanitizado
     */
    static sanitize(input) {
        if (typeof input !== 'string') {
            return input;
        }

        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Valida un formulario completo de registro
     * @static
     * @param {Object} data - Datos del formulario
     * @returns {Object} { valid: boolean, errors: Object }
     */
    static validateRegistrationForm(data) {
        const errors = {};

        // Validar nombre
        const nameValidation = this.validateName(data.fullName);
        if (!nameValidation.valid) {
            errors.fullName = nameValidation.message;
        }

        // Validar email
        const emailValidation = this.validateEmail(data.email);
        if (!emailValidation.valid) {
            errors.email = emailValidation.message;
        }

        // Validar contraseña
        const passwordValidation = this.validatePassword(data.password);
        if (!passwordValidation.valid) {
            errors.password = passwordValidation.message;
        }

        // Validar coincidencia de contraseñas
        if (data.confirmPassword !== undefined) {
            const matchValidation = this.validatePasswordMatch(data.password, data.confirmPassword);
            if (!matchValidation.valid) {
                errors.confirmPassword = matchValidation.message;
            }
        }

        // Validar términos y condiciones
        if (data.acceptTerms !== undefined && !data.acceptTerms) {
            errors.acceptTerms = 'Debes aceptar los términos y condiciones';
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    /**
     * Valida un formulario completo de login
     * @static
     * @param {Object} data - Datos del formulario
     * @returns {Object} { valid: boolean, errors: Object }
     */
    static validateLoginForm(data) {
        const errors = {};

        // Validar email
        const emailValidation = this.validateEmail(data.email);
        if (!emailValidation.valid) {
            errors.email = emailValidation.message;
        }

        // Validar contraseña
        if (!data.password) {
            errors.password = 'La contraseña es requerida';
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors: errors
        };
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validator;
}

