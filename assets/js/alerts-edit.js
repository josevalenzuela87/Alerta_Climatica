/**
 * ========================================
 * Alerts Edit Page - Script de Edición de Alerta
 * ========================================
 * 
 * Script que maneja la lógica de edición de alertas.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let alertController = null;
let authController = null;
let locationController = null;
let currentAlert = null;
let alertId = null;
let allLocations = [];

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando edición de alerta...');

        // Verificar dependencias
        if (!checkDependencies()) {
            hideLoading();
            return;
        }

        showLoading();

        // 1. Obtener ID de alerta de la URL
        const urlParams = new URLSearchParams(window.location.search);
        alertId = urlParams.get('id');

        if (!alertId) {
            showError('No se especificó un ID de alerta');
            hideLoading();
            return;
        }

        // 2. Cargar variables de entorno
        const config = await EnvLoader.loadEnv();
        
        if (!EnvLoader.validateConfig(config)) {
            showError('Error de configuración. Por favor, configura tu archivo firebase-config.js correctamente.');
            hideLoading();
            return;
        }

        // 3. Inicializar servicios
        const firebaseService = FirebaseService.getInstance();
        await firebaseService.initialize(config);

        // 4. Verificar autenticación
        const authRepository = new AuthRepository(firebaseService);
        authController = new AuthController(authRepository);

        if (!authController.isAuthenticated()) {
            window.location.replace('../login.html');
            return;
        }

        // 5. Crear controlador de alertas
        const alertRepository = new AlertRepository(firebaseService);
        alertController = new AlertController(alertRepository);

        // 6. Crear controlador de ubicaciones
        const locationRepository = new LocationRepository(firebaseService);
        locationController = new LocationController(locationRepository);

        console.log('✓ Aplicación inicializada correctamente');

        // 7. Cargar ubicaciones
        await loadLocations();

        // 8. Cargar alerta y llenar formulario
        await loadAlert();

        // 9. Configurar formulario
        setupForm();

        hideLoading();

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showError('Error al inicializar la aplicación. Por favor, recarga la página.');
        hideLoading();
    }
}

/**
 * Verifica dependencias
 */
function checkDependencies() {
    const required = {
        'EnvLoader': typeof EnvLoader !== 'undefined',
        'Alert': typeof Alert !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'AlertRepository': typeof AlertRepository !== 'undefined',
        'AlertController': typeof AlertController !== 'undefined',
        'LocationRepository': typeof LocationRepository !== 'undefined',
        'LocationController': typeof LocationController !== 'undefined'
    };

    const missing = Object.keys(required).filter(dep => !required[dep]);
    
    if (missing.length > 0) {
        console.error('❌ Dependencias faltantes:', missing);
        console.error('💡 Solución: Presiona Ctrl+Shift+R para recargar o limpia la caché del navegador');
        return false;
    }
    
    console.log('✓ Todas las dependencias cargadas correctamente');
    return true;
}

/**
 * Carga las ubicaciones disponibles
 */
async function loadLocations() {
    try {
        console.log('→ Cargando ubicaciones...');
        
        const result = await locationController.getAllLocations();
        
        if (result.success && result.locations) {
            allLocations = result.locations.filter(loc => loc.activa);
            populateLocationSelect();
            console.log(`✓ ${allLocations.length} ubicaciones cargadas`);
        } else {
            console.warn('⚠️ No se pudieron cargar ubicaciones');
            showLocationError();
        }
    } catch (error) {
        console.error('❌ Error al cargar ubicaciones:', error);
        showLocationError();
    }
}

/**
 * Llena el select con las ubicaciones disponibles
 */
function populateLocationSelect() {
    const select = document.getElementById('ubicacion');
    if (!select) return;

    // Limpiar opciones existentes
    select.innerHTML = '';

    if (allLocations.length === 0) {
        select.innerHTML = '<option value="">No hay ubicaciones disponibles</option>';
        select.disabled = true;
        return;
    }

    // Agregar opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecciona una ubicación';
    select.appendChild(defaultOption);

    // Agregar ubicaciones
    allLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = `${location.nombre} - ${location.ciudad}, ${location.estado}`;
        select.appendChild(option);
    });

    select.disabled = false;
}

