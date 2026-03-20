import nodemailer from 'nodemailer';
import cron from 'node-cron';
import pool from '../config/db.js';

//CONFIGURACIÓN DEL CORREO
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS  
    }
});

//CONSULTA A LA BD
async function obtenerPrestamosPorVencer(dias) {
    const query = `
    SELECT 
        p.intidprestamo,
        p.vchticket,
        p.fecha_devolucion,
        p.intmatricula_usuario,
        u.vchcorreo,
        CONCAT(u.vchnombre, ' ', u.vchapaterno, ' ', u.vchamaterno) AS nombre_completo
    FROM tblprestamos p
    INNER JOIN tblusuarios u ON u.intmatricula = p.intmatricula_usuario
    WHERE p.booldevuelto = 0
      AND DATE(p.fecha_devolucion) = DATE(NOW() + INTERVAL ? DAY)
`;

    const [rows] = await pool.execute(query, [dias]);
    return rows;
}

//ENVÍO DE CORREO
async function enviarNotificacion(prestamo, diasRestantes) {
    const diasTexto = diasRestantes === 1 ? '1 día' : `${diasRestantes} días`;

    const mailOptions = {
        from: `"Biblioteca UTHH" <${process.env.MAIL_USER}>`,
        to: prestamo.vchcorreo,
        subject: `Tu préstamo vence en ${diasTexto} — Biblioteca UTHH`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #A02142; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Biblioteca UTHH</h2>
                    <p style="color: #BC955B; margin: 5px 0 0;">Aviso de vencimiento de préstamo</p>
                </div>
                <div style="padding: 30px;">
                    <p>Hola, <strong>${prestamo.nombre_completo || 'alumno'}</strong></p>
                    <p>Te informamos que tu préstamo está próximo a vencer:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background-color: #f5f5f5;">
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Ticket</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${prestamo.vchticket}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Fecha de devolución</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(prestamo.fecha_devolucion).toLocaleDateString('es-MX')}</td>
                        </tr>
                        <tr style="background-color: #f5f5f5;">
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Días restantes</td>
                            <td style="padding: 10px; border: 1px solid #ddd; color: #A02142; font-weight: bold;">${diasTexto}</td>
                        </tr>
                    </table>

                    <p>Por favor acude a la biblioteca antes de la fecha límite para evitar multas.</p>
                    <p style="color: #888; font-size: 12px;">Este es un mensaje automático, no respondas a este correo.</p>
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center;">
                    <p style="margin: 0; color: #555; font-size: 12px;">Universidad Tecnológica de la Huasteca Hidalguense</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Notificación] Correo enviado a ${prestamo.vchcorreo} — Ticket: ${prestamo.vchticket} — Vence en ${diasTexto}`);
}

//PROCESO PRINCIPAL
async function procesarNotificaciones() {
    console.log(`[Notificaciones] Ejecutando proceso — ${new Date().toLocaleString('es-MX')}`);

    for (const dias of [3, 1]) {
        try {
            const prestamos = await obtenerPrestamosPorVencer(dias);
            console.log(`[Notificaciones] Préstamos que vencen en ${dias} día(s): ${prestamos.length}`);

            for (const prestamo of prestamos) {
                try {
                    await enviarNotificacion(prestamo, dias);
                } catch (err) {
                    console.error(`[Error] No se pudo enviar correo a ${prestamo.vchcorreo}:`, err.message);
                }
            }
        } catch (err) {
            console.error(`[Error] Fallo al consultar préstamos por vencer en ${dias} día(s):`, err.message);
        }
    }
}

//CRON
function iniciarScheduler() {
    cron.schedule('0 8 * * *', procesarNotificaciones, {
        timezone: 'America/Mexico_City'
    });
    console.log('[Scheduler] Notificaciones programadas — todos los días a las 8:00 AM');
}

export { iniciarScheduler, procesarNotificaciones };