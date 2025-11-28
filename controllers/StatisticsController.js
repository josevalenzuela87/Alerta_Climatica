/**
 * ========================================
 * StatisticsController - Controlador de Estadísticas
 * ========================================
 * 
 * Controlador que gestiona la lógica de estadísticas y reportes.
 * 
 * @class StatisticsController
 * @pattern MVC - Controller
 * @author AlertaClimática Team
 * @version 1.0.0
 */

class StatisticsController {
    /**
     * Repositorio de estadísticas
     * @private
     */
    #statisticsRepository;

    /**
     * Constructor
     * @param {StatisticsRepository} statisticsRepository - Instancia del repositorio
     */
    constructor(statisticsRepository) {
        if (!statisticsRepository) {
            throw new Error('StatisticsController requiere una instancia de StatisticsRepository');
        }
        this.#statisticsRepository = statisticsRepository;
        console.log('✓ StatisticsController: Instancia creada');
    }

    /**
     * Obtiene estadísticas generales del sistema
     * @async
     * @returns {Promise<Object>} Objeto con estadísticas generales
     */
    async getGeneralStatistics() {
        try {
            const [alerts, locations, users] = await Promise.all([
                this.#statisticsRepository.getAllAlertsForStatistics(),
                this.#statisticsRepository.getAllLocationsForStatistics(),
                this.#statisticsRepository.getAllUsersForStatistics()
            ]);

            const activeAlerts = alerts.filter(a => a.status === 'activa');
            const activeUsers = users.filter(u => u.active !== false);

            return {
                success: true,
                statistics: {
                    totalAlerts: alerts.length,
                    activeAlerts: activeAlerts.length,
                    totalLocations: locations.length,
                    activeLocations: locations.filter(l => l.activa !== false).length,
                    totalUsers: users.length,
                    activeUsers: activeUsers.length,
                    adminUsers: users.filter(u => u.role === 'admin').length,
                    regularUsers: users.filter(u => u.role === 'user' || !u.role).length
                }
            };
        } catch (error) {
            console.error('❌ Error al obtener estadísticas generales:', error);
            return {
                success: false,
                statistics: null,
                message: `Error al obtener estadísticas: ${error.message}`
            };
        }
    }

    /**
     * Obtiene estadísticas de alertas por tipo
     * @async
     * @returns {Promise<Object>} Objeto con estadísticas por tipo
     */
    async getAlertsByType() {
        try {
            const alerts = await this.#statisticsRepository.getAllAlertsForStatistics();
            
            const byType = {};
            alerts.forEach(alert => {
                const type = alert.tipo || 'sin_tipo';
                byType[type] = (byType[type] || 0) + 1;
            });

            return {
                success: true,
                data: byType,
                labels: Object.keys(byType),
                values: Object.values(byType)
            };
        } catch (error) {
            console.error('❌ Error al obtener alertas por tipo:', error);
            return {
                success: false,
                data: {},
                labels: [],
                values: []
            };
        }
    }

    /**
     * Obtiene estadísticas de alertas por severidad
     * @async
     * @returns {Promise<Object>} Objeto con estadísticas por severidad
     */
    async getAlertsBySeverity() {
        try {
            const alerts = await this.#statisticsRepository.getAllAlertsForStatistics();
            
            const bySeverity = {
                'leve': 0,
                'moderada': 0,
                'grave': 0,
                'critica': 0
            };

            alerts.forEach(alert => {
                const severity = alert.severidad || 'leve';
                if (bySeverity.hasOwnProperty(severity)) {
                    bySeverity[severity]++;
                } else {
                    bySeverity['leve']++;
                }
            });

            return {
                success: true,
                data: bySeverity,
                labels: Object.keys(bySeverity),
                values: Object.values(bySeverity)
            };
        } catch (error) {
            console.error('❌ Error al obtener alertas por severidad:', error);
            return {
                success: false,
                data: {},
                labels: [],
                values: []
            };
        }
    }

