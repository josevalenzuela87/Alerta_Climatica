/**
 * ========================================
 * users-list.js - Gestión de Lista de Usuarios
 * ========================================
 * 
 * Script para la vista de lista de usuarios (solo admin)
 * 
 */

// Verificar dependencias
function checkDependencies() {
    const required = [
        'EnvLoader',
        'FirebaseService',
        'AuthRepository',
        'UserRepository',
        'UserController',
        'User',
        'AuthController'
    ];
    
    const missing = required.filter(name => typeof window[name] === 'undefined');
    
    if (missing.length > 0) {
        console.error('❌ Faltan dependencias:', missing);
        return false;
    }
    
    return true;
}

// Variables globales
let firebaseService;
let userRepository;
let userController;
let authController;
let currentUser;
let allUsers = [];
let filteredUsers = [];

// Inicializar aplicación
async function initializeApp() {
    try {
        console.log('→ Inicializando lista de usuarios...');

        // Esperar un momento para que se carguen todos los scripts
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verificar dependencias
        if (!checkDependencies()) {
            console.warn('⚠️ Esperando dependencias...');
            // Esperar un poco más y verificar nuevamente
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!checkDependencies()) {
                throw new Error('Faltan dependencias críticas. Por favor, recarga la página.');
            }
        }

        // 1. Cargar variables de entorno
        let config;
        if (typeof EnvLoader !== 'undefined') {
            config = await EnvLoader.loadEnv();
            if (!EnvLoader.validateConfig(config)) {
                throw new Error('Error de configuración. Por favor, configura tu archivo firebase-config.js correctamente.');
            }
        } else {
            // Si no hay EnvLoader, intentar usar firebaseConfig directamente
            if (typeof firebaseConfig !== 'undefined') {
                config = {
                    FIREBASE_API_KEY: firebaseConfig.apiKey,
                    FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
                    FIREBASE_PROJECT_ID: firebaseConfig.projectId,
                    FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
                    FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
                    FIREBASE_APP_ID: firebaseConfig.appId
                };
            } else {
                throw new Error('No se encontró configuración de Firebase. Verifica que firebase-config.js esté cargado.');
            }
        }

        // 2. Inicializar Firebase
        firebaseService = FirebaseService.getInstance();
        await firebaseService.initialize(config);

        // Crear instancias
        userRepository = new UserRepository(firebaseService);
        userController = new UserController(userRepository, firebaseService);
        authController = new AuthController(new AuthRepository(firebaseService));

        // Verificar autenticación
        const auth = firebaseService.getAuth();
        auth.onAuthStateChanged(async (authUser) => {
            if (!authUser) {
                window.location.replace('../login.html');
                return;
            }

            // Obtener usuario actual con datos completos
            currentUser = await userController.getCurrentUser();
            if (!currentUser) {
                window.location.replace('../login.html');
                return;
            }

            // Verificar si es admin
            if (!currentUser.isAdmin()) {
                document.getElementById('adminContent').classList.add('d-none');
                document.getElementById('accessDeniedAlert').classList.remove('d-none');
                return;
            }

            // Configurar navbar
            setupNavbar();

            // Cargar datos
            await loadUsers();
            await loadStatistics();

            // Configurar eventos
            setupEvents();

            console.log('✓ Lista de usuarios inicializada correctamente');
        });

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showAlert('Error al inicializar la aplicación. Por favor, recarga la página.', 'danger');
    }
}

// Configurar navbar
function setupNavbar() {
    if (!currentUser) return;

    const navbarUserName = document.getElementById('navbarUserName');
    const navbarUserEmail = document.getElementById('navbarUserEmail');
    const navbarLogoutBtn = document.getElementById('navbarLogoutBtn');

    if (navbarUserName) navbarUserName.textContent = currentUser.displayName || 'Usuario';
    if (navbarUserEmail) navbarUserEmail.textContent = currentUser.email || '';

    if (navbarLogoutBtn) {
        navbarLogoutBtn.addEventListener('click', async () => {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                await handleLogout();
            }
        });
    }
}

