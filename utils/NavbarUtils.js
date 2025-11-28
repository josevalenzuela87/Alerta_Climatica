/**
 * ========================================
 * NavbarUtils - Utilidades para Navbar
 * ========================================
 * 
 * Funciones utilitarias para configurar el navbar según el rol del usuario.
 * 
 * @class NavbarUtils
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class NavbarUtils {
    /**
     * Configura el navbar ocultando elementos según el rol del usuario
     * @static
     * @param {User} user - Usuario actual
     * @param {RoleManager} roleManager - Instancia de RoleManager (opcional)
     */
    static setupNavbarPermissions(user, roleManager = null) {
        if (!user) {
            console.warn('⚠️ NavbarUtils: No se proporcionó usuario');
            return;
        }

        // Si no se proporciona RoleManager, usar el global
        const rm = roleManager || (typeof RoleManager !== 'undefined' ? RoleManager : null);
        if (!rm) {
            console.warn('⚠️ NavbarUtils: RoleManager no disponible');
            return;
        }

        const isAdmin = rm.isAdmin(user);

        try {
            // Buscar todos los elementos del navbar de manera más robusta
            const allNavLinks = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
            
            if (allNavLinks.length === 0) {
                console.warn('⚠️ NavbarUtils: No se encontraron enlaces en el navbar');
                return;
            }
            
            // Función auxiliar para encontrar elementos por múltiples criterios
            const findNavItem = (criteria) => {
                for (const link of allNavLinks) {
                    const href = link.getAttribute('href') || '';
                    const text = link.textContent.trim().toLowerCase();
                    const icon = link.querySelector('i');
                    const iconClass = icon ? icon.className : '';
                    
                    // Verificar cada criterio - si alguno coincide, retornar el elemento
                    for (const criterion of criteria) {
                        if (typeof criterion === 'function') {
                            if (criterion(link, href, text, iconClass)) {
                                return link.closest('li.nav-item');
                            }
                        } else if (criterion.type === 'href') {
                            // Verificar si el href contiene el valor o es exactamente igual
                            // También verificar rutas relativas (list.html dentro de users/)
                            const pathname = window.location.pathname || '';
                            if (href.includes(criterion.value) || 
                                href === criterion.value || 
                                (criterion.value === 'users/list.html' && href === 'list.html' && pathname.includes('/users/'))) {
                                return link.closest('li.nav-item');
                            }
                        } else if (criterion.type === 'text') {
                            if (text.includes(criterion.value.toLowerCase())) {
                                return link.closest('li.nav-item');
                            }
                        } else if (criterion.type === 'icon') {
                            if (iconClass.includes(criterion.value)) {
                                return link.closest('li.nav-item');
                            }
                        }
                    }
                }
                return null;
            };

            // Buscar elementos del navbar con múltiples criterios
            const navItems = {
                alerts: findNavItem([
                    { type: 'href', value: 'alerts/list.html' },
                    { type: 'text', value: 'alertas' },
                    { type: 'icon', value: 'fa-bell' }
                ]),
                locations: findNavItem([
                    { type: 'href', value: 'locations/list.html' },
                    { type: 'text', value: 'ubicaciones' },
                    { type: 'icon', value: 'fa-map-marker-alt' }
                ]),
                users: (() => {
                    // Búsqueda directa y más específica para "Usuarios"
                    // Priorizar búsqueda por texto e icono ya que son más confiables
                    const usersByIcon = findNavItem([{ type: 'icon', value: 'fa-users' }]);
                    const usersByText = findNavItem([{ type: 'text', value: 'usuarios' }]);
                    const usersByHref = findNavItem([
                        { type: 'href', value: 'users/list.html' },
                        { type: 'href', value: 'list.html' } // Para rutas relativas desde users/
                    ]);
                    return usersByIcon || usersByText || usersByHref;
                })(),
                stats: findNavItem([
                    { type: 'href', value: 'statistics/index.html' },
                    { type: 'href', value: '../statistics/index.html' },
                    { type: 'href', value: '../../statistics/index.html' },
                    { type: 'text', value: 'estadísticas' },
                    { type: 'icon', value: 'fa-chart-line' }
                ]),
                config: findNavItem([
                    { type: 'text', value: 'configuración' },
                    { type: 'icon', value: 'fa-cog' }
                ])
            };

            // Para usuarios normales, ocultar elementos de administración
            if (!isAdmin) {
                // Ocultar gestión de alertas, ubicaciones, usuarios, estadísticas y configuración
                let hiddenCount = 0;
                Object.entries(navItems).forEach(([key, item]) => {
                    if (item) {
                        item.style.display = 'none';
                        hiddenCount++;
                    }
                });
                if (hiddenCount > 0) {
                    console.log(`✓ Navbar: ${hiddenCount} elementos de administración ocultos para usuario normal`);
                }
            } else {
                // Para administradores, mostrar todo
                Object.values(navItems).forEach(item => {
                    if (item) {
                        item.style.display = '';
                    }
                });
                console.log('✓ Navbar: Todos los elementos visibles para administrador');
            }

            console.log('✓ Navbar configurado según rol:', user.role);
        } catch (error) {
            console.error('❌ Error al configurar navbar:', error);
        }
    }

    /**
     * Obtiene la URL de redirección para "Volver" según el rol del usuario
     * @static
     * @param {User} user - Usuario actual
     * @param {string} defaultUrl - URL por defecto (para admins)
     * @returns {string} URL de redirección
     */
    static getBackUrl(user, defaultUrl = '../dashboard.html') {
        if (!user) return defaultUrl;

        const rm = typeof RoleManager !== 'undefined' ? RoleManager : null;
        if (!rm) return defaultUrl;

        // Si es usuario normal, siempre redirigir al dashboard
        if (!rm.isAdmin(user)) {
            return '../dashboard.html';
        }

        // Si es admin, usar la URL por defecto
        return defaultUrl;
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavbarUtils;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.NavbarUtils = NavbarUtils;
}

