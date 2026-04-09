import express from 'express';
import {
    getPrestamosPorMes,
    getEstadisticas
} from '../controllers/reportes.controller.js';
import {
    verificarAutenticacion,
    verificarRolAdminEmpleado
} from '../middlewares/auth.middleware.js';

const router = express.Router();

const auth = [verificarAutenticacion, verificarRolAdminEmpleado];

// GET /api/reportes/prestamos-por-mes?meses=6
router.get('/prestamos-por-mes', ...auth, getPrestamosPorMes);

// GET /api/reportes/estadisticas
router.get('/estadisticas', ...auth, getEstadisticas);

export default router;