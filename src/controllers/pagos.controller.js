import Stripe from 'stripe';
import {
    obtenerSancionPorTicket,
    registrarPagoPendiente,
    completarPago,
    marcarPagoFallido,
    obtenerHistorialPagos
} from '../models/pagos.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/pagos/crear-sesion
// Body: { vchticket: "TK001" }
async function postCrearSesion(req, res) {
    try {
        const { vchticket } = req.body;
        const matricula = req.usuario.matricula; // viene del middleware de auth

        if (!vchticket) {
            return res.status(400).json({
                success: false,
                message: 'Ticket requerido'
            });
        }

        // Verificar que la sancion existe y pertenece al usuario
        const sancion = await obtenerSancionPorTicket(vchticket, matricula);

        if (!sancion) {
            return res.status(404).json({
                success: false,
                message: 'Sancion no encontrada o ya pagada'
            });
        }

        // URLs de retorno (configuradas en .env)
        const FRONTEND_URL = process.env.FRONTEND_URL || 'https://uthhbibliotecanew.b-corpsolutions.com';

        // Crear sesion de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: `Sancion - Ticket ${vchticket}`,
                        description: `Pago de sancion por libro: ${sancion.titulo_libro}`
                    },
                    unit_amount: Math.round(sancion.flmontosancion * 100), // Stripe usa centavos
                },
                quantity: 1,
            }],
            success_url: `${FRONTEND_URL}/HTML/pago_exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/HTML/mis_prestamos.html?pago=cancelado`,
            metadata: {
                vchticket: vchticket,
                matricula: String(matricula)
            },
            customer_email: req.usuario.correo || undefined
        });

        // Guardar el pago como pendiente en la base de datos
        await registrarPagoPendiente({
            vchticket: vchticket,
            matricula: matricula,
            monto: sancion.flmontosancion,
            sessionId: session.id
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error al crear sesion de pago:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear sesion de pago',
            error: error.message
        });
    }
}

// POST /api/pagos/webhook
// Stripe llama a este endpoint automaticamente cuando hay eventos de pago
// IMPORTANTE: Esta ruta NO debe usar express.json(), debe recibir el raw body
async function postWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Error de verificacion del webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('Pago completado:', session.id);

                const resultado = await completarPago(
                    session.id,
                    session.payment_intent
                );

                if (resultado.success) {
                    console.log(`Sancion del ticket ${resultado.ticket} liquidada`);
                }
                break;
            }

            case 'checkout.session.expired':
            case 'checkout.session.async_payment_failed': {
                const session = event.data.object;
                console.log('Pago fallido o expirado:', session.id);
                await marcarPagoFallido(session.id);
                break;
            }

            default:
                console.log(`Evento no manejado: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Error procesando webhook:', error);
        res.status(500).json({ error: error.message });
    }
}

// GET /api/pagos/verificar-sesion/:sessionId
// Verifica el estado de un pago despues de que el usuario regresa del checkout
async function getVerificarSesion(req, res) {
    try {
        const { sessionId } = req.params;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        res.json({
            success: true,
            estado: session.payment_status, // 'paid', 'unpaid', 'no_payment_required'
            monto: session.amount_total / 100,
            ticket: session.metadata?.vchticket
        });

    } catch (error) {
        console.error('Error verificando sesion:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar el pago'
        });
    }
}

// GET /api/pagos/historial
// Devuelve el historial de pagos del usuario autenticado
async function getHistorial(req, res) {
    try {
        const matricula = req.usuario.matricula;
        const historial = await obtenerHistorialPagos(matricula);

        res.json({
            success: true,
            data: historial
        });

    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial'
        });
    }
}

export {
    postCrearSesion,
    postWebhook,
    getVerificarSesion,
    getHistorial
};