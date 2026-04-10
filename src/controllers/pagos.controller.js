import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import crypto from 'crypto';
import {
    obtenerSancionPorTicket,
    registrarPagoPendiente,
    buscarPagoPorExternalRef,
    completarPago,
    marcarPagoFallido,
    marcarPagoCancelado,
    obtenerHistorialPagos,
    obtenerPagoPorExternalRef
} from '../models/pagos.model.js';

// Inicializar cliente de Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: { timeout: 10000 }
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

// ============================================================
// POST /api/pagos/crear-preferencia
// Body: { vchticket: "TK001" }
// ============================================================
async function postCrearPreferencia(req, res) {
    try {
        const { vchticket } = req.body;
        const matricula = req.usuario.matricula;

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

        const FRONTEND_URL = process.env.FRONTEND_URL || 'https://uthhbibliotecanew.b-corpsolutions.com';
        const BACKEND_URL = process.env.BACKEND_URL || 'https://api-biblioteca-uthh.vercel.app';

        // Generar referencia externa unica para este pago
        // Formato: UTHH-{ticket}-{timestamp}-{random}
        const externalRef = `UTHH-${vchticket}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        // Crear preferencia de pago en Mercado Pago
        const preferenceData = {
            items: [{
                id: vchticket,
                title: `Sancion - Ticket ${vchticket}`,
                description: `Pago de sancion por el libro: ${sancion.titulo_libro}`,
                quantity: 1,
                currency_id: 'MXN',
                unit_price: parseFloat(sancion.flmontosancion)
            }],
            payer: {
                email: req.usuario.correo || 'usuario@uthh.edu.mx'
            },
            back_urls: {
                success: `${FRONTEND_URL}/HTML/pago_exitoso.html?ref=${externalRef}`,
                failure: `${FRONTEND_URL}/HTML/mis_prestamos.html?pago=fallido&ref=${externalRef}`,
                pending: `${FRONTEND_URL}/HTML/pago_exitoso.html?ref=${externalRef}&estado=pendiente`
            },
            auto_return: 'approved',
            external_reference: externalRef,
            notification_url: `${BACKEND_URL}/api/pagos/webhook`,
            statement_descriptor: 'BIBLIOTECA UTHH',
            metadata: {
                vchticket: vchticket,
                matricula: String(matricula)
            }
        };

        const preference = await preferenceClient.create({ body: preferenceData });

        // Guardar el pago como pendiente en la base de datos
        await registrarPagoPendiente({
            vchticket: vchticket,
            matricula: matricula,
            monto: sancion.flmontosancion,
            preferenceId: preference.id,
            externalRef: externalRef
        });

        // Devolver URL de inicio de pago
        // init_point: URL de produccion
        // sandbox_init_point: URL de pruebas (se usa con credenciales TEST)
        const urlPago = process.env.MP_ENV === 'production'
            ? preference.init_point
            : preference.sandbox_init_point;

        res.json({
            success: true,
            preferenceId: preference.id,
            url: urlPago,
            externalRef: externalRef
        });

    } catch (error) {
        console.error('Error al crear preferencia de pago:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear preferencia de pago',
            error: error.message
        });
    }
}

// ============================================================
// POST /api/pagos/webhook
// Mercado Pago llama a este endpoint cuando hay eventos de pago
// ============================================================
async function postWebhook(req, res) {
    // Responder rapido a Mercado Pago para evitar timeouts y reintentos
    res.status(200).send('OK');

    try {
        // Mercado Pago envia dos tipos de query params: id y topic (o type)
        const query = req.query;
        const body = req.body;

        // Obtener el tipo de notificacion y el id del recurso
        const tipo = query.type || query.topic || body.type;
        const dataId = query['data.id'] || query.id || body?.data?.id;

        console.log('Webhook recibido:', { tipo, dataId, query });

        // Solo procesamos notificaciones de tipo 'payment'
        if (tipo !== 'payment' || !dataId) {
            console.log('Webhook ignorado: no es notificacion de pago');
            return;
        }

        // Validar la firma (si esta configurada)
        if (process.env.MP_WEBHOOK_SECRET) {
            const esValido = validarFirma(req, dataId);
            if (!esValido) {
                console.error('Firma invalida en webhook');
                return;
            }
        }

        // Consultar el pago a la API de Mercado Pago para obtener sus detalles
        const pago = await paymentClient.get({ id: dataId });

        if (!pago) {
            console.error('Pago no encontrado en Mercado Pago:', dataId);
            return;
        }

        const externalRef = pago.external_reference;
        const estado = pago.status; // 'approved', 'rejected', 'cancelled', 'pending', etc.

        console.log(`Pago ${dataId} con estado ${estado}, ref: ${externalRef}`);

        if (!externalRef) {
            console.error('Pago sin external_reference');
            return;
        }

        // Verificar que tengamos este pago en nuestra base de datos
        const pagoLocal = await buscarPagoPorExternalRef(externalRef);
        if (!pagoLocal) {
            console.error('Pago no encontrado en BD local:', externalRef);
            return;
        }

        // Procesar segun el estado
        switch (estado) {
            case 'approved':
                const resultado = await completarPago(externalRef, String(dataId));
                if (resultado.success) {
                    console.log(`Sancion del ticket ${resultado.ticket} liquidada`);
                }
                break;

            case 'rejected':
                await marcarPagoFallido(externalRef, 'Pago rechazado');
                console.log(`Pago ${externalRef} marcado como fallido`);
                break;

            case 'cancelled':
                await marcarPagoCancelado(externalRef);
                console.log(`Pago ${externalRef} marcado como cancelado`);
                break;

            case 'pending':
            case 'in_process':
                // Pago pendiente (tipico de OXXO o SPEI), no hacemos nada
                console.log(`Pago ${externalRef} pendiente de confirmacion`);
                break;

            default:
                console.log(`Estado no manejado: ${estado}`);
        }

    } catch (error) {
        console.error('Error procesando webhook:', error);
        // Ya enviamos 200 OK, no hay que enviar otra respuesta
    }
}

// Validar la firma del webhook segun documentacion oficial de MP
function validarFirma(req, dataId) {
    try {
        const xSignature = req.headers['x-signature'];
        const xRequestId = req.headers['x-request-id'];
        const secret = process.env.MP_WEBHOOK_SECRET;

        if (!xSignature || !xRequestId || !secret) return false;

        // Extraer ts y v1 del header x-signature
        // Formato: "ts=1742505638683,v1=ced36ab6d..."
        const parts = xSignature.split(',');
        let ts, hash;

        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) {
                const trimmedKey = key.trim();
                const trimmedValue = value.trim();
                if (trimmedKey === 'ts') ts = trimmedValue;
                if (trimmedKey === 'v1') hash = trimmedValue;
            }
        });

        if (!ts || !hash) return false;

        // Reconstruir el manifest segun documentacion oficial
        // Formato: id:{data.id};request-id:{x-request-id};ts:{ts};
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

        // Generar HMAC SHA256
        const cyphedSignature = crypto
            .createHmac('sha256', secret)
            .update(manifest)
            .digest('hex');

        return cyphedSignature === hash;
    } catch (error) {
        console.error('Error validando firma:', error);
        return false;
    }
}

// ============================================================
// GET /api/pagos/verificar/:externalRef
// Verifica el estado de un pago despues de que el usuario regresa del checkout
// ============================================================
async function getVerificar(req, res) {
    try {
        const { externalRef } = req.params;
        const matricula = req.usuario.matricula;

        const pago = await obtenerPagoPorExternalRef(externalRef, matricula);

        if (!pago) {
            return res.status(404).json({
                success: false,
                message: 'Pago no encontrado'
            });
        }

        res.json({
            success: true,
            estado: pago.vchestado,
            monto: parseFloat(pago.flmonto),
            ticket: pago.vchticket,
            libro: pago.titulo_libro,
            paymentId: pago.vchpaymentid,
            fechaPago: pago.dtfechapago
        });

    } catch (error) {
        console.error('Error verificando pago:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar el pago'
        });
    }
}

// ============================================================
// GET /api/pagos/historial
// Devuelve el historial de pagos del usuario autenticado
// ============================================================
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
    postCrearPreferencia,
    postWebhook,
    getVerificar,
    getHistorial
};