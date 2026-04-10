import express from 'express';
import {
    postCrearPreferencia,
    postWebhook,
    getVerificar,
    getHistorial
} from '../controllers/pagos.controller.js';
import { verificarAutenticacion } from '../middlewares/auth.middleware.js';

const router = express.Router();

// El webhook NO usa autenticacion porque lo llama Mercado Pago directamente
// Mercado Pago envia el body como JSON normal, asi que no necesita raw body (a diferencia de Stripe)
router.post('/webhook', postWebhook);

// Las demas rutas requieren autenticacion del usuario
router.post('/crear-preferencia', verificarAutenticacion, postCrearPreferencia);
router.get('/verificar/:externalRef', verificarAutenticacion, getVerificar);
router.get('/historial', verificarAutenticacion, getHistorial);

export default router;