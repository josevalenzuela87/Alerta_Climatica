/**
 * ========================================
 * RoleManager - Gestor de Roles y Permisos
 * ========================================
 * 
 * Utilidad para gestionar roles y permisos de usuarios.
 * Proporciona funciones centralizadas para verificar permisos.
 * 
 * @class RoleManager
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class RoleManager {
    /**
     * Roles disponibles en el sistema
     * @static
     */
    static ROLES = {
        ADMIN: 'admin',
        USER: 'user'
    };

    /**
     * Etiquetas de roles para mostrar en la UI
     * @static
     */
    static ROLE_LABELS = {
        'admin': 'Administrador',
        'user': 'Usuario'
    };

    /**
     * Permisos por rol
     * @static
     */
    static PERMISSIONS = {
        admin: [
            'manage_users',        // Gestionar usuarios (CRUD completo)
            'manage_alerts',       // Gestionar alertas
            'manage_locations',    // Gestionar ubicaciones
            'view_statistics',     // Ver estadísticas
            'view_reports',        // Ver reportes
            'manage_settings',     // Gestionar configuración
            'edit_own_profile',    // Editar su propio perfil
            'change_user_roles',   // Cambiar roles de usuarios
            'activate_deactivate_users', // Activar/desactivar usuarios
            'delete_users'         // Eliminar usuarios
        ],
        user: [
            'view_alerts',         // Ver alertas
            'view_locations',      // Ver ubicaciones
            'edit_own_profile',    // Editar su propio perfil
            'change_own_password', // Cambiar su propia contraseña
            'manage_own_preferences' // Gestionar sus propias preferencias
        ]
    };

    /**
     * Verifica si un usuario tiene un permiso específico
     * @static
     * @param {User|string} user - Instancia de User o string con el rol
     * @param {string} permission - Nombre del permiso a verificar
     * @returns {boolean} True si el usuario tiene el permiso
     */
    static hasPermission(user, permission) {
        const role = typeof user === 'string' ? user : (user?.role || 'user');
        const permissions = this.PERMISSIONS[role] || [];
        return permissions.includes(permission);
    }

    /**
     * Verifica si un usuario tiene alguno de los permisos especificados
     * @static
     * @param {User|string} user - Instancia de User o string con el rol
     * @param {string[]} permissions - Array de permisos a verificar
     * @returns {boolean} True si el usuario tiene al menos uno de los permisos
     */
    static hasAnyPermission(user, permissions) {
        return permissions.some(permission => this.hasPermission(user, permission));
    }

    /**
     * Verifica si un usuario tiene todos los permisos especificados
     * @static
     * @param {User|string} user - Instancia de User o string con el rol
     * @param {string[]} permissions - Array de permisos a verificar
     * @returns {boolean} True si el usuario tiene todos los permisos
     */
    static hasAllPermissions(user, permissions) {
        return permissions.every(permission => this.hasPermission(user, permission));
    }

    /**
     * Verifica si un usuario es administrador
     * @static
     * @param {User|string} user - Instancia de User o string con el rol
     * @returns {boolean} True si el usuario es administrador
     */
    static isAdmin(user) {
        const role = typeof user === 'string' ? user : (user?.role || 'user');
        return role === this.ROLES.ADMIN;
    }

    /**
     * Verifica si un usuario es un usuario normal
     * @static
     * @param {User|string} user - Instancia de User o string con el rol
     * @returns {boolean} True si el usuario es un usuario normal
     */
    static isUser(user) {
        const role = typeof user === 'string' ? user : (user?.role || 'user');
        return role === this.ROLES.USER;
    }

    /**
     * Obtiene la etiqueta legible de un rol
     * @static
     * @param {string} role - Rol a obtener etiqueta
     * @returns {string} Etiqueta del rol
     */
    static getRoleLabel(role) {
        return this.ROLE_LABELS[role] || role;
    }

    /**
     * Obtiene todos los permisos de un rol
     * @static
     * @param {string} role - Rol del cual obtener permisos
     * @returns {string[]} Array de permisos
     */
    static getRolePermissions(role) {
        return this.PERMISSIONS[role] || [];
    }

    /**
     * Verifica si un rol es válido
     * @static
     * @param {string} role - Rol a validar
     * @returns {boolean} True si el rol es válido
     */
    static isValidRole(role) {
        return Object.values(this.ROLES).includes(role);
    }

    /**
     * Obtiene todos los roles disponibles
     * @static
     * @returns {string[]} Array de roles
     */
    static getAvailableRoles() {
        return Object.values(this.ROLES);
    }

    /**
     * Obtiene información completa de un rol
     * @static
     * @param {string} role - Rol del cual obtener información
     * @returns {Object} Información del rol
     */
    static getRoleInfo(role) {
        return {
            role: role,
            label: this.getRoleLabel(role),
            permissions: this.getRolePermissions(role),
            isValid: this.isValidRole(role)
        };
    }

    /**
     * Protege una función para que solo se ejecute si el usuario tiene el permiso
     * @static
     * @param {User} user - Usuario a verificar
     * @param {string|string[]} permission - Permiso(s) requerido(s)
     * @param {Function} callback - Función a ejecutar si tiene permiso
     * @param {Function} onDenied - Función a ejecutar si no tiene permiso (opcional)
     * @returns {*} Resultado de la función callback o null
     */
    static requirePermission(user, permission, callback, onDenied = null) {
        const hasAccess = Array.isArray(permission) 
            ? this.hasAnyPermission(user, permission)
            : this.hasPermission(user, permission);

        if (hasAccess) {
            return callback();
        } else {
            if (onDenied) {
                return onDenied();
            }
            console.warn(`⚠️ Acceso denegado: Usuario no tiene permiso '${permission}'`);
            return null;
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoleManager;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.RoleManager = RoleManager;
}

