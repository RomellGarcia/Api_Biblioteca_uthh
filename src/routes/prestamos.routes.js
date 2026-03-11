const express = require('express');
const router = express.Router();
const { getPrestamos, getBuscarEjemplares, getBuscarUsuario, getGenerarTicket, postRegistrar, postSancion, getBuscarPorTicket, postDevolucion } = require('../controllers/prestamos.controller');
const { verificarAutenticacion, verificarRolAdminEmpleado } = require('../middlewares/auth.middleware');

const auth = [verificarAutenticacion, verificarRolAdminEmpleado];

router.get('/', ...auth, getPrestamos);
router.get('/buscar-ejemplares', ...auth, getBuscarEjemplares);
router.get('/buscar-usuario', ...auth, getBuscarUsuario);
router.get('/generar-ticket', ...auth, getGenerarTicket);
router.get('/buscar-por-ticket', ...auth, getBuscarPorTicket);
router.post('/registrar', ...auth, postRegistrar);
router.post('/sancion', ...auth, postSancion);
router.post('/devolucion', ...auth, postDevolucion);

module.exports = router;