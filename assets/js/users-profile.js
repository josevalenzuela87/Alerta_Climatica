/**
 * ========================================
 * users-profile.js - Gestión de Perfil de Usuario
 * ========================================
 * 
 * Script para la vista de perfil de usuario
 * 
 */

// Verificar dependencias
function checkDependencies() {
    const required = [
        'FirebaseService',
        'UserRepository',
        'UserController',
        'User',
        'LocationController',
        'Location',
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
let locationController;
let authController;
let currentUser; // Usuario autenticado (administrador)
let profileUser; // Usuario cuyo perfil se está editando (puede ser el mismo o diferente si es admin)
let allLocations = [];

// Inicializar aplicación
async function initializeApp() {
    try {
        console.log('→ Inicializando perfil de usuario...');

        // Verificar dependencias
        if (!checkDependencies()) {
            throw new Error('Faltan dependencias críticas');
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
        
        const locationRepository = new LocationRepository(firebaseService);
        locationController = new LocationController(locationRepository);

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

            // Verificar si se está editando otro usuario (solo para admins)
            const urlParams = new URLSearchParams(window.location.search);
            const editUserId = urlParams.get('id');
            
            if (editUserId && currentUser.isAdmin() && editUserId !== currentUser.uid) {
                // El administrador está editando otro usuario
                const result = await userController.getUserById(editUserId);
                if (result.success && result.user) {
                    profileUser = result.user;
                    console.log('✓ Cargando perfil de usuario para edición:', profileUser.email);
                } else {
                    showAlert('Usuario no encontrado', 'danger');
                    setTimeout(() => {
                        window.location.href = 'list.html';
                    }, 2000);
                    return;
                }
            } else {
                // El usuario está editando su propio perfil
                profileUser = currentUser;
            }

            // Configurar navbar
            setupNavbar();

            // Configurar permisos del navbar según rol
            if (typeof NavbarUtils !== 'undefined' && currentUser) {
                NavbarUtils.setupNavbarPermissions(currentUser);
            }

            // Verificar si es admin para mostrar/ocultar botones de edición
            setupProfileEditPermissions();

            // Cargar datos del usuario (puede ser el propio o el que se está editando)
            await loadUserData();

            // Cargar ubicaciones para regiones de interés
            await loadLocations();

            // Configurar eventos
            setupEvents();

            console.log('✓ Perfil de usuario inicializado correctamente');
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

    // Configurar permisos del navbar según rol
    // Configurar permisos del navbar según rol
    if (typeof NavbarUtils !== 'undefined' && currentUser) {
        NavbarUtils.setupNavbarPermissions(currentUser);
    }
}

// Configurar permisos de edición del perfil
function setupProfileEditPermissions() {
    if (!currentUser) return;

    const isAdmin = currentUser.isAdmin();
    
    // Ocultar botón de guardar cambios en información personal si no es admin
    // (solo para editar nombre, la foto se guarda automáticamente)
    const profileSaveButton = document.getElementById('profileSaveButtonContainer');
    if (profileSaveButton) {
        if (!isAdmin) {
            profileSaveButton.style.display = 'none';
        } else {
            profileSaveButton.style.display = 'flex';
        }
    }

    // Hacer campos readonly si no es admin (excepto foto que todos pueden cambiar)
    const displayNameInput = document.getElementById('displayName');
    if (displayNameInput) {
        displayNameInput.readOnly = !isAdmin;
    }

    // Permitir que todos los usuarios cambien su foto
    // El botón de cambiar foto siempre está visible
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

// Cargar datos del usuario
async function loadUserData() {
    // Usar profileUser si está definido (cuando un admin edita otro usuario), sino usar currentUser
    const userToDisplay = profileUser || currentUser;
    if (!userToDisplay) return;

    // Información personal
    document.getElementById('email').value = userToDisplay.email || '';
    document.getElementById('displayName').value = userToDisplay.displayName || '';
    document.getElementById('role').value = userToDisplay.getRoleLabel();
    
    // Foto de perfil
    const photoURL = userToDisplay.photoURL || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VPC90ZXh0Pjwvc3ZnPg==';
    document.getElementById('profilePhoto').src = photoURL;
    document.getElementById('photoURL').value = photoURL || '';

    // Estado de email
    const emailVerifiedBadge = document.getElementById('emailVerifiedBadge');
    if (emailVerifiedBadge) {
        if (userToDisplay.emailVerified) {
            emailVerifiedBadge.innerHTML = '<span class="badge bg-success">Verificado</span>';
        } else {
            emailVerifiedBadge.innerHTML = '<span class="badge bg-warning">No verificado</span>';
        }
    }

    // Fechas - asegurar que se muestren correctamente
    const fechaCreacion = document.getElementById('fechaCreacion');
    const ultimoAcceso = document.getElementById('ultimoAcceso');
    
    if (fechaCreacion) {
        const fechaCreacionValue = userToDisplay.createdAt || userToDisplay.fechaCreacion
            ? new Date(userToDisplay.createdAt || userToDisplay.fechaCreacion).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'No disponible';
        fechaCreacion.value = fechaCreacionValue;
    }
    
    if (ultimoAcceso) {
        const ultimoAccesoValue = userToDisplay.lastAccess || userToDisplay.ultimoAcceso
            ? new Date(userToDisplay.lastAccess || userToDisplay.ultimoAcceso).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Nunca';
        ultimoAcceso.value = ultimoAccesoValue;
    }

    // Preferencias de notificaciones
    const prefs = userToDisplay.preferenciasNotificaciones || {};
    document.getElementById('notificacionesActivas').checked = prefs.activas !== false;
    document.getElementById('notificacionesEmail').checked = prefs.email !== false;
    document.getElementById('severidadMinima').value = prefs.severidadMinima || 'leve';
    
    // Mostrar indicador si se está editando otro usuario
    if (profileUser && profileUser.uid !== currentUser.uid) {
        const pageTitle = document.querySelector('h1');
        if (pageTitle) {
            pageTitle.innerHTML = `
                <i class="fas fa-user me-2 text-primary"></i>
                Editando Perfil de Usuario
                <small class="text-muted d-block mt-2" style="font-size: 0.6em;">
                    ${escapeHtml(profileUser.displayName || profileUser.email)}
                </small>
            `;
        }
    }
}

// Cargar ubicaciones
async function loadLocations() {
    try {
        const result = await locationController.getAllLocations({ activa: true });
        
        if (result.success) {
            allLocations = result.locations || [];
            renderRegionesInteres();
        }
    } catch (error) {
        console.error('❌ Error al cargar ubicaciones:', error);
    }
}

// Renderizar regiones de interés
function renderRegionesInteres() {
    const container = document.getElementById('regionesInteresContainer');
    if (!container) return;

    if (allLocations.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay ubicaciones disponibles</p>';
        return;
    }

    // Agrupar por tipo
    const byType = {
        pais: allLocations.filter(l => l.tipo === 'pais'),
        estado: allLocations.filter(l => l.tipo === 'estado'),
        ciudad: allLocations.filter(l => l.tipo === 'ciudad'),
        municipio: allLocations.filter(l => l.tipo === 'municipio')
    };

    const userToDisplay = profileUser || currentUser;
    const selectedIds = userToDisplay.regionesInteres || [];

    let html = '';

    // Países
    if (byType.pais.length > 0) {
        html += '<div class="mb-4"><h6 class="fw-semibold mb-3"><i class="fas fa-globe me-2 text-primary"></i>Países</h6>';
        html += '<div class="row g-2">';
        byType.pais.forEach(location => {
            const checked = selectedIds.includes(location.id) ? 'checked' : '';
            html += `
                <div class="col-md-3">
                    <div class="form-check">
                        <input class="form-check-input region-checkbox" type="checkbox" 
                               value="${location.id}" id="region-${location.id}" ${checked}>
                        <label class="form-check-label" for="region-${location.id}">
                            ${escapeHtml(location.nombre)}
                        </label>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    // Estados
    if (byType.estado.length > 0) {
        html += '<div class="mb-4"><h6 class="fw-semibold mb-3"><i class="fas fa-map me-2 text-primary"></i>Estados</h6>';
        html += '<div class="row g-2">';
        byType.estado.forEach(location => {
            const checked = selectedIds.includes(location.id) ? 'checked' : '';
            html += `
                <div class="col-md-3">
                    <div class="form-check">
                        <input class="form-check-input region-checkbox" type="checkbox" 
                               value="${location.id}" id="region-${location.id}" ${checked}>
                        <label class="form-check-label" for="region-${location.id}">
                            ${escapeHtml(location.nombre)}
                        </label>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    // Ciudades
    if (byType.ciudad.length > 0) {
        html += '<div class="mb-4"><h6 class="fw-semibold mb-3"><i class="fas fa-city me-2 text-primary"></i>Ciudades</h6>';
        html += '<div class="row g-2">';
        byType.ciudad.forEach(location => {
            const checked = selectedIds.includes(location.id) ? 'checked' : '';
            html += `
                <div class="col-md-3">
                    <div class="form-check">
                        <input class="form-check-input region-checkbox" type="checkbox" 
                               value="${location.id}" id="region-${location.id}" ${checked}>
                        <label class="form-check-label" for="region-${location.id}">
                            ${escapeHtml(location.nombre)}
                        </label>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    container.innerHTML = html;
}

// Configurar eventos
function setupEvents() {
    // Formulario de perfil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    // Formulario de preferencias
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handlePreferencesSubmit);
    }

    // Formulario de contraseña
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordSubmit);
    }

    // Cambiar foto - usar input file
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoFileInput = document.getElementById('photoFileInput');
    
    if (changePhotoBtn && photoFileInput) {
        changePhotoBtn.addEventListener('click', () => {
            photoFileInput.click();
        });

        photoFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Validar que sea una imagen
            if (!file.type.startsWith('image/')) {
                showAlert('Por favor, selecciona un archivo de imagen válido', 'danger');
                return;
            }

            // Validar tamaño (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('La imagen no puede ser mayor a 5MB', 'danger');
                return;
            }

            try {
                showLoading(true);
                
                // Determinar el usuario cuya foto se está actualizando
                const userIdToUpdate = (profileUser && profileUser.uid !== currentUser.uid) 
                    ? profileUser.uid 
                    : currentUser.uid;
                
                // Subir imagen a Firebase Storage
                const photoURL = await uploadProfilePhoto(file, userIdToUpdate);
                
                // Actualizar vista
                document.getElementById('photoURL').value = photoURL;
                document.getElementById('profilePhoto').src = photoURL;

                // Actualizar foto: si es otro usuario, usar updateUserProfile, sino updateProfile
                let result;
                if (profileUser && profileUser.uid !== currentUser.uid) {
                    // Admin actualizando foto de otro usuario
                    result = await userController.updateUserProfile(profileUser.uid, { photoURL: photoURL });
                    if (result.success) {
                        profileUser = result.user;
                    }
                } else {
                    // Usuario actualizando su propia foto
                    result = await userController.updateProfile({ photoURL: photoURL }, false);
                    if (result.success) {
                        currentUser = result.user;
                        if (!profileUser) profileUser = currentUser;
                    }
                }
                
                if (result.success) {
                    showAlert('Foto de perfil actualizada exitosamente', 'success');
                    if (userIdToUpdate === currentUser.uid) {
                        setupNavbar(); // Actualizar navbar solo si es el usuario actual
                    }
                } else {
                    showAlert(result.message, 'warning');
                }
            } catch (error) {
                console.error('❌ Error al subir foto:', error);
                showAlert('Error al subir la foto. Por favor, intenta nuevamente.', 'danger');
            } finally {
                showLoading(false);
                // Limpiar input
                photoFileInput.value = '';
            }
        });
    }
}

// Subir foto de perfil a Firebase Storage
async function uploadProfilePhoto(file, userId) {
    try {
        const storage = firebaseService.getStorage();
        if (!storage) {
            throw new Error('Firebase Storage no está disponible. Por favor, habilítalo en Firebase Console.');
        }

        // Crear referencia al archivo
        const storageRef = storage.ref();
        const photoRef = storageRef.child(`profile-photos/${userId}/${Date.now()}_${file.name}`);

        // Subir archivo
        const snapshot = await photoRef.put(file);
        
        // Obtener URL de descarga
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        console.log('✓ Foto subida exitosamente:', downloadURL);
        return downloadURL;

    } catch (error) {
        console.error('❌ Error al subir foto:', error);
        throw error;
    }
}

// Manejar envío de perfil
async function handleProfileSubmit(event) {
    event.preventDefault();

    const formData = {
        displayName: document.getElementById('displayName').value.trim(),
        photoURL: document.getElementById('photoURL').value.trim() || null
    };

    try {
        showLoading(true);
        
        // Determinar si se está actualizando otro usuario o el propio
        let result;
        if (profileUser && profileUser.uid !== currentUser.uid) {
            // Admin actualizando otro usuario
            result = await userController.updateUserProfile(profileUser.uid, formData);
            if (result.success) {
                profileUser = result.user;
                showAlert('Perfil de usuario actualizado exitosamente', 'success');
                // Recargar datos para reflejar cambios
                await loadUserData();
            }
        } else {
            // Usuario actualizando su propio perfil (solo admins pueden)
            result = await userController.updateProfile(formData, true); // true = requiere admin
            if (result.success) {
                currentUser = result.user;
                if (!profileUser) profileUser = currentUser;
                showAlert('Perfil actualizado exitosamente', 'success');
                setupNavbar(); // Actualizar navbar
            }
        }
        
        if (!result.success) {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        console.error('❌ Error al actualizar perfil:', error);
        showAlert('Error al actualizar el perfil', 'danger');
    } finally {
        showLoading(false);
    }
}

// Manejar envío de preferencias
async function handlePreferencesSubmit(event) {
    event.preventDefault();

    // Obtener preferencias de notificaciones
    const preferenciasNotificaciones = {
        activas: document.getElementById('notificacionesActivas').checked,
        email: document.getElementById('notificacionesEmail').checked,
        push: false, // Por ahora deshabilitado
        tiposAlertas: [],
        severidadMinima: document.getElementById('severidadMinima').value
    };

    // Obtener regiones de interés seleccionadas
    const checkboxes = document.querySelectorAll('.region-checkbox:checked');
    const regionesInteres = Array.from(checkboxes).map(cb => cb.value);

    try {
        showLoading(true);
        
        // Determinar si se están actualizando preferencias de otro usuario o las propias
        let result;
        if (profileUser && profileUser.uid !== currentUser.uid) {
            // Admin actualizando preferencias de otro usuario
            result = await userController.updateUserProfile(profileUser.uid, {
                preferenciasNotificaciones: preferenciasNotificaciones,
                regionesInteres: regionesInteres
            });
            if (result.success) {
                profileUser = result.user;
                showAlert('Preferencias de usuario actualizadas exitosamente', 'success');
                // Recargar datos para reflejar cambios
                await loadUserData();
            }
        } else {
            // Usuario actualizando sus propias preferencias
            result = await userController.updateProfile({
                preferenciasNotificaciones: preferenciasNotificaciones,
                regionesInteres: regionesInteres
            }, false); // false = no requiere admin para preferencias
            if (result.success) {
                currentUser = result.user;
                if (!profileUser) profileUser = currentUser;
                showAlert('Preferencias guardadas exitosamente', 'success');
            } else {
                showAlert(result.message, 'danger');
            }
        }
    } catch (error) {
        console.error('❌ Error al actualizar preferencias:', error);
        showAlert('Error al guardar las preferencias', 'danger');
    } finally {
        showLoading(false);
    }
}

// Manejar envío de contraseña
async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
        showAlert('Error: No se pudo obtener la información del usuario', 'danger');
        return;
    }

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
        showAlert('Las contraseñas no coinciden', 'danger');
        return;
    }

    // Validar longitud mínima
    if (newPassword.length < 6) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'danger');
        return;
    }

    try {
        showLoading(true);
        
        const result = await userController.changePassword(newPassword);
        
        if (result.success) {
            showAlert('Contraseña actualizada exitosamente. Por favor, inicia sesión nuevamente.', 'success');
            
            // Limpiar formulario
            document.getElementById('passwordForm').reset();
            
            // Cerrar sesión después de un tiempo para forzar re-autenticación
            setTimeout(async () => {
                await handleLogout();
            }, 2000);
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error);
        let errorMessage = 'Error al cambiar la contraseña';
        
        if (error.message) {
            errorMessage += ': ' + error.message;
        } else if (error.code) {
            // Manejar códigos de error específicos de Firebase
            switch (error.code) {
                case 'auth/requires-recent-login':
                    errorMessage = 'Por seguridad, debes iniciar sesión nuevamente antes de cambiar tu contraseña';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es muy débil. Usa una contraseña más segura';
                    break;
                default:
                    errorMessage = 'Error al cambiar la contraseña: ' + error.code;
            }
        }
        
        showAlert(errorMessage, 'danger');
    } finally {
        showLoading(false);
    }
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

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

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

