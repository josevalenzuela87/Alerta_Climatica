/**
 * ========================================
 * UserController - Controlador de Usuarios
 * ========================================
 * 
 * Controlador que gestiona la lógica de negocio de usuarios.
 * Coordina entre la Vista (UI) y el Repositorio (Datos).
 * 
 * @class UserController
 * @pattern MVC - Controller
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class UserController {
    /**
     * Repositorio de usuarios
     * @private
     */
    #userRepository;

    /**
     * Instancia del FirebaseService
     * @private
     */
    #firebaseService;

    /**
     * Constructor
     * @param {UserRepository} userRepository - Instancia del repositorio
     * @param {FirebaseService} firebaseService - Instancia del servicio Firebase
     */
    constructor(userRepository, firebaseService) {
        if (!userRepository) {
            throw new Error('UserController requiere una instancia de UserRepository');
        }
        if (!firebaseService) {
            throw new Error('UserController requiere una instancia de FirebaseService');
        }
        this.#userRepository = userRepository;
        this.#firebaseService = firebaseService;
        console.log('✓ UserController: Instancia creada');
    }

    /**
     * Obtiene el usuario actual autenticado con datos de Firestore
     * @async
     * @returns {Promise<User|null>} Usuario actual o null
     */
    async getCurrentUser() {
        try {
            const auth = this.#firebaseService.getAuth();
            const authUser = auth.currentUser;

            if (!authUser) {
                return null;
            }

            // Obtener datos adicionales de Firestore
            const firestoreUser = await this.#userRepository.getById(authUser.uid);
            
            if (firestoreUser) {
                return firestoreUser;
            }

            // Si no existe en Firestore, crear desde Auth
            const user = User.fromFirebase(authUser, {});
            await this.#userRepository.save(user);
            return user;

        } catch (error) {
            console.error('❌ Error al obtener usuario actual:', error);
            return null;
        }
    }

    /**
     * Obtiene todos los usuarios con filtros opcionales
     * @async
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>} { success: boolean, users: Array, message: string }
     */
    async getAllUsers(filters = {}) {
        try {
            console.log('→ UserController: Obteniendo usuarios...');

            const users = await this.#userRepository.getAll(filters);

            return {
                success: true,
                users: users,
                message: `${users.length} usuarios encontrados`
            };

        } catch (error) {
            console.error('❌ Error al obtener usuarios:', error);
            return {
                success: false,
                users: [],
                message: `Error al obtener usuarios: ${error.message}`
            };
        }
    }

    /**
     * Obtiene un usuario por ID
     * @async
     * @param {string} userId - UID del usuario
     * @returns {Promise<Object>} { success: boolean, user: User, message: string }
     */
    async getUserById(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    user: null,
                    message: 'ID de usuario requerido'
                };
            }

            const user = await this.#userRepository.getById(userId);

            if (!user) {
                return {
                    success: false,
                    user: null,
                    message: 'Usuario no encontrado'
                };
            }

            return {
                success: true,
                user: user,
                message: 'Usuario obtenido exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al obtener usuario:', error);
            return {
                success: false,
                user: null,
                message: `Error al obtener usuario: ${error.message}`
            };
        }
    }

    /**
     * Actualiza el perfil del usuario actual
     * @async
     * @param {Object} userData - Datos actualizados
     * @param {boolean} requireAdmin - Si true, solo admins pueden actualizar (por defecto false, permite preferencias)
     * @returns {Promise<Object>} { success: boolean, user: User, message: string }
     */
    async updateProfile(userData, requireAdmin = false) {
        try {
            console.log('→ UserController: Actualizando perfil...');

            const auth = this.#firebaseService.getAuth();
            const authUser = auth.currentUser;

            if (!authUser) {
                return {
                    success: false,
                    user: null,
                    message: 'Usuario no autenticado'
                };
            }

            // Obtener usuario actual
            let user = await this.getCurrentUser();
            if (!user) {
                return {
                    success: false,
                    user: null,
                    message: 'No se pudo obtener el usuario actual'
                };
            }

            // Si se requiere admin, verificar permisos
            if (requireAdmin && !user.isAdmin()) {
                return {
                    success: false,
                    user: null,
                    message: 'Solo los administradores pueden actualizar esta información'
                };
            }

            // Actualizar datos permitidos
            // Solo admins pueden cambiar nombre y foto (si requireAdmin es true)
            if (userData.displayName !== undefined) {
                if (requireAdmin && !user.isAdmin()) {
                    // Si se requiere admin y no es admin, no permitir cambio
                    return {
                        success: false,
                        user: null,
                        message: 'Solo los administradores pueden cambiar el nombre'
                    };
                }
                user.displayName = userData.displayName.trim();
                
                // Actualizar también en Firebase Auth
                await authUser.updateProfile({
                    displayName: user.displayName
                });
            }

            // Todos los usuarios pueden cambiar su propia foto de perfil
            if (userData.photoURL !== undefined) {
                user.photoURL = userData.photoURL;
                
                // Actualizar también en Firebase Auth
                await authUser.updateProfile({
                    photoURL: user.photoURL
                });
            }

            // Preferencias y regiones: cualquier usuario puede actualizarlas
            if (userData.preferenciasNotificaciones !== undefined) {
                user.preferenciasNotificaciones = {
                    ...user.preferenciasNotificaciones,
                    ...userData.preferenciasNotificaciones
                };
            }

            if (userData.regionesInteres !== undefined) {
                user.regionesInteres = userData.regionesInteres;
            }

            // Guardar en Firestore
            const updatedUser = await this.#userRepository.update(authUser.uid, user);

            return {
                success: true,
                user: updatedUser,
                message: 'Perfil actualizado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al actualizar perfil:', error);
            return {
                success: false,
                user: null,
                message: `Error al actualizar perfil: ${error.message}`
            };
        }
    }

    /**
     * Actualiza el perfil de un usuario específico (solo para administradores)
     * @async
     * @param {string} userId - ID del usuario a actualizar
     * @param {Object} userData - Datos actualizados
     * @returns {Promise<Object>} { success: boolean, user: User, message: string }
     */
    async updateUserProfile(userId, userData) {
        try {
            console.log('→ UserController: Actualizando perfil de usuario:', userId);

            const auth = this.#firebaseService.getAuth();
            const authUser = auth.currentUser;

            if (!authUser) {
                return {
                    success: false,
                    user: null,
                    message: 'Usuario no autenticado'
                };
            }

            // Obtener usuario actual (administrador)
            const currentUser = await this.getCurrentUser();
            if (!currentUser || !currentUser.isAdmin()) {
                return {
                    success: false,
                    user: null,
                    message: 'Solo los administradores pueden actualizar otros usuarios'
                };
            }

            // Obtener usuario a actualizar
            let user = await this.#userRepository.getById(userId);
            if (!user) {
                return {
                    success: false,
                    user: null,
                    message: 'Usuario no encontrado'
                };
            }

            // Actualizar datos
            if (userData.displayName !== undefined) {
                user.displayName = userData.displayName.trim();
            }

            if (userData.photoURL !== undefined) {
                user.photoURL = userData.photoURL;
            }

            if (userData.preferenciasNotificaciones !== undefined) {
                user.preferenciasNotificaciones = {
                    ...user.preferenciasNotificaciones,
                    ...userData.preferenciasNotificaciones
                };
            }

            if (userData.regionesInteres !== undefined) {
                user.regionesInteres = userData.regionesInteres;
            }

            // Guardar en Firestore
            const updatedUser = await this.#userRepository.update(userId, user);

            return {
                success: true,
                user: updatedUser,
                message: 'Perfil de usuario actualizado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al actualizar perfil de usuario:', error);
            return {
                success: false,
                user: null,
                message: `Error al actualizar perfil: ${error.message}`
            };
        }
    }

    /**
     * Cambia la contraseña del usuario actual
     * @async
     * @param {string} newPassword - Nueva contraseña
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async changePassword(newPassword) {
        try {
            const auth = this.#firebaseService.getAuth();
            const authUser = auth.currentUser;

            if (!authUser) {
                return {
                    success: false,
                    message: 'Usuario no autenticado'
                };
            }

            // Validar contraseña
            const validation = Validator.validatePassword(newPassword);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.errors.join(', ')
                };
            }

            // Actualizar contraseña en Firebase Auth
            await authUser.updatePassword(newPassword);

            return {
                success: true,
                message: 'Contraseña actualizada exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al cambiar contraseña:', error);
            
            let message = 'Error al cambiar contraseña';
            if (error.code === 'auth/requires-recent-login') {
                message = 'Por seguridad, debes iniciar sesión nuevamente antes de cambiar tu contraseña';
            }
            
            return {
                success: false,
                message: message
            };
        }
    }

    /**
     * Actualiza un usuario (solo admin)
     * @async
     * @param {string} userId - UID del usuario
     * @param {Object} userData - Datos actualizados
     * @returns {Promise<Object>} { success: boolean, user: User, message: string }
     */
    async updateUser(userId, userData) {
        try {
            console.log('→ UserController: Actualizando usuario...');

            if (!userId) {
                return {
                    success: false,
                    user: null,
                    message: 'ID de usuario requerido'
                };
            }

            // Verificar permisos de admin
            const currentUser = await this.getCurrentUser();
            if (!currentUser || !currentUser.isAdmin()) {
                return {
                    success: false,
                    user: null,
                    message: 'No tienes permisos para realizar esta acción'
                };
            }

            // Obtener usuario existente
            const existingUser = await this.#userRepository.getById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    user: null,
                    message: 'Usuario no encontrado'
                };
            }

            // Actualizar datos permitidos
            if (userData.role !== undefined) {
                existingUser.role = userData.role;
            }
            if (userData.activo !== undefined) {
                existingUser.activo = userData.activo;
            }
            if (userData.displayName !== undefined) {
                existingUser.displayName = userData.displayName.trim();
            }

            // Guardar en Firestore
            const updatedUser = await this.#userRepository.update(userId, existingUser);

            return {
                success: true,
                user: updatedUser,
                message: 'Usuario actualizado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al actualizar usuario:', error);
            return {
                success: false,
                user: null,
                message: `Error al actualizar usuario: ${error.message}`
            };
        }
    }

    /**
     * Desactiva un usuario (solo admin)
     * @async
     * @param {string} userId - UID del usuario
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async deactivateUser(userId) {
        try {
            console.log('→ UserController: Desactivando usuario...');

            // Verificar permisos de admin
            const currentUser = await this.getCurrentUser();
            if (!currentUser || !currentUser.isAdmin()) {
                return {
                    success: false,
                    message: 'No tienes permisos para realizar esta acción'
                };
            }

            if (!userId) {
                return {
                    success: false,
                    message: 'ID de usuario requerido'
                };
            }

            // No permitir desactivarse a sí mismo
            if (userId === currentUser.uid) {
                return {
                    success: false,
                    message: 'No puedes desactivar tu propia cuenta'
                };
            }

            await this.#userRepository.deactivate(userId);

            return {
                success: true,
                message: 'Usuario desactivado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al desactivar usuario:', error);
            return {
                success: false,
                message: `Error al desactivar usuario: ${error.message}`
            };
        }
    }

    /**
     * Cambia el rol de un usuario (solo admin)
     * @async
     * @param {string} userId - UID del usuario
     * @param {string} role - Nuevo rol
     * @returns {Promise<Object>} { success: boolean, message: string }
     */
    async changeUserRole(userId, role) {
        try {
            console.log('→ UserController: Cambiando rol de usuario...');

            // Verificar permisos de admin
            const currentUser = await this.getCurrentUser();
            if (!currentUser || !currentUser.isAdmin()) {
                return {
                    success: false,
                    message: 'No tienes permisos para realizar esta acción'
                };
            }

            if (!userId || !role) {
                return {
                    success: false,
                    message: 'ID de usuario y rol son requeridos'
                };
            }

            // No permitir cambiar su propio rol
            if (userId === currentUser.uid) {
                return {
                    success: false,
                    message: 'No puedes cambiar tu propio rol'
                };
            }

            await this.#userRepository.changeRole(userId, role);

            return {
                success: true,
                message: 'Rol actualizado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al cambiar rol:', error);
            return {
                success: false,
                message: `Error al cambiar rol: ${error.message}`
            };
        }
    }

    /**
     * Busca usuarios por término
     * @async
     * @param {string} searchTerm - Término de búsqueda
     * @param {Object} filters - Filtros adicionales
     * @returns {Promise<Object>} { success: boolean, users: Array, message: string }
     */
    async searchUsers(searchTerm, filters = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return {
                    success: false,
                    users: [],
                    message: 'El término de búsqueda debe tener al menos 2 caracteres'
                };
            }

            const users = await this.#userRepository.search(searchTerm, filters);

            return {
                success: true,
                users: users,
                message: `${users.length} usuarios encontrados`
            };

        } catch (error) {
            console.error('❌ Error al buscar usuarios:', error);
            return {
                success: false,
                users: [],
                message: `Error al buscar usuarios: ${error.message}`
            };
        }
    }

    /**
     * Obtiene estadísticas de usuarios
     * @async
     * @returns {Promise<Object>} { success: boolean, stats: Object, message: string }
     */
    async getStatistics() {
        try {
            const stats = await this.#userRepository.getStatistics();

            return {
                success: true,
                stats: stats,
                message: 'Estadísticas obtenidas exitosamente'
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
     * Verifica si el usuario actual es administrador
     * @async
     * @returns {Promise<boolean>}
     */
    async isCurrentUserAdmin() {
        try {
            const user = await this.getCurrentUser();
            return user ? user.isAdmin() : false;
        } catch (error) {
            console.error('❌ Error al verificar rol:', error);
            return false;
        }
    }

    /**
     * Observa cambios en tiempo real de usuarios
     * @param {Function} callback - Función a ejecutar cuando cambien los usuarios
     * @param {Object} filters - Filtros opcionales
     * @returns {Function} Función para cancelar la suscripción
     */
    onUsersChanged(callback, filters = {}) {
        return this.#userRepository.onUsersChanged(callback, filters);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserController;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.UserController = UserController;
}

