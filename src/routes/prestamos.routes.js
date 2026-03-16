import express from 'express';
import { 
    getPrestamos, 
    getBuscarEjemplares, 
    getBuscarUsuario, 
    getGenerarTicket, 
    postRegistrar, 
    postSancion, 
    getBuscarPorTicket, 
    postDevolucion 
} from '../controllers/prestamos.controllers.js';
import { 
    verificarAutenticacion, 
    verificarRolAdminEmpleado 
} from '../middlewares/auth.middleware.js';

const router = express.Router();

const auth = [verificarAutenticacion, verificarRolAdminEmpleado];

// Rutas GET
router.get('/', ...auth, getPrestamos);
router.get('/buscar-ejemplares', ...auth, getBuscarEjemplares);
router.get('/buscar-usuario', ...auth, getBuscarUsuario);
router.get('/generar-ticket', ...auth, getGenerarTicket);
router.get('/buscar-por-ticket', ...auth, getBuscarPorTicket);

// Rutas POST
router.post('/registrar', ...auth, postRegistrar);
router.post('/sancion', ...auth, postSancion);
router.post('/devolucion', ...auth, postDevolucion);

export default router;