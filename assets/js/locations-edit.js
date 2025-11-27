/**
 * ========================================
 * Locations Edit Page - Script de Editar Ubicación
 * ========================================
 * 
 * Script que maneja la lógica de edición de ubicaciones.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let locationController = null;
let authController = null;
let currentLocationId = null;

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando edición de ubicación...');

        // Obtener ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        currentLocationId = urlParams.get('id');

        if (!currentLocationId) {
            showAlert('error', 'ID de ubicación no proporcionado');
            setTimeout(() => {
                window.location.href = 'list.html';
            }, 2000);
            return;
        }

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

        // 5. Cargar datos de la ubicación
        await loadLocation();

        // 6. Configurar formulario
        setupForm();

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
 * Carga los datos de la ubicación
 */
async function loadLocation() {
    try {
        const result = await locationController.getLocationById(currentLocationId);

        if (result.success && result.location) {
            fillForm(result.location);
        } else {
            showAlert('error', result.message || 'Ubicación no encontrada');
            setTimeout(() => {
                window.location.href = 'list.html';
            }, 2000);
        }
    } catch (error) {
        console.error('❌ Error al cargar ubicación:', error);
        showAlert('error', 'Error al cargar la ubicación');
    }
}

/**
 * Llena el formulario con los datos de la ubicación
 */
function fillForm(location) {
    // Ocultar loader y mostrar formulario
    const loadingDiv = document.getElementById('loadingLocation');
    const form = document.getElementById('editLocationForm');
    
    if (loadingDiv) loadingDiv.classList.add('d-none');
    if (form) form.classList.remove('d-none');

    // Llenar campos
    document.getElementById('nombre').value = location.nombre || '';
    document.getElementById('tipo').value = location.tipo || '';
    document.getElementById('codigo').value = location.codigo || '';
    document.getElementById('pais').value = location.pais || 'México';
    document.getElementById('estado').value = location.estado || '';
    document.getElementById('ciudad').value = location.ciudad || '';
    document.getElementById('municipio').value = location.municipio || '';
    
    // Coordenadas
    if (location.coordenadas) {
        document.getElementById('latitud').value = location.coordenadas.lat || '';
        document.getElementById('longitud').value = location.coordenadas.lng || '';
    }
    
    document.getElementById('poblacion').value = location.poblacion || '';
    document.getElementById('codigoPostal').value = location.codigoPostal || '';
    document.getElementById('descripcion').value = location.descripcion || '';
    document.getElementById('activa').checked = location.activa !== false;

    // Actualizar contadores
    updateCounters();
}

/**
 * Actualiza los contadores de caracteres
 */
function updateCounters() {
    const nombreCount = document.getElementById('nombre')?.value.length || 0;
    const descripcionCount = document.getElementById('descripcion')?.value.length || 0;
    
    const nombreCountEl = document.getElementById('nombreCount');
    const descripcionCountEl = document.getElementById('descripcionCount');
    
    if (nombreCountEl) nombreCountEl.textContent = nombreCount;
    if (descripcionCountEl) descripcionCountEl.textContent = descripcionCount;
}

/**
 * Configura el formulario
 */
function setupForm() {
    const form = document.getElementById('editLocationForm');
    
    if (!form) return;

    // Event listeners
    form.addEventListener('submit', handleSubmit);

    // Contadores de caracteres
    const nombreInput = document.getElementById('nombre');
    const descripcionInput = document.getElementById('descripcion');
    const codigoInput = document.getElementById('codigo');

    nombreInput?.addEventListener('input', () => {
        const count = nombreInput.value.length;
        document.getElementById('nombreCount').textContent = count;
    });

    descripcionInput?.addEventListener('input', () => {
        const count = descripcionInput.value.length;
        document.getElementById('descripcionCount').textContent = count;
    });

    // Convertir código a mayúsculas
    codigoInput?.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    // Logout
    document.getElementById('navbarLogoutBtn')?.addEventListener('click', handleLogout);
    
    // Cargar datos del usuario en navbar
    loadUserDataInNavbar();
}

/**
 * Maneja el envío del formulario
 */
async function handleSubmit(event) {
    event.preventDefault();

    // Limpiar mensajes
    clearAlert();
    clearFieldErrors();

    // Obtener datos del formulario
    const formData = {
        nombre: document.getElementById('nombre').value.trim(),
        tipo: document.getElementById('tipo').value,
        codigo: document.getElementById('codigo').value.trim().toUpperCase(),
        pais: document.getElementById('pais').value.trim() || 'México',
        estado: document.getElementById('estado').value.trim(),
        ciudad: document.getElementById('ciudad').value.trim(),
        municipio: document.getElementById('municipio').value.trim(),
        latitud: document.getElementById('latitud').value ? parseFloat(document.getElementById('latitud').value) : null,
        longitud: document.getElementById('longitud').value ? parseFloat(document.getElementById('longitud').value) : null,
        poblacion: document.getElementById('poblacion').value ? parseInt(document.getElementById('poblacion').value) : null,
        codigoPostal: document.getElementById('codigoPostal').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        activa: document.getElementById('activa').checked
    };

    // Construir coordenadas
    if (formData.latitud !== null && formData.longitud !== null) {
        formData.coordenadas = {
            lat: formData.latitud,
            lng: formData.longitud
        };
    } else {
        formData.coordenadas = { lat: null, lng: null };
    }

    // Eliminar latitud y longitud del objeto principal
    delete formData.latitud;
    delete formData.longitud;

    // Validar formulario HTML5
    const form = event.target;
    if (!form.checkValidity()) {
        event.stopPropagation();
        form.classList.add('was-validated');
        return;
    }

    // Deshabilitar botón
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';

    try {
        // Llamar al controlador
        const result = await locationController.updateLocation(currentLocationId, formData);

        if (result.success) {
            showAlert('success', '¡Ubicación actualizada exitosamente! Redirigiendo...');
            
            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = `list.html`;
            }, 1500);
        } else {
            // Mostrar errores
            showAlert('error', result.message || 'Error al actualizar ubicación');
            
            // Restaurar botón
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }

    } catch (error) {
        console.error('❌ Error al actualizar ubicación:', error);
        showAlert('error', 'Error inesperado. Por favor, intenta nuevamente.');
        
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Limpia errores de campos
 */
function clearFieldErrors() {
    const invalidFields = document.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });
}

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

    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertDiv.classList.remove('d-none');
    
    setTimeout(() => {
        alertDiv.classList.add('d-none');
    }, 5000);
}

function clearAlert() {
    const alertDiv = document.getElementById('alertMessage');
    if (alertDiv) {
        alertDiv.classList.add('d-none');
    }
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

