import express from 'express';
const router = express.Router();
import * as Ctrl from '../controllers/ejemplares.controller.js';

router.get('/auxiliares', Ctrl.getAuxiliares); // Trae estados y ubicaciones de un solo golpe
router.get('/libro/:folio', Ctrl.getListaPorLibro); // Trae la tabla de abajo
router.post('/', Ctrl.postEjemplar); // Guarda el nuevo ejemplar

export default router;