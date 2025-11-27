/**
 * ========================================
 * Alerts Create Page - Script de Crear Alerta
 * ========================================
 * 
 * Script que maneja la lógica de creación de alertas.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let alertController = null;
let authController = null;

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando creación de alerta...');

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

        // 4. Crear controlador de alertas
        const alertRepository = new AlertRepository(firebaseService);
        alertController = new AlertController(alertRepository);

        console.log('✓ Aplicación inicializada correctamente');

        // 5. Configurar formulario
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
        'Alert': typeof Alert !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'AlertRepository': typeof AlertRepository !== 'undefined',
        'AlertController': typeof AlertController !== 'undefined'
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
 * Configura el formulario
 */
function setupForm() {
    const form = document.getElementById('createAlertForm');
    
    if (!form) return;

    // Event listeners
    form.addEventListener('submit', handleSubmit);

    // Contadores de caracteres
    const tituloInput = document.getElementById('titulo');
    const descripcionInput = document.getElementById('descripcion');

    tituloInput?.addEventListener('input', () => {
        const count = tituloInput.value.length;
        document.getElementById('tituloCount').textContent = count;
    });

    descripcionInput?.addEventListener('input', () => {
        const count = descripcionInput.value.length;
        document.getElementById('descripcionCount').textContent = count;
    });

    // Establecer fecha actual por defecto
    const fechaInicioInput = document.getElementById('fechaInicio');
    if (fechaInicioInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        fechaInicioInput.value = now.toISOString().slice(0, 16);
    }

    // Logout
    // Logout (puede estar en navbar o en sidebar)
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
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
        titulo: document.getElementById('titulo').value,
        descripcion: document.getElementById('descripcion').value,
        tipo: document.getElementById('tipo').value,
        severidad: document.getElementById('severidad').value,
        region: document.getElementById('region').value,
        ciudad: document.getElementById('ciudad').value,
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

    // Convertir fecha de inicio a ISO
    if (formData.fechaInicio) {
        formData.fechaInicio = new Date(formData.fechaInicio).toISOString();
    }

    // Convertir fecha de fin a ISO si existe
    if (formData.fechaFin) {
        formData.fechaFin = new Date(formData.fechaFin).toISOString();
    }

    // Deshabilitar botón
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creando...';

    try {
        // Llamar al controlador
        const result = await alertController.createAlert(formData);

        if (result.success) {
            showAlert('success', '¡Alerta creada exitosamente! Redirigiendo...');
            
            // Limpiar formulario
            form.reset();
            
            // Redirigir después de 2 segundos
            setTimeout(() => {
                window.location.href = `detail.html?id=${result.id}`;
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
        console.error('❌ Error al crear alerta:', error);
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

