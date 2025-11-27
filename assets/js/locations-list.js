/**
 * ========================================
 * Locations List Page - Script de Lista de Ubicaciones
 * ========================================
 * 
 * Script que maneja la lógica de la lista de ubicaciones
 * con filtros y búsqueda en tiempo real.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let locationController = null;
let authController = null;
let allLocations = [];
let filteredLocations = [];

/**
 * Carga datos del usuario en el navbar
 */
function loadUserDataInNavbar() {
    try {
        if (!authController) return;
        
        const user = authController.getCurrentUser();
        if (user) {
            const userNameElement = document.getElementById('navbarUserName');
            const userEmailElement = document.getElementById('navbarUserEmail');
            
            if (userNameElement) userNameElement.textContent = user.displayName || 'Usuario';
            if (userEmailElement) userEmailElement.textContent = user.email;
        }
    } catch (error) {
        console.error('❌ Error al cargar datos en navbar:', error);
    }
}

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando lista de ubicaciones...');

        // Verificar dependencias
        if (!checkDependencies()) {
            hideLoading();
            return;
        }

        showLoading();

        // 1. Cargar variables de entorno
        const config = await EnvLoader.loadEnv();
        
        if (!EnvLoader.validateConfig(config)) {
            showAlert('error', 'Error de configuración. Por favor, configura tu archivo .env correctamente.');
            hideLoading();
            return;
        }

        // 2. Inicializar servicios
        const firebaseService = FirebaseService.getInstance();
        await firebaseService.initialize(config);

        // 3. Verificar autenticación
        const authRepository = new AuthRepository(firebaseService);
        authController = new AuthController(authRepository);

        if (!authController.isAuthenticated()) {
            window.location.href = '../login.html';
            return;
        }

        // 4. Crear controlador de ubicaciones
        const locationRepository = new LocationRepository(firebaseService);
        locationController = new LocationController(locationRepository);

        console.log('✓ Aplicación inicializada correctamente');

        // 5. Configurar event listeners
        setupEventListeners();

        // 6. Cargar datos del usuario en navbar
        loadUserDataInNavbar();

        // 7. Cargar ubicaciones
        await loadLocations();

        // 8. Cargar estadísticas
        await loadStatistics();

        // 9. Configurar actualización en tiempo real
        setupRealtimeUpdates();

        hideLoading();

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showAlert('error', 'Error al inicializar la aplicación. Por favor, recarga la página.');
        hideLoading();
    }
}

/**
 * Verifica dependencias
 */
function checkDependencies() {
    const required = {
        'EnvLoader': typeof EnvLoader !== 'undefined',
        'Location': typeof Location !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'LocationRepository': typeof LocationRepository !== 'undefined',
        'LocationController': typeof LocationController !== 'undefined'
    };

    const missing = Object.keys(required).filter(dep => !required[dep]);
    
    if (missing.length > 0) {
        console.error('❌ Dependencias faltantes:', missing);
        alert('Error: No se pudieron cargar todos los archivos necesarios.\n\nDependencias faltantes: ' + missing.join(', '));
        return false;
    }
    
    console.log('✓ Todas las dependencias cargadas correctamente');
    return true;
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Filtros
    document.getElementById('filterTipo')?.addEventListener('change', applyFilters);
    document.getElementById('filterEstado')?.addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);

    // Búsqueda
    document.getElementById('searchInput')?.addEventListener('input', debounce(handleSearch, 300));

    // Logout
    document.getElementById('navbarLogoutBtn')?.addEventListener('click', handleLogout);
}

/**
 * Carga las ubicaciones desde Firestore
 */
async function loadLocations() {
    try {
        showLoading();

        const result = await locationController.getAllLocations();

        if (result.success) {
            allLocations = result.locations;
            filteredLocations = [...allLocations];
            renderLocations();
            updateLocationsCount();
        } else {
            showAlert('error', result.message || 'Error al cargar ubicaciones');
            renderEmptyState();
        }

        hideLoading();
    } catch (error) {
        console.error('❌ Error al cargar ubicaciones:', error);
        showAlert('error', 'Error al cargar ubicaciones. Por favor, recarga la página.');
        hideLoading();
    }
}

/**
 * Carga las estadísticas
 */
