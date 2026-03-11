// auth.routes.js - Rutas de autenticación y usuarios
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { verificarAutenticacion, verificarRolAdminEmpleado, verificarCualquierRol } = require('../middlewares/auth.middleware');
const { validarCamposRequeridos, validarMatricula, validarEmail } = require('../middlewares/validation.middleware');

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', 
    validarCamposRequeridos(['matricula', 'password']),
    validarMatricula,
    AuthController.login
);

/**
 * GET /api/auth/verificar
 * Verificar si hay sesión activa
 */
router.get('/verificar', AuthController.verificarSesion);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', 
    verificarAutenticacion,
    AuthController.logout
);

/**
 * GET /api/auth/usuarios
 * Obtener todos los usuarios (solo admin/empleado)
 */
router.get('/usuarios', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    AuthController.obtenerUsuarios
);

/**
 * GET /api/auth/administradores
 * Obtener todos los administradores (solo admin/empleado)
 */
router.get('/administradores', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    AuthController.obtenerAdministradores
);

/**
 * GET /api/auth/empleados
 * Obtener todos los empleados (solo admin/empleado)
 */
router.get('/empleados', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    AuthController.obtenerEmpleados
);

/**
 * GET /api/auth/perfil
 * Obtener perfil del usuario logueado
 */
router.get('/perfil', 
    verificarAutenticacion,
    verificarCualquierRol,
    AuthController.obtenerPerfil
);

/**
 * PUT /api/auth/perfil
 * Actualizar perfil del usuario logueado
 */
router.put('/perfil', 
    verificarAutenticacion,
    verificarCualquierRol,
    validarCamposRequeridos(['vchnombre', 'vchcorreo']),
    validarEmail,
    AuthController.actualizarPerfil
);

/**
 * DELETE /api/auth/usuarios/:matricula
 * Eliminar usuario (solo admin/empleado)
 */
router.delete('/usuarios/:matricula', 
    verificarAutenticacion,
    verificarRolAdminEmpleado,
    AuthController.eliminarUsuario
);

module.exports = router;