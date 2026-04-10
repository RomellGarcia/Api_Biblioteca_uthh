import express from 'express';
import {
    postCrearSesion,
    postWebhook,
    getVerificarSesion,
    getHistorial
} from '../controllers/pagos.controller.js';
import { verificarAutenticacion } from '../middlewares/auth.middleware.js';

const router = express.Router();

// IMPORTANTE: El webhook NO usa autenticacion porque es llamado por Stripe directamente
// Tampoco usa express.json() - eso se configura aparte en app.js
router.post('/webhook', express.raw({ type: 'application/json' }), postWebhook);

// Las demas rutas si requieren autenticacion del usuario
router.post('/crear-sesion', verificarAutenticacion, postCrearSesion);
router.get('/verificar-sesion/:sessionId', verificarAutenticacion, getVerificarSesion);
router.get('/historial', verificarAutenticacion, getHistorial);

export default router;