/**
 * Muestra un mensaje de error si no se pueden cargar ubicaciones
 */
function showLocationError() {
    const select = document.getElementById('ubicacion');
    if (select) {
        select.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
        select.disabled = true;
    }
}

/**
 * Carga la alerta desde Firestore
 */
async function loadAlert() {
    try {
        const result = await alertController.getAlertById(alertId);

        if (result.success && result.alert) {
            currentAlert = result.alert;
            
            // Verificar que el usuario es el creador
            const currentUser = authController.getCurrentUser();
            if (currentAlert.createdBy !== currentUser.uid) {
                showError('No tienes permiso para editar esta alerta');
                setTimeout(() => {
                    window.location.href = `detail.html?id=${alertId}`;
                }, 2000);
                return;
            }

            fillForm();
        } else {
            showError('Alerta no encontrada');
            setTimeout(() => {
                window.location.href = 'list.html';
            }, 2000);
        }
    } catch (error) {
        console.error('❌ Error al cargar alerta:', error);
        showError('Error al cargar la alerta');
    }
}

/**
 * Llena el formulario con los datos de la alerta
 */
function fillForm() {
    if (!currentAlert) return;

    // Título
    document.getElementById('titulo').value = currentAlert.titulo;
    updateCharacterCount('titulo', 'tituloCount');

    // Descripción
    document.getElementById('descripcion').value = currentAlert.descripcion;
    updateCharacterCount('descripcion', 'descripcionCount');

    // Tipo
    document.getElementById('tipo').value = currentAlert.tipo;

    // Severidad
    document.getElementById('severidad').value = currentAlert.severidad;

    // Estado
    document.getElementById('status').value = currentAlert.status;

    // Fecha de inicio
    if (currentAlert.fechaInicio) {
        const fechaInicio = new Date(currentAlert.fechaInicio);
        const fechaInicioLocal = new Date(fechaInicio.getTime() - fechaInicio.getTimezoneOffset() * 60000);
        document.getElementById('fechaInicio').value = fechaInicioLocal.toISOString().slice(0, 16);
    }

    // Fecha de fin
    if (currentAlert.fechaFin) {
        const fechaFin = new Date(currentAlert.fechaFin);
        const fechaFinLocal = new Date(fechaFin.getTime() - fechaFin.getTimezoneOffset() * 60000);
        document.getElementById('fechaFin').value = fechaFinLocal.toISOString().slice(0, 16);
    }

    // Ubicación - seleccionar la ubicación actual si existe
    const ubicacionSelect = document.getElementById('ubicacion');
    if (ubicacionSelect && currentAlert.ubicaciones && currentAlert.ubicaciones.length > 0) {
        // Seleccionar la primera ubicación (si hay múltiples, se toma la primera)
        ubicacionSelect.value = currentAlert.ubicaciones[0];
    } else if (ubicacionSelect && allLocations.length > 0) {
        // Si no hay ubicaciones asignadas pero hay región/ciudad (compatibilidad), buscar coincidencia
        if (currentAlert.region && currentAlert.ciudad) {
            const matchingLocation = allLocations.find(loc => 
                loc.estado === currentAlert.region && loc.ciudad === currentAlert.ciudad
            );
            if (matchingLocation) {
                ubicacionSelect.value = matchingLocation.id;
            }
        }
    }

    // Recomendaciones
    if (currentAlert.recomendaciones && currentAlert.recomendaciones.length > 0) {
        document.getElementById('recomendaciones').value = currentAlert.recomendaciones.join('\n');
    }
}

/**
 * Configura el formulario
 */