// Manejar logout
async function handleLogout() {
    try {
        showLoading(true);
        const result = await authController.logout();
        
        if (result.success) {
            window.location.replace('../login.html');
        } else {
            showAlert('Error al cerrar sesión. Por favor, intenta nuevamente.', 'danger');
        }
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        showAlert('Error al cerrar sesión.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Cargar usuarios
async function loadUsers() {
    try {
        showLoading(true);
        
        const result = await userController.getAllUsers({ activo: undefined });
        
        if (result.success) {
            allUsers = result.users;
            filteredUsers = [...allUsers];
            renderUsers();
            updateUsersCount();
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        console.error('❌ Error al cargar usuarios:', error);
        showAlert('Error al cargar usuarios. Por favor, recarga la página.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Cargar estadísticas
async function loadStatistics() {
    try {
        const result = await userController.getStatistics();
        
        if (result.success && result.stats) {
            const stats = result.stats;
            
            document.getElementById('statTotal').textContent = stats.total || 0;
            document.getElementById('statActivos').textContent = stats.activos || 0;
            document.getElementById('statAdmins').textContent = stats.porRol?.admin || 0;
            document.getElementById('statVerificados').textContent = stats.verificados || 0;
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
    }
}

// Renderizar usuarios en la tabla
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) return;

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">No se encontraron usuarios</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredUsers.map(user => {
        const roleBadge = user.role === 'admin' 
            ? '<span class="badge bg-danger">Administrador</span>'
            : '<span class="badge bg-secondary">Usuario</span>';
        
        const estadoBadge = user.activo
            ? '<span class="badge bg-success">Activo</span>'
            : '<span class="badge bg-secondary">Inactivo</span>';
        
        const verifiedBadge = user.emailVerified
            ? '<span class="badge bg-info">Verificado</span>'
            : '<span class="badge bg-warning">No verificado</span>';

        const ultimoAcceso = user.ultimoAcceso 
            ? new Date(user.ultimoAcceso).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'Nunca';

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-user-circle fa-2x me-2 text-primary"></i>
                        <div>
                            <div class="fw-semibold">${escapeHtml(user.displayName || 'Sin nombre')}</div>
                            <small class="text-muted">ID: ${user.uid.substring(0, 8)}...</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div>${escapeHtml(user.email)}</div>
                    ${user.emailVerified ? '<small class="text-success"><i class="fas fa-check-circle"></i></small>' : ''}
                </td>
                <td>${roleBadge}</td>
                <td>${estadoBadge}</td>
                <td>${verifiedBadge}</td>
                <td><small>${ultimoAcceso}</small></td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="viewUserDetails('${user.uid}')" 
                                title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${user.uid !== currentUser.uid ? `
                            <button type="button" class="btn btn-outline-${user.activo ? 'warning' : 'success'}" 
                                    onclick="toggleUserStatus('${user.uid}', ${!user.activo})" 
                                    title="${user.activo ? 'Desactivar' : 'Activar'}">
                                <i class="fas fa-${user.activo ? 'ban' : 'check'}"></i>
                            </button>
                            <button type="button" class="btn btn-outline-info" 
                                    onclick="changeUserRole('${user.uid}', '${user.role === 'admin' ? 'user' : 'admin'}')" 
                                    title="Cambiar rol a ${user.role === 'admin' ? 'Usuario' : 'Administrador'}">
                                <i class="fas fa-user-shield"></i>
                            </button>
                        ` : '<span class="badge bg-secondary">Tu cuenta</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Actualizar contador de usuarios
function updateUsersCount() {
    const countElement = document.getElementById('usersCount');
    if (countElement) {
        countElement.textContent = `${filteredUsers.length} usuario${filteredUsers.length !== 1 ? 's' : ''}`;
    }
}

// Configurar eventos
function setupEvents() {
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Filtros
    const filterRol = document.getElementById('filterRol');
    const filterEstado = document.getElementById('filterEstado');
    
    if (filterRol) {
        filterRol.addEventListener('change', applyFilters);
    }
    
    if (filterEstado) {
        filterEstado.addEventListener('change', applyFilters);
    }

    // Limpiar filtros
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
}

// Manejar búsqueda
async function handleSearch(event) {
    const searchTerm = event.target.value.trim();
    
    if (searchTerm.length < 2 && searchTerm.length > 0) {
        return;
    }

    if (searchTerm.length === 0) {
        applyFilters();
        return;
    }

    try {
        const result = await userController.searchUsers(searchTerm);
        
        if (result.success) {
            filteredUsers = result.users;
            applyFilters(); // Aplicar filtros adicionales si existen
        }
    } catch (error) {
        console.error('❌ Error al buscar usuarios:', error);
    }
}

// Aplicar filtros
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const filterRol = document.getElementById('filterRol').value;
    const filterEstado = document.getElementById('filterEstado').value;

    filteredUsers = allUsers.filter(user => {
        // Filtro de búsqueda
        if (searchTerm.length >= 2) {
            const searchableText = [
                user.email,
                user.displayName,
                user.uid
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Filtro de rol
        if (filterRol && user.role !== filterRol) {
            return false;
        }

        // Filtro de estado
        if (filterEstado && String(user.activo) !== filterEstado) {
            return false;
        }

        return true;
    });

    renderUsers();
    updateUsersCount();
}

// Limpiar filtros
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterRol').value = '';
    document.getElementById('filterEstado').value = '';
    filteredUsers = [...allUsers];
    renderUsers();
    updateUsersCount();
}

// Cambiar estado de usuario
async function toggleUserStatus(userId, newStatus) {
    if (!confirm(`¿Estás seguro de que deseas ${newStatus ? 'activar' : 'desactivar'} este usuario?`)) {
        return;
    }

    try {
        showLoading(true);
        
        const result = await userController.updateUser(userId, { activo: newStatus });
        
        if (result.success) {
            showAlert(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success');
            await loadUsers();
            await loadStatistics();
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        console.error('❌ Error al cambiar estado:', error);
        showAlert('Error al cambiar el estado del usuario', 'danger');
    } finally {
        showLoading(false);
    }
}

// Cambiar rol de usuario
async function changeUserRole(userId, newRole) {
    const roleLabel = newRole === 'admin' ? 'Administrador' : 'Usuario';
    
    if (!confirm(`¿Estás seguro de que deseas cambiar el rol de este usuario a ${roleLabel}?`)) {
        return;
    }

    try {
        showLoading(true);
        
        const result = await userController.changeUserRole(userId, newRole);
        
        if (result.success) {
            showAlert(`Rol actualizado a ${roleLabel} exitosamente`, 'success');
            await loadUsers();
            await loadStatistics();
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        console.error('❌ Error al cambiar rol:', error);
        showAlert('Error al cambiar el rol del usuario', 'danger');
    } finally {
        showLoading(false);
    }
}

// Ver detalles de usuario
function viewUserDetails(userId) {
    // Redirigir a la vista de detalles del usuario
    window.location.href = `detail.html?id=${userId}`;
}

// Mostrar alerta
function showAlert(message, type = 'info') {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    setTimeout(() => {
        alertDiv.classList.add('d-none');
    }, 5000);
}

// Mostrar/ocultar loading
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

