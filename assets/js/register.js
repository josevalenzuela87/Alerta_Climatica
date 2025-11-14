/**
 * ========================================
 * Register Page - Script de Registro
 * ========================================
 * 
 * Script que maneja la lógica de la página de registro.
 * Inicializa Firebase, crea las instancias necesarias y
 * gestiona el formulario de registro.
 * 
 * @author AlertaClimática Team
 * @version 1.0.0
 */

// Variables globales
let authController = null;

/**
 * Inicializa la aplicación
 */
async function initializeApp() {
    try {
        console.log('→ Inicializando aplicación de registro...');

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
    // Formulario de registro
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', handleRegister);
    }

    // Toggle de contraseña
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            togglePasswordVisibility('password', togglePassword);
        });
    }

    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', () => {
            togglePasswordVisibility('confirmPassword', toggleConfirmPassword);
        });
    }

    // Validación en tiempo real
    setupRealtimeValidation();
}

/**
 * Maneja el envío del formulario de registro
 */
async function handleRegister(event) {
    event.preventDefault();

    // Limpiar mensajes anteriores
    clearAlert();
    clearFieldErrors();

    // Obtener datos del formulario
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        acceptTerms: document.getElementById('acceptTerms').checked
    };

    // Deshabilitar botón y mostrar loading
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Registrando...';

    try {
        // Llamar al controlador
        const result = await authController.register(formData);

        if (result.success) {
            // Mostrar mensaje de éxito
            showAlert('success', '¡Registro exitoso! Redirigiendo al panel...');
            
            // Limpiar formulario
            event.target.reset();

            // Redirigir después de 2 segundos
            setTimeout(() => {
                window.location.href = result.data.redirectTo;
            }, 2000);

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
        console.error('❌ Error en registro:', error);
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

    // Validar contraseña al perder el foco
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('blur', () => {
            const validation = Validator.validatePassword(passwordInput.value);
            if (!validation.valid && passwordInput.value) {
                showFieldError('password', validation.message);
            } else {
                clearFieldError('password');
            }
        });
    }

    // Validar confirmación de contraseña
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('blur', () => {
            const password = document.getElementById('password').value;
            const validation = Validator.validatePasswordMatch(password, confirmPasswordInput.value);
            if (!validation.valid && confirmPasswordInput.value) {
                showFieldError('confirmPassword', validation.message);
            } else {
                clearFieldError('confirmPassword');
            }
        });
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

