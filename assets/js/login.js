/**
 * ========================================
 * Login Page - Script de Inicio de Sesión
 * ========================================
 * 
 * Script que maneja la lógica de la página de login.
 * Inicializa Firebase, crea las instancias necesarias y
 * gestiona el formulario de inicio de sesión.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let authController = null;

/**
 * Verifica que todas las dependencias estén cargadas
 */
function checkDependencies() {
    const required = {
        'EnvLoader': typeof EnvLoader !== 'undefined',
        'Validator': typeof Validator !== 'undefined',
        'FirebaseService': typeof FirebaseService !== 'undefined',
        'AuthRepository': typeof AuthRepository !== 'undefined',
        'AuthController': typeof AuthController !== 'undefined'
    };

    const missing = Object.keys(required).filter(dep => !required[dep]);
    
    if (missing.length > 0) {
        console.error('❌ Dependencias faltantes:', missing);
        alert('Error: No se pudieron cargar todos los archivos necesarios.\n\nDependencias faltantes: ' + missing.join(', ') + '\n\nPor favor:\n1. Presiona Ctrl+Shift+R para recargar\n2. O limpia la caché del navegador');
        return false;
    }
    
    console.log('✓ Todas las dependencias cargadas correctamente');
    return true;
}

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando aplicación de login...');

        // Verificar dependencias
        if (!checkDependencies()) {
            hideLoading();
            return;
        }

        // Mostrar spinner
        showLoading();

        // 1. Cargar variables de entorno
        const config = await EnvLoader.loadEnv();
        
        // 2. Validar configuración
        if (!EnvLoader.validateConfig(config)) {
            showAlert('error', 'Error de configuración. Por favor, configura tu archivo .env correctamente.');
            hideLoading();
            return;
        }

        // 3. Obtener instancia Singleton de FirebaseService
        const firebaseService = FirebaseService.getInstance();
        
        // 4. Inicializar Firebase
        await firebaseService.initialize(config);

        // 5. Crear instancias siguiendo la arquitectura
        const authRepository = new AuthRepository(firebaseService);
        authController = new AuthController(authRepository);

        console.log('✓ Aplicación inicializada correctamente');

        // 6. Verificar si ya hay sesión activa
        if (authController.isAuthenticated()) {
            console.log('⚠️ Usuario ya autenticado, redirigiendo...');
            window.location.href = 'dashboard.html';
            return;
        }

        // 7. Configurar event listeners
        setupEventListeners();

        // 8. Autocompletar email si estaba guardado
        loadRememberedEmail();

        hideLoading();

    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
        showAlert('error', 'Error al inicializar la aplicación. Por favor, recarga la página.');
        hideLoading();
    }
}

/**
 * Configura los event listeners del formulario
 */
function setupEventListeners() {
    // Formulario de login
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }

    // Toggle de contraseña
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            togglePasswordVisibility('password', togglePassword);
        });
    }

    // Validación en tiempo real
    setupRealtimeValidation();
}

/**
 * Maneja el envío del formulario de login
 */
async function handleLogin(event) {
    event.preventDefault();

    // Limpiar mensajes anteriores
    clearAlert();
    clearFieldErrors();

    // Obtener datos del formulario
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        rememberMe: document.getElementById('rememberMe').checked
    };

    // Deshabilitar botón y mostrar loading
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Iniciando sesión...';

    try {
        // Llamar al controlador
        const result = await authController.login(formData);

        if (result.success) {
            // Guardar email si "Recordarme" está marcado
            if (formData.rememberMe) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // Mostrar mensaje de éxito
            showAlert('success', '¡Inicio de sesión exitoso! Redirigiendo...');
            
            // Limpiar formulario
            event.target.reset();

            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = result.data.redirectTo;
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
        console.error('❌ Error en login:', error);
        showAlert('error', 'Error inesperado. Por favor, intenta nuevamente.');
        
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

/**
 * Configura validación en tiempo real
 */
function setupRealtimeValidation() {
    // Validar email al perder el foco
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const validation = Validator.validateEmail(emailInput.value);
            if (!validation.valid && emailInput.value) {
                showFieldError('email', validation.message);
            } else {
                clearFieldError('email');
            }
        });
    }

    // Limpiar errores al escribir
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearFieldError(input.id);
            clearAlert();
        });
    });
}

/**
 * Carga el email guardado si existe
 */
function loadRememberedEmail() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        const emailInput = document.getElementById('email');
        const rememberMeCheckbox = document.getElementById('rememberMe');
        
        if (emailInput) {
            emailInput.value = rememberedEmail;
        }
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
}

/**
 * Alterna la visibilidad de la contraseña
 */
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Muestra una alerta en la página
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
    
    // Scroll al mensaje
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Limpia la alerta
 */
function clearAlert() {
    const alertDiv = document.getElementById('alertMessage');
    if (alertDiv) {
        alertDiv.classList.add('d-none');
    }
}

/**
 * Muestra error en un campo específico
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('is-invalid');
    
    const feedback = field.parentElement.querySelector('.invalid-feedback') || 
                    field.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = message;
    }
}

/**
 * Muestra múltiples errores de campos
 */
function showFieldErrors(errors) {
    Object.keys(errors).forEach(fieldId => {
        if (fieldId !== 'general') {
            showFieldError(fieldId, errors[fieldId]);
        }
    });
}

/**
 * Limpia el error de un campo
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.remove('is-invalid');
    }
}

/**
 * Limpia todos los errores de campos
 */
function clearFieldErrors() {
    const invalidFields = document.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });
}

/**
 * Muestra el spinner de carga
 */
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.remove('d-none');
    }
}

/**
 * Oculta el spinner de carga
 */
function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('d-none');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