    /**
     * Obtiene tendencias de alertas por período
     * @async
     * @param {string} period - 'day', 'week', 'month'
     * @returns {Promise<Object>} Objeto con datos de tendencias
     */
    async getAlertsTrends(period = 'month') {
        try {
            const alerts = await this.#statisticsRepository.getAllAlertsForStatistics();
            
            const now = new Date();
            let periodDays;
            switch (period) {
                case 'day':
                    periodDays = 30; // Últimos 30 días
                    break;
                case 'week':
                    periodDays = 12; // Últimas 12 semanas
                    break;
                case 'month':
                    periodDays = 12; // Últimos 12 meses
                    break;
                default:
                    periodDays = 12;
            }

            const trends = {};
            
            for (let i = periodDays - 1; i >= 0; i--) {
                const date = new Date(now);
                let label, dateStart, dateEnd;

                if (period === 'day') {
                    date.setDate(date.getDate() - i);
                    label = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                    dateStart = new Date(date.setHours(0, 0, 0, 0));
                    dateEnd = new Date(date.setHours(23, 59, 59, 999));
                } else if (period === 'week') {
                    date.setDate(date.getDate() - (i * 7));
                    const weekStart = new Date(date);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    dateStart = new Date(weekStart.setHours(0, 0, 0, 0));
                    dateEnd = new Date(weekStart);
                    dateEnd.setDate(dateEnd.getDate() + 6);
                    dateEnd.setHours(23, 59, 59, 999);
                    label = `Sem ${weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}`;
                } else {
                    date.setMonth(date.getMonth() - i);
                    label = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                    dateStart = new Date(date.getFullYear(), date.getMonth(), 1);
                    dateEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
                }

                trends[label] = alerts.filter(alert => {
                    const alertDate = alert.fechaCreacion?.toDate ? alert.fechaCreacion.toDate() : new Date(alert.fechaCreacion);
                    return alertDate >= dateStart && alertDate <= dateEnd;
                }).length;
            }

            return {
                success: true,
                period: period,
                labels: Object.keys(trends),
                values: Object.values(trends)
            };
        } catch (error) {
            console.error('❌ Error al obtener tendencias:', error);
            return {
                success: false,
                period: period,
                labels: [],
                values: []
            };
        }
    }

    /**
     * Obtiene zonas más afectadas (ubicaciones con más alertas)
     * @async
     * @param {number} limit - Número máximo de zonas a retornar
     * @returns {Promise<Object>} Objeto con zonas más afectadas
     */
    async getMostAffectedZones(limit = 10) {
        try {
            const [alerts, locations] = await Promise.all([
                this.#statisticsRepository.getAllAlertsForStatistics(),
                this.#statisticsRepository.getAllLocationsForStatistics()
            ]);

            // Crear mapa de ubicaciones
            const locationMap = {};
            locations.forEach(loc => {
                locationMap[loc.id] = loc;
            });

            // Contar alertas por ubicación
            const alertsByLocation = {};
            alerts.forEach(alert => {
                if (alert.ubicaciones && Array.isArray(alert.ubicaciones)) {
                    alert.ubicaciones.forEach(locId => {
                        alertsByLocation[locId] = (alertsByLocation[locId] || 0) + 1;
                    });
                }
            });

            // Ordenar y limitar
            const sortedZones = Object.entries(alertsByLocation)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([locationId, count]) => {
                    const location = locationMap[locationId];
                    return {
                        locationId: locationId,
                        locationName: location ? `${location.nombre} - ${location.ciudad}, ${location.estado}` : 'Desconocida',
                        alertCount: count
                    };
                });

            return {
                success: true,
                zones: sortedZones,
                labels: sortedZones.map(z => z.locationName),
                values: sortedZones.map(z => z.alertCount)
            };
        } catch (error) {
            console.error('❌ Error al obtener zonas más afectadas:', error);
            return {
                success: false,
                zones: [],
                labels: [],
                values: []
            };
        }
    }

    /**
     * Genera datos para exportación de reportes
     * @async
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Promise<Object>} Datos formateados para exportación
     */
    async getReportData(startDate, endDate) {
        try {
            const alerts = await this.#statisticsRepository.getAlertsByDateRange(startDate, endDate);
            const users = await this.#statisticsRepository.getAllUsersForStatistics();

            const activeUsers = users.filter(u => u.active !== false);
            const activeAlerts = alerts.filter(a => a.status === 'activa');

            return {
                success: true,
                report: {
                    period: {
                        start: startDate.toLocaleDateString('es-ES'),
                        end: endDate.toLocaleDateString('es-ES')
                    },
                    alerts: {
                        total: alerts.length,
                        active: activeAlerts.length,
                        byType: this._groupBy(alerts, 'tipo'),
                        bySeverity: this._groupBy(alerts, 'severidad')
                    },
                    users: {
                        total: users.length,
                        active: activeUsers.length,
                        byRole: this._groupBy(users, 'role')
                    }
                },
                rawData: {
                    alerts: alerts,
                    users: users
                }
            };
        } catch (error) {
            console.error('❌ Error al generar datos de reporte:', error);
            return {
                success: false,
                report: null,
                message: `Error al generar reporte: ${error.message}`
            };
        }
    }

    /**
     * Agrupa un array por una propiedad
     * @private
     * @param {Array} array - Array a agrupar
     * @param {string} property - Propiedad por la cual agrupar
     * @returns {Object} Objeto con conteos por grupo
     */
    _groupBy(array, property) {
        return array.reduce((acc, item) => {
            const key = item[property] || 'sin_' + property;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsController;
}

// Exponer al objeto window para uso en navegador
if (typeof window !== 'undefined') {
    window.StatisticsController = StatisticsController;
}