async function loadStatistics() {
    try {
        const result = await locationController.getStatistics();

        if (result.success && result.stats) {
            const stats = result.stats;
            
            document.getElementById('statTotal').textContent = stats.total || 0;
            document.getElementById('statActivas').textContent = stats.activas || 0;
            document.getElementById('statConMapa').textContent = stats.conCoordenadas || 0;
            document.getElementById('statEstados').textContent = stats.porTipo?.estado || 0;
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
    }
}

/**
 * Renderiza las ubicaciones en la tabla
 */
function renderLocations() {
    const tbody = document.getElementById('locationsTableBody');
    
    if (!tbody) return;

    if (filteredLocations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">No se encontraron ubicaciones</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredLocations.map(location => {
        const coordenadasText = location.hasCoordinates() 
            ? `${location.coordenadas.lat.toFixed(4)}, ${location.coordenadas.lng.toFixed(4)}`
            : '<span class="text-muted">Sin coordenadas</span>';

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(location.nombre)}</strong>
                </td>
                <td>
                    <span class="badge bg-info">${location.getTypeLabel()}</span>
                </td>
                <td>
                    <code>${escapeHtml(location.codigo || '-')}</code>
                </td>
                <td>
                    <small>${escapeHtml(location.getFullName())}</small>
                </td>
                <td>
                    <small>${coordenadasText}</small>
                </td>
                <td>
                    ${location.activa 
                        ? '<span class="badge bg-success">Activa</span>'
                        : '<span class="badge bg-secondary">Inactiva</span>'
                    }
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <a href="edit.html?id=${location.id}" class="btn btn-outline-primary" title="Editar">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button 
                            class="btn btn-outline-danger" 
                            onclick="handleDelete('${location.id}', '${escapeHtml(location.nombre)}')"
                            title="Eliminar"
                        >
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Renderiza estado vacío
 */
function renderEmptyState() {
    const tbody = document.getElementById('locationsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">No hay ubicaciones disponibles</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Aplica filtros
 */
function applyFilters() {
    const tipoFilter = document.getElementById('filterTipo')?.value || '';
    const estadoFilter = document.getElementById('filterEstado')?.value || '';

    filteredLocations = allLocations.filter(location => {
        const tipoMatch = !tipoFilter || location.tipo === tipoFilter;
        const estadoMatch = !estadoFilter || location.activa.toString() === estadoFilter;
        
        return tipoMatch && estadoMatch;
    });

    renderLocations();
    updateLocationsCount();
}

/**
 * Maneja la búsqueda
 */
async function handleSearch(event) {
    const searchTerm = event.target.value.trim();

    if (searchTerm.length < 2) {
        applyFilters();
        return;
    }

    try {
        const result = await locationController.searchLocations(searchTerm);
        
        if (result.success) {
            // Aplicar filtros adicionales a los resultados de búsqueda
            const tipoFilter = document.getElementById('filterTipo')?.value || '';
            const estadoFilter = document.getElementById('filterEstado')?.value || '';

            filteredLocations = result.locations.filter(location => {
                const tipoMatch = !tipoFilter || location.tipo === tipoFilter;
                const estadoMatch = !estadoFilter || location.activa.toString() === estadoFilter;
                return tipoMatch && estadoMatch;
            });

            renderLocations();
            updateLocationsCount();
        }
    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
    }
}

/**
 * Limpia los filtros
 */
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterTipo').value = '';
    document.getElementById('filterEstado').value = '';
    
    filteredLocations = [...allLocations];
    renderLocations();
    updateLocationsCount();
}

/**
 * Actualiza el contador de ubicaciones
 */
function updateLocationsCount() {
    const countElement = document.getElementById('locationsCount');
    if (countElement) {
        const count = filteredLocations.length;
        countElement.textContent = `${count} ${count === 1 ? 'ubicación' : 'ubicaciones'}`;
    }
}

/**
 * Maneja la eliminación de una ubicación
 */
async function handleDelete(locationId, locationName) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la ubicación "${locationName}"?\n\nEsto marcará la ubicación como inactiva.`)) {
        return;
    }

    try {
        showLoading();

        const result = await locationController.deleteLocation(locationId);

        if (result.success) {
            showAlert('success', 'Ubicación eliminada exitosamente');
            
            // Recargar ubicaciones
            await loadLocations();
            await loadStatistics();
        } else {
            showAlert('error', result.message || 'Error al eliminar ubicación');
        }

        hideLoading();
    } catch (error) {
        console.error('❌ Error al eliminar ubicación:', error);
        showAlert('error', 'Error al eliminar ubicación');
        hideLoading();
    }
}

/**
 * Maneja el logout
 */
async function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        try {
            await authController.logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('❌ Error en logout:', error);
        }
    }
}

/**
 * Utilidades
 */
function showAlert(type, message) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertDiv.classList.remove('d-none');

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        alertDiv.classList.add('d-none');
    }, 5000);
}

function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.remove('d-none');
    }
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('d-none');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Configura actualización en tiempo real
 */
function setupRealtimeUpdates() {
    if (!locationController) return;

    // Suscribirse a cambios en tiempo real
    locationController.onLocationsChanged((locations) => {
        allLocations = locations;
        applyFilters(); // Reaplica filtros con los nuevos datos
        loadStatistics();
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

