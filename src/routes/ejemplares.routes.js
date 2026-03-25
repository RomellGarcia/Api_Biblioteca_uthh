import express from 'express';
const router = express.Router();
import * as Ctrl from '../controllers/ejemplares.controller.js';

router.get('/auxiliares', Ctrl.getAuxiliares);
router.get('/libro/:folio', Ctrl.getListaPorLibro);
router.get('/:id', Ctrl.getEjemplarById);
router.post('/', Ctrl.postEjemplar);

// ESTA ES LA QUE FALTA:
router.delete('/:id', Ctrl.deleteEjemplar); 

export default router;