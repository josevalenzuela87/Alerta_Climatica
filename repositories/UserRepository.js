/**
 * ========================================
 * UserRepository - Capa de Acceso a Datos
 * ========================================
 * 
 * Repositorio que gestiona todas las operaciones de usuarios
 * con Firebase Firestore y Auth, proporcionando una capa de abstracción limpia.
 * 
 * @class UserRepository
 * @pattern Repository
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class UserRepository {
    /**
     * Instancia del FirebaseService (Singleton)
     * @private
     */
    #firebaseService;

    /**
     * Nombre de la colección en Firestore
     * @private
     */
    #collectionName = 'users';

    /**
     * Constructor
     * @param {FirebaseService} firebaseService - Instancia del servicio Firebase
     */
    constructor(firebaseService) {
        if (!firebaseService) {
            throw new Error('UserRepository requiere una instancia de FirebaseService');
        }
        this.#firebaseService = firebaseService;
        console.log('✓ UserRepository: Instancia creada');
    }

    /**
     * Obtiene la colección de usuarios
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
     * Crea o actualiza un usuario en Firestore
     * @async
     * @param {User} user - Instancia de User
     * @returns {Promise<User>} Usuario creado/actualizado
     */
    async save(user) {
        try {
            if (!user.uid) {
                throw new Error('UID de usuario requerido');
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const data = user.toFirestore();
            await collection.doc(user.uid).set(data, { merge: true });
            
            console.log('✓ UserRepository: Usuario guardado:', user.uid);
            return user;

        } catch (error) {
            console.error('❌ Error al guardar usuario:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los usuarios con filtros opcionales
     * @async
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array<User>>} Array de usuarios
     */
    async getAll(filters = {}) {
        try {
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            // Obtener todos los usuarios de Firestore
            // Luego filtrar en el cliente para evitar índices compuestos
            const snapshot = await collection.get();
            let users = [];

            snapshot.forEach(doc => {
                const user = User.fromFirestore(doc.id, doc.data());
                users.push(user);
            });

            // Aplicar filtros en el cliente
            if (filters.activo !== undefined) {
                users = users.filter(u => u.activo === filters.activo);
            } else {
                // Por defecto solo activos
                users = users.filter(u => u.activo === true);
            }

            if (filters.role) {
                users = users.filter(u => u.role === filters.role);
            }

            if (filters.emailVerified !== undefined) {
                users = users.filter(u => u.emailVerified === filters.emailVerified);
            }

            // Ordenar en el cliente
            const orderBy = filters.orderBy || 'displayName';
            const orderDirection = filters.orderDirection || 'asc';
            
            users.sort((a, b) => {
                let aVal = a[orderBy] || '';
                let bVal = b[orderBy] || '';
                
                if (typeof aVal !== 'string') {
                    aVal = String(aVal);
                }
                if (typeof bVal !== 'string') {
                    bVal = String(bVal);
                }
                
                const comparison = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
                return orderDirection === 'asc' ? comparison : -comparison;
            });

            // Aplicar límite
            if (filters.limit) {
                users = users.slice(0, filters.limit);
            }

            console.log(`✓ UserRepository: ${users.length} usuarios obtenidos`);
            return users;

        } catch (error) {
            console.error('❌ Error al obtener usuarios:', error);
            throw error;
        }
    }

    /**
     * Obtiene un usuario por UID
     * @async
     * @param {string} uid - UID del usuario
     * @returns {Promise<User|null>} Usuario o null si no existe
     */
    async getById(uid) {
        try {
            if (!uid) {
                return null;
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const doc = await collection.doc(uid).get();

            if (!doc.exists) {
                // Si no existe en Firestore, intentar obtener desde Auth
                const auth = this.#firebaseService.getAuth();
                const authUser = auth.currentUser;
                
                if (authUser && authUser.uid === uid) {
                    // Crear usuario desde Auth y guardarlo en Firestore
                    const user = User.fromFirebase(authUser, {});
                    await this.save(user);
                    return user;
                }
                
                console.warn('⚠️ UserRepository: Usuario no encontrado:', uid);
                return null;
            }

            const user = User.fromFirestore(doc.id, doc.data());
            console.log('✓ UserRepository: Usuario obtenido:', uid);
            return user;

        } catch (error) {
            console.error('❌ Error al obtener usuario:', error);
            throw error;
        }
    }

    /**
     * Actualiza un usuario existente
     * @async
     * @param {string} uid - UID del usuario
     * @param {User} user - Instancia de User con datos actualizados
     * @returns {Promise<User>} Usuario actualizado
     */
    async update(uid, user) {
        try {
            if (!uid) {
                throw new Error('UID de usuario requerido');
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const data = user.toFirestore();
            await collection.doc(uid).update(data);

            console.log('✓ UserRepository: Usuario actualizado:', uid);
            
            user.uid = uid;
            return user;

        } catch (error) {
            console.error('❌ Error al actualizar usuario:', error);
            throw error;
        }
    }

    /**
     * Desactiva un usuario (soft delete)
     * @async
     * @param {string} uid - UID del usuario
     * @returns {Promise<boolean>} true si se desactivó correctamente
     */
    async deactivate(uid) {
        try {
            if (!uid) {
                throw new Error('UID de usuario requerido');
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            // Soft delete: marcar como inactivo
            await collection.doc(uid).update({
                activo: false,
                fechaActualizacion: new Date()
            });

            console.log('✓ UserRepository: Usuario desactivado:', uid);
            return true;

        } catch (error) {
            console.error('❌ Error al desactivar usuario:', error);
            throw error;
        }
    }

    /**
     * Elimina un usuario (hard delete - solo Firestore, no Auth)
     * @async
     * @param {string} uid - UID del usuario
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async delete(uid) {
        try {
            if (!uid) {
                throw new Error('UID de usuario requerido');
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            await collection.doc(uid).delete();

            console.log('✓ UserRepository: Usuario eliminado de Firestore:', uid);
            return true;

        } catch (error) {
            console.error('❌ Error al eliminar usuario:', error);
            throw error;
        }
    }

    /**
     * Busca usuarios por término
     * @async
     * @param {string} searchTerm - Término de búsqueda
     * @param {Object} filters - Filtros adicionales
     * @returns {Promise<Array<User>>} Array de usuarios encontrados
     */
    async search(searchTerm, filters = {}) {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return [];
            }

            const term = searchTerm.toLowerCase().trim();
            
            // Obtener todos los usuarios
            const allUsers = await this.getAll({ activo: undefined });

            const results = allUsers.filter(user => {
                const searchableText = [
                    user.email,
                    user.displayName,
                    user.uid
                ].join(' ').toLowerCase();

                return searchableText.includes(term);
            });

            console.log(`✓ UserRepository: ${results.length} usuarios encontrados para: "${searchTerm}"`);
            return results;

        } catch (error) {
            console.error('❌ Error al buscar usuarios:', error);
            throw error;
        }
    }

    /**
     * Actualiza el último acceso del usuario
     * @async
     * @param {string} uid - UID del usuario
     * @returns {Promise<boolean>} true si se actualizó correctamente
     */
    async updateLastAccess(uid) {
        try {
            if (!uid) {
                return false;
            }

            const collection = this.#getCollection();
            if (!collection) {
                return false;
            }

            await collection.doc(uid).update({
                ultimoAcceso: new Date(),
                fechaActualizacion: new Date()
            });

            return true;

        } catch (error) {
            console.error('❌ Error al actualizar último acceso:', error);
            return false;
        }
    }

    /**
     * Cambia el rol de un usuario
     * @async
     * @param {string} uid - UID del usuario
     * @param {string} role - Nuevo rol ('admin' o 'user')
     * @returns {Promise<boolean>} true si se actualizó correctamente
     */
    async changeRole(uid, role) {
        try {
            if (!uid || !role) {
                throw new Error('UID y rol son requeridos');
            }

            const rolesValidos = ['admin', 'user'];
            if (!rolesValidos.includes(role)) {
                throw new Error('Rol inválido');
            }

            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            await collection.doc(uid).update({
                role: role,
                fechaActualizacion: new Date()
            });

            console.log('✓ UserRepository: Rol actualizado:', uid, role);
            return true;

        } catch (error) {
            console.error('❌ Error al cambiar rol:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de usuarios
     * @async
     * @returns {Promise<Object>} Estadísticas
     */
    async getStatistics() {
        try {
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            const allUsers = await this.getAll({ activo: undefined });
            
            const stats = {
                total: allUsers.length,
                activos: allUsers.filter(u => u.activo).length,
                inactivos: allUsers.filter(u => !u.activo).length,
                porRol: {
                    admin: allUsers.filter(u => u.role === 'admin').length,
                    user: allUsers.filter(u => u.role === 'user').length
                },
                verificados: allUsers.filter(u => u.emailVerified).length,
                noVerificados: allUsers.filter(u => !u.emailVerified).length,
                conRegionesInteres: allUsers.filter(u => u.regionesInteres && u.regionesInteres.length > 0).length
            };

            console.log('✓ UserRepository: Estadísticas obtenidas');
            return stats;

        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error);
            throw error;
        }
    }

    /**
     * Observa cambios en tiempo real de usuarios
     * @param {Function} callback - Función a ejecutar cuando cambien los usuarios
     * @param {Object} filters - Filtros opcionales
     * @returns {Function} Función para cancelar la suscripción
     */
    onUsersChanged(callback, filters = {}) {
        try {
            const collection = this.#getCollection();
            if (!collection) {
                throw new Error('Firestore no está disponible');
            }

            // Suscribirse a cambios
            const unsubscribe = collection.onSnapshot(
                (snapshot) => {
                    const users = [];
                    snapshot.forEach(doc => {
                        const user = User.fromFirestore(doc.id, doc.data());
                        users.push(user);
                    });

                    // Aplicar filtros en el cliente
                    let filteredUsers = users;
                    if (filters.activo !== undefined) {
                        filteredUsers = filteredUsers.filter(u => u.activo === filters.activo);
                    }
                    if (filters.role) {
                        filteredUsers = filteredUsers.filter(u => u.role === filters.role);
                    }

                    callback(filteredUsers);
                },
                (error) => {
                    console.error('❌ Error en suscripción de usuarios:', error);
                    callback([]);
                }
            );

            return unsubscribe;

        } catch (error) {
            console.error('❌ Error al suscribirse a cambios:', error);
            return () => {}; // Retornar función vacía
        }
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserRepository;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.UserRepository = UserRepository;
}

