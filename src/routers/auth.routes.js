const express = require('express');
const router = express.Router();
const { login, verificar, logout, getUsuarios, getAdministradores, getEmpleados, deleteUsuario, getPerfil, putPerfil } = require('../controllers/auth.controller');
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

module.exports = router;