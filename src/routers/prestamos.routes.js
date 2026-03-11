// prestamos.routes.js - Rutas de préstamos y devoluciones
const express = require('express');
const router = express.Router();
const PrestamosController = require('../controllers/prestamos.controller');
const { verificarAutenticacion, verificarRolAdminEmpleado } = require('../middlewares/auth.middleware');
const { validarCamposRequeridos } = require('../middlewares/validation.middleware');

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

/**
 * GET /api/prestamos
 * Listar préstamos con filtros (solo admin/empleado)
 */
router.get('/', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    PrestamosController.listarPrestamos
);

/**
 * GET /api/prestamos/buscar-ejemplares
 * Buscar ejemplares disponibles (solo admin/empleado)
 */
router.get('/buscar-ejemplares', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    PrestamosController.buscarEjemplares
);

/**
 * GET /api/prestamos/buscar-usuario
 * Buscar usuario por matrícula (solo admin/empleado)
 */
router.get('/buscar-usuario', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    PrestamosController.buscarUsuario
);

/**
 * GET /api/prestamos/generar-ticket
 * Generar ticket único (solo admin/empleado)
 */
router.get('/generar-ticket', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    PrestamosController.generarTicket
);

/**
 * GET /api/prestamos/buscar-por-ticket
 * Buscar préstamo por ticket (solo admin/empleado)
 */
router.get('/buscar-por-ticket', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    PrestamosController.buscarPrestamoPorTicket
);

/**
 * POST /api/prestamos/registrar
 * Registrar nuevo préstamo (solo admin/empleado)
 */
router.post('/registrar', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    validarCamposRequeridos([
        'vchticket',
        'intmatriculausuario',
        'fechaprestamo',
        'fechadevolucion',
        'intidejemplar'
    ]),
    PrestamosController.registrarPrestamo
);

/**
 * POST /api/prestamos/devolucion
 * Procesar devolución (solo admin/empleado)
 */
router.post('/devolucion', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    validarCamposRequeridos([
        'intidprestamo',
        'intidejemplar',
        'intmatricula_empleado',
        'vchentrega',
        'fechareal_devolucion'
    ]),
    PrestamosController.procesarDevolucion
);

/**
 * POST /api/prestamos/sancion
 * Marcar sanción como pagada (solo admin/empleado)
 */
router.post('/sancion', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    validarCamposRequeridos(['intiddevolucion']),
    PrestamosController.marcarSancionPagada
);

module.exports = router;