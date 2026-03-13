const express = require('express');
const router = express.Router();
const { login, verificar, logout, getUsuarios, getAdministradores, getEmpleados, deleteUsuario, getPerfil, putPerfil, getUsuarioPorMatricula, getRoles, postActualizarUsuario, registro } = require('../controllers/auth.controller');
const { verificarAutenticacion, verificarRolAdminEmpleado } = require('../middlewares/auth.middleware');

router.post('/login', login);
router.get('/verificar', verificar);
router.post('/logout', logout);

router.get('/usuarios', verificarAutenticacion, verificarRolAdminEmpleado, getUsuarios);
router.get('/administradores', verificarAutenticacion, verificarRolAdminEmpleado, getAdministradores);
router.get('/empleados', verificarAutenticacion, verificarRolAdminEmpleado, getEmpleados);
router.delete('/usuarios/:matricula', verificarAutenticacion, verificarRolAdminEmpleado, deleteUsuario);

router.get('/perfil', verificarAutenticacion, getPerfil);
router.put('/perfil', verificarAutenticacion, putPerfil);

// Rutas de editar usuario (solo admin)
router.get('/roles', verificarAutenticacion, verificarRolAdminEmpleado, getRoles);
router.post('/usuarios/actualizar', verificarAutenticacion, verificarRolAdminEmpleado, postActualizarUsuario);
router.get('/usuarios/:matricula', verificarAutenticacion, verificarRolAdminEmpleado, getUsuarioPorMatricula);

router.post('/registro', verificarAutenticacion, registro);

module.exports = router;