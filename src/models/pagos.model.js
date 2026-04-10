import db from '../config/db.js';

// Obtener detalles de una sancion por ticket
async function obtenerSancionPorTicket(vchticket, matricula) {
    const sql = `
        SELECT 
            p.vchticket,
            p.intmatricula_usuario,
            d.flmontosancion,
            d.boolsancion,
            d.vchsancion,
            l.vchtitulo AS titulo_libro
        FROM tblprestamos p
        INNER JOIN tbldevolucion d ON p.intidprestamo = d.intidprestamo
        INNER JOIN tblejemplares e ON p.intidejemplar = e.intidejemplar
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        WHERE p.vchticket = ?
        AND p.intmatricula_usuario = ?
        AND d.flmontosancion > 0
        AND d.boolsancion = 0
        LIMIT 1
    `;
    const [rows] = await db.query(sql, [vchticket, matricula]);
    return rows[0] || null;
}

// Registrar un pago pendiente
async function registrarPagoPendiente(datos) {
    const sql = `
        INSERT INTO tblpagos 
        (vchticket, intmatricula_usuario, flmonto, vchsessionid, vchestado)
        VALUES (?, ?, ?, ?, 'pendiente')
    `;
    const [result] = await db.query(sql, [
        datos.vchticket,
        datos.matricula,
        datos.monto,
        datos.sessionId
    ]);
    return result.insertId;
}

// Marcar pago como completado y liquidar la sancion
async function completarPago(sessionId, paymentIntent) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Actualizar registro de pago
        const sqlPago = `
            UPDATE tblpagos 
            SET vchestado = 'completado',
                vchpaymentintent = ?,
                dtfechapago = NOW()
            WHERE vchsessionid = ?
            AND vchestado = 'pendiente'
        `;
        const [resPago] = await conn.query(sqlPago, [paymentIntent, sessionId]);

        if (resPago.affectedRows === 0) {
            await conn.rollback();
            return { success: false, message: 'Pago no encontrado o ya procesado' };
        }

        // Obtener el ticket asociado al pago
        const [pagoRows] = await conn.query(
            'SELECT vchticket FROM tblpagos WHERE vchsessionid = ?',
            [sessionId]
        );
        const ticket = pagoRows[0]?.vchticket;

        if (!ticket) {
            await conn.rollback();
            return { success: false, message: 'Ticket no encontrado' };
        }

        // Marcar la sancion como pagada en tbldevolucion
        const sqlSancion = `
            UPDATE tbldevolucion d
            INNER JOIN tblprestamos p ON d.intidprestamo = p.intidprestamo
            SET d.boolsancion = 1
            WHERE p.vchticket = ?
        `;
        await conn.query(sqlSancion, [ticket]);

        await conn.commit();
        return { success: true, ticket: ticket };

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// Marcar pago como fallido
async function marcarPagoFallido(sessionId) {
    const sql = `
        UPDATE tblpagos 
        SET vchestado = 'fallido'
        WHERE vchsessionid = ?
    `;
    await db.query(sql, [sessionId]);
}

// Obtener historial de pagos de un usuario
async function obtenerHistorialPagos(matricula) {
    const sql = `
        SELECT 
            p.intidpago,
            p.vchticket,
            p.flmonto,
            p.vchestado,
            p.dtfecharegistro,
            p.dtfechapago,
            l.vchtitulo AS titulo_libro
        FROM tblpagos p
        INNER JOIN tblprestamos pr ON p.vchticket = pr.vchticket
        INNER JOIN tblejemplares e ON pr.intidejemplar = e.intidejemplar
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        WHERE p.intmatricula_usuario = ?
        ORDER BY p.dtfecharegistro DESC
    `;
    const [rows] = await db.query(sql, [matricula]);
    return rows;
}

export {
    obtenerSancionPorTicket,
    registrarPagoPendiente,
    completarPago,
    marcarPagoFallido,
    obtenerHistorialPagos
};