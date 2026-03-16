import express from 'express';

//Unimos todas las importaciones del controlador
import { 
    login, verificar, logout, getUsuarios, getAdministradores, 
    getEmpleados, deleteUsuario, getPerfil, putPerfil, 
    getUsuarioPorMatricula, getRoles, postActualizarUsuario, 
    registro, getTodosLosUsuarios 
} from '../controllers/auth.controller.js';

//Importamos los middlewares con la extensión .js
import { verificarAutenticacion, verificarRolAdminEmpleado } from '../middlewares/auth.middleware.js';

const router = express.Router();

//Rutas Públicas
router.post('/login', login);
router.get('/verificar', verificar);
router.post('/logout', logout);

//Rutas Protegidas (Requieren Token)
router.get('/perfil', verificarAutenticacion, getPerfil);
router.put('/perfil', verificarAutenticacion, putPerfil);
router.post('/registro', verificarAutenticacion, registro);

//Rutas de Administrador/Empleado
router.get('/usuarios/todos', verificarAutenticacion, verificarRolAdminEmpleado, getTodosLosUsuarios);
router.get('/usuarios', verificarAutenticacion, verificarRolAdminEmpleado, getUsuarios);
router.get('/administradores', verificarAutenticacion, verificarRolAdminEmpleado, getAdministradores);
router.get('/empleados', verificarAutenticacion, verificarRolAdminEmpleado, getEmpleados);
router.delete('/usuarios/:matricula', verificarAutenticacion, verificarRolAdminEmpleado, deleteUsuario);
router.get('/roles', verificarAutenticacion, verificarRolAdminEmpleado, getRoles);
router.post('/usuarios/actualizar', verificarAutenticacion, verificarRolAdminEmpleado, postActualizarUsuario);
router.get('/usuarios/:matricula', verificarAutenticacion, verificarRolAdminEmpleado, getUsuarioPorMatricula);

export default router;