function setupForm() {
    const form = document.getElementById('editAlertForm');
    
    if (!form) return;

    // Event listeners
    form.addEventListener('submit', handleSubmit);

    // Contadores de caracteres
    const tituloInput = document.getElementById('titulo');
    const descripcionInput = document.getElementById('descripcion');

    tituloInput?.addEventListener('input', () => {
        updateCharacterCount('titulo', 'tituloCount');
    });

    descripcionInput?.addEventListener('input', () => {
        updateCharacterCount('descripcion', 'descripcionCount');
    });

    // Logout
    // Logout (puede estar en navbar o en sidebar)
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('navbarLogoutBtn')?.addEventListener('click', handleLogout);
    
    // Cargar datos del usuario en navbar
    loadUserDataInNavbar();
}

/**
 * Actualiza el contador de caracteres
 */
function updateCharacterCount(inputId, countId) {
    const input = document.getElementById(inputId);
    const countElement = document.getElementById(countId);
    if (input && countElement) {
        countElement.textContent = input.value.length;
    }
}

/**
 * Maneja el envío del formulario
 */
async function handleSubmit(event) {
    event.preventDefault();

    // Limpiar mensajes
    clearAlert();
    clearFieldErrors();

    // Validar ubicación seleccionada
    const ubicacionId = document.getElementById('ubicacion').value;
    if (!ubicacionId) {
        showAlert('error', 'Debes seleccionar una ubicación');
        document.getElementById('ubicacion').focus();
        return;
    }

    // Buscar la ubicación seleccionada para obtener región y ciudad (compatibilidad)
    const ubicacionSeleccionada = allLocations.find(loc => loc.id === ubicacionId);

    // Obtener datos del formulario
    const formData = {
        titulo: document.getElementById('titulo').value,
        descripcion: document.getElementById('descripcion').value,
        tipo: document.getElementById('tipo').value,
        severidad: document.getElementById('severidad').value,
        status: document.getElementById('status').value,
        ubicaciones: [ubicacionId], // Array de IDs de ubicaciones
        region: ubicacionSeleccionada ? ubicacionSeleccionada.estado : '',
        ciudad: ubicacionSeleccionada ? ubicacionSeleccionada.ciudad : '',
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaFin: document.getElementById('fechaFin').value || null,
        recomendaciones: document.getElementById('recomendaciones').value
    };

    // Validar formulario HTML5
    const form = event.target;
    if (!form.checkValidity()) {
        event.stopPropagation();
        form.classList.add('was-validated');
        return;
    }

    // Convertir fechas a ISO
    if (formData.fechaInicio) {
        formData.fechaInicio = new Date(formData.fechaInicio).toISOString();
    }

    if (formData.fechaFin) {
        formData.fechaFin = new Date(formData.fechaFin).toISOString();
    }

    // Deshabilitar botón
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';

    try {
        // Llamar al controlador
        const result = await alertController.updateAlert(alertId, formData);

        if (result.success) {
            showAlert('success', '¡Alerta actualizada exitosamente! Redirigiendo...');
            
            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = `detail.html?id=${alertId}`;
            }, 1500);
        } else {
            // Mostrar errores
            if (result.errors) {
                showFieldErrors(result.errors);
            }
            showAlert('error', result.message);
            
            // Restaurar botón
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }

    } catch (error) {
        console.error('❌ Error al actualizar alerta:', error);
        showAlert('error', 'Error inesperado. Por favor, intenta nuevamente.');
        
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Muestra errores en campos específicos
 */
function showFieldErrors(errors) {
    Object.keys(errors).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.parentElement.querySelector('.invalid-feedback') || field.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.textContent = errors[fieldId];
            }
        }
    });
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
 * Maneja el logout
 */
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

async function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        await authController.logout();
        window.location.href = '../../index.html';
    }
}

/**
 * Utilidades
 */
function showAlert(type, message) {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
        ${message}
    `;
    alertDiv.classList.remove('d-none');
    
    setTimeout(() => {
        alertDiv.classList.add('d-none');
    }, 5000);
}

function showError(message) {
    showAlert('error', message);
}

function clearAlert() {
    const alertDiv = document.getElementById('alertMessage');
    if (alertDiv) {
        alertDiv.classList.add('d-none');
    }
}

function showLoading() {
    document.getElementById('loadingSpinner')?.classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingSpinner')?.classList.add('d-none');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

