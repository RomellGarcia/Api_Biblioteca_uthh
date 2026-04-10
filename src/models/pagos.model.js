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

// Registrar un pago pendiente (al crear la preferencia)
async function registrarPagoPendiente(datos) {
    const sql = `
        INSERT INTO tblpagos 
        (vchticket, intmatricula_usuario, flmonto, vchpreferenceid, vchexternalref, vchestado)
        VALUES (?, ?, ?, ?, ?, 'pendiente')
    `;
    const [result] = await db.query(sql, [
        datos.vchticket,
        datos.matricula,
        datos.monto,
        datos.preferenceId,
        datos.externalRef
    ]);
    return result.insertId;
}

// Buscar un pago por referencia externa
async function buscarPagoPorExternalRef(externalRef) {
    const sql = `
        SELECT * FROM tblpagos 
        WHERE vchexternalref = ?
        LIMIT 1
    `;
    const [rows] = await db.query(sql, [externalRef]);
    return rows[0] || null;
}

// Marcar pago como completado y liquidar la sancion
async function completarPago(externalRef, paymentId) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Verificar que no este ya procesado (idempotencia)
        const [existente] = await conn.query(
            'SELECT vchestado, vchticket FROM tblpagos WHERE vchexternalref = ?',
            [externalRef]
        );

        if (existente.length === 0) {
            await conn.rollback();
            return { success: false, message: 'Pago no encontrado' };
        }

        if (existente[0].vchestado === 'completado') {
            await conn.rollback();
            return { success: true, message: 'Pago ya estaba procesado', ticket: existente[0].vchticket };
        }

        // Actualizar registro de pago
        const sqlPago = `
            UPDATE tblpagos 
            SET vchestado = 'completado',
                vchpaymentid = ?,
                dtfechapago = NOW()
            WHERE vchexternalref = ?
            AND vchestado = 'pendiente'
        `;
        await conn.query(sqlPago, [paymentId, externalRef]);

        const ticket = existente[0].vchticket;

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
async function marcarPagoFallido(externalRef, motivo) {
    const sql = `
        UPDATE tblpagos 
        SET vchestado = 'fallido'
        WHERE vchexternalref = ?
        AND vchestado = 'pendiente'
    `;
    await db.query(sql, [externalRef]);
}

// Marcar pago como cancelado
async function marcarPagoCancelado(externalRef) {
    const sql = `
        UPDATE tblpagos 
        SET vchestado = 'cancelado'
        WHERE vchexternalref = ?
        AND vchestado = 'pendiente'
    `;
    await db.query(sql, [externalRef]);
}

// Obtener historial de pagos de un usuario
async function obtenerHistorialPagos(matricula) {
    const sql = `
        SELECT 
            p.intidpago,
            p.vchticket,
            p.flmonto,
            p.vchestado,
            p.vchpaymentid,
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

// Obtener un pago por su external reference (para pagina de exito)
async function obtenerPagoPorExternalRef(externalRef, matricula) {
    const sql = `
        SELECT 
            p.intidpago,
            p.vchticket,
            p.flmonto,
            p.vchestado,
            p.vchpaymentid,
            p.dtfechapago,
            l.vchtitulo AS titulo_libro
        FROM tblpagos p
        INNER JOIN tblprestamos pr ON p.vchticket = pr.vchticket
        INNER JOIN tblejemplares e ON pr.intidejemplar = e.intidejemplar
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        WHERE p.vchexternalref = ?
        AND p.intmatricula_usuario = ?
        LIMIT 1
    `;
    const [rows] = await db.query(sql, [externalRef, matricula]);
    return rows[0] || null;
}

export {
    obtenerSancionPorTicket,
    registrarPagoPendiente,
    buscarPagoPorExternalRef,
    completarPago,
    marcarPagoFallido,
    marcarPagoCancelado,
    obtenerHistorialPagos,
    obtenerPagoPorExternalRef
};