// prestamos.controller.js - Controlador de préstamos y devoluciones
const PrestamoModel = require('../models/prestamo.model');

const PrestamosController = {
    /**
     * GET /api/prestamos
     * Listar todos los préstamos con filtros
     */
    listarPrestamos: async (req, res) => {
        try {
            const { filtro = 'todos', busqueda = '' } = req.query;

            const prestamos = await PrestamoModel.obtenerPrestamos(filtro, busqueda);
            const estadisticas = await PrestamoModel.obtenerEstadisticas();

            res.json({
                success: true,
                prestamos,
                estadisticas
            });
        } catch (error) {
            console.error('Error al obtener préstamos:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al obtener préstamos'
            });
        }
    },

    /**
     * GET /api/prestamos/buscar-ejemplares
     * Buscar ejemplares disponibles para préstamo
     */
    buscarEjemplares: async (req, res) => {
        try {
            const { termino } = req.query;

            if (!termino || termino.trim() === '') {
                return res.json({
                    success: true,
                    libros: []
                });
            }

            const libros = await PrestamoModel.buscarEjemplaresDisponibles(termino);

            res.json({
                success: true,
                libros
            });
        } catch (error) {
            console.error('Error al buscar ejemplares:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al buscar ejemplares'
            });
        }
    },

    /**
     * GET /api/prestamos/buscar-usuario
     * Buscar usuario por matrícula
     */
    buscarUsuario: async (req, res) => {
        try {
            const { matricula } = req.query;

            if (!matricula) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Matrícula requerida'
                });
            }

            const usuarios = await PrestamoModel.buscarUsuarioPorMatricula(matricula);

            if (usuarios.length === 0) {
                return res.json({
                    success: false,
                    mensaje: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                usuario: usuarios[0]
            });
        } catch (error) {
            console.error('Error al buscar usuario:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al buscar usuario'
            });
        }
    },

    /**
     * GET /api/prestamos/generar-ticket
     * Generar ticket único para préstamo
     */
    generarTicket: async (req, res) => {
        try {
            const ticket = await PrestamoModel.generarTicket();

            res.json({
                success: true,
                ticket
            });
        } catch (error) {
            console.error('Error al generar ticket:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al generar ticket'
            });
        }
    },

    /**
     * POST /api/prestamos/registrar
     * Registrar nuevo préstamo
     */
    registrarPrestamo: async (req, res) => {
        try {
            const {
                vchticket,
                intmatriculausuario,
                fechaprestamo,
                fechadevolucion,
                intidejemplar,
                vchobservaciones
            } = req.body;

            // Validaciones
            if (!vchticket || !intmatriculausuario || !fechaprestamo || !fechadevolucion || !intidejemplar) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Faltan campos requeridos'
                });
            }

            const intmatricula_empleado = req.session.usuario.matricula;
            const idRolEmpleado = req.session.usuario.idrol;

            const resultado = await PrestamoModel.registrarPrestamo({
                vchticket,
                intmatriculausuario,
                intmatricula_empleado,
                idRolEmpleado,
                fechaprestamo,
                fechadevolucion,
                intidejemplar,
                vchobservaciones
            });

            console.log('✅ Préstamo registrado - Trigger actualizó disponibilidad automáticamente');

            res.json({
                success: true,
                mensaje: 'Préstamo registrado exitosamente',
                data: {
                    idprestamo: resultado.idprestamo,
                    ticket: resultado.ticket,
                    matricula_empleado: intmatricula_empleado
                }
            });
        } catch (error) {
            console.error('Error al registrar préstamo:', error);
            res.status(500).json({
                success: false,
                mensaje: error.message || 'Error al registrar préstamo'
            });
        }
    },

    /**
     * GET /api/prestamos/buscar-por-ticket
     * Buscar préstamo por ticket para devolución
     */
    buscarPrestamoPorTicket: async (req, res) => {
        try {
            const { ticket } = req.query;

            if (!ticket) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Ticket requerido'
                });
            }

            const prestamos = await PrestamoModel.buscarPrestamoPorTicket(ticket);

            if (prestamos.length === 0) {
                return res.json({
                    success: false,
                    mensaje: 'No se encontró un préstamo con ese ticket'
                });
            }

            res.json({
                success: true,
                prestamo: prestamos[0]
            });
        } catch (error) {
            console.error('Error al buscar préstamo:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al buscar préstamo'
            });
        }
    },

    /**
     * POST /api/prestamos/devolucion
     * Procesar devolución de préstamo
     */
    procesarDevolucion: async (req, res) => {
        try {
            const {
                intidprestamo,
                intidejemplar,
                intmatricula_empleado,
                vchentrega,
                fechareal_devolucion,
                vchsancion,
                flmontosancion,
                boolsancion
            } = req.body;

            // Validaciones
            if (!intidprestamo || !intidejemplar || !intmatricula_empleado || !vchentrega || !fechareal_devolucion) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Faltan campos requeridos'
                });
            }

            const resultado = await PrestamoModel.registrarDevolucion({
                intidprestamo,
                intidejemplar,
                intmatricula_empleado,
                vchentrega,
                fechareal_devolucion,
                vchsancion,
                flmontosancion,
                boolsancion
            });

            console.log('✅ Devolución registrada - Trigger actualizó ejemplar y préstamo automáticamente');

            res.json({
                success: true,
                mensaje: 'Devolución registrada exitosamente',
                data: resultado
            });
        } catch (error) {
            console.error('Error al procesar devolución:', error);
            res.status(500).json({
                success: false,
                mensaje: error.message || 'Error al procesar devolución'
            });
        }
    },

    /**
     * POST /api/prestamos/sancion
     * Marcar sanción como pagada
     */
    marcarSancionPagada: async (req, res) => {
        try {
            const { intiddevolucion } = req.body;

            if (!intiddevolucion) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de devolución requerido'
                });
            }

            await PrestamoModel.marcarSancionPagada(intiddevolucion);

            res.json({
                success: true,
                mensaje: 'Sanción marcada como pagada'
            });
        } catch (error) {
            console.error('Error al marcar sanción:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al marcar sanción como pagada'
            });
        }
    }
};

module.exports = PrestamosController;