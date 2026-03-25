import conexion from '../config/db.js';

// Obtener todos los préstamos con filtros opcionales
async function obtenerPrestamos(filtro, busqueda) {
    let sql = `
        SELECT 
            p.intidprestamo, p.vchticket, p.intmatricula_usuario, p.intmatricula_empleado,
            p.fecha_prestamo, p.fecha_devolucion, p.booldevuelto, p.vchobservaciones,
            p.intidejemplar, p.dtfecharegistro,
            CONCAT(u.vchnombre, ' ', u.vchapaterno, ' ', COALESCE(u.vchamaterno, '')) as nombre_usuario,
            u.vchcorreo as correo_usuario, u.vchtelefono as telefono_usuario,
            CONCAT(e.vchnombre, ' ', e.vchapaterno, ' ', COALESCE(e.vchamaterno, '')) as nombre_empleado,
            l.vchtitulo as titulo_libro, l.vchautor as autor_libro, l.vchfolio,
            ej.vchcodigobarras, ej.vchedicion,
            d.intiddevolucion, d.fechareal_devolucion, d.intmatricula_empleado as matricula_recibio,
            d.vchsancion, d.flmontosancion, d.boolsancion, d.intidestrega,
            COALESCE(
                CONCAT(emp.vchnombre, ' ', emp.vchapaterno, ' ', COALESCE(emp.vchamaterno, '')),
                CONCAT(adm.vchnombre, ' ', adm.vchapaterno, ' ', COALESCE(adm.vchamaterno, ''))
            ) as nombre_recibio,
            DATEDIFF(p.fecha_devolucion, CURDATE()) as dias_restantes,
            CASE 
                WHEN p.booldevuelto = 1 THEN 'devuelto'
                WHEN p.booldevuelto = 0 AND CURDATE() > p.fecha_devolucion THEN 'vencido'
                WHEN p.booldevuelto = 0 AND DATEDIFF(p.fecha_devolucion, CURDATE()) <= 3 THEN 'proximo'
                WHEN p.booldevuelto = 0 THEN 'activo'
                ELSE 'activo'
            END as estado
        FROM tblprestamos p
        LEFT JOIN tblusuarios u ON p.intmatricula_usuario = u.intmatricula
        LEFT JOIN tblusuarios e ON p.intmatricula_empleado = e.intmatricula
        LEFT JOIN tblejemplares ej ON p.intidejemplar = ej.intidejemplar
        LEFT JOIN tbllibros l ON ej.vchfolio = l.vchfolio
        LEFT JOIN tbldevolucion d ON p.intidprestamo = d.intidprestamo
        LEFT JOIN tblempleados emp ON d.intmatricula_empleado = emp.intmatricula
        LEFT JOIN tbladministrador adm ON d.intmatricula_empleado = adm.intmatricula
        WHERE 1=1
    `;

    const params = [];

    if (filtro === 'activos') {
        sql += " AND p.booldevuelto = 0 AND CURDATE() <= p.fecha_devolucion";
    } else if (filtro === 'devueltos') {
        sql += " AND p.booldevuelto = 1";
    } else if (filtro === 'vencidos') {
        sql += " AND p.booldevuelto = 0 AND CURDATE() > p.fecha_devolucion";
    } else if (filtro === 'proximos') {
        sql += " AND p.booldevuelto = 0 AND DATEDIFF(p.fecha_devolucion, CURDATE()) BETWEEN 0 AND 3";
    } else if (filtro === 'con_sancion') {
        sql += " AND d.flmontosancion > 0 AND d.boolsancion = 0";
    }

    if (busqueda && busqueda.trim()) {
        sql += ` AND (
            p.vchticket LIKE ? OR p.intmatricula_usuario LIKE ? OR
            u.vchnombre LIKE ? OR u.vchapaterno LIKE ? OR u.vchamaterno LIKE ? OR
            l.vchtitulo LIKE ? OR l.vchautor LIKE ? OR ej.vchcodigobarras LIKE ?
        )`;
        const b = `%${busqueda}%`;
        params.push(b, b, b, b, b, b, b, b);
    }

    sql += " ORDER BY p.fecha_prestamo DESC";

    const [resultados] = await conexion.query(sql, params);
    return resultados;
}

// Buscar ejemplares disponibles por término
async function buscarEjemplares(termino) {
    const t = `%${termino}%`;
    const sql = `
        SELECT 
            e.intidejemplar, e.vchcodigobarras, e.vchedicion, e.vchfolio,
            e.booldisponible, e.intidestado,
            l.vchtitulo, l.vchautor, l.vcheditorial, l.vchisbn, l.imagen, l.intanio,
            c.vchcategoria,
            u.vchubicacion, u.vchdescripcion AS descripcion_ubicacion,
            es.vchestadolibro,
            (SELECT COUNT(*) FROM tblejemplares 
             WHERE vchfolio = l.vchfolio AND booldisponible = 1) as ejemplares_disponibles
        FROM tblejemplares e
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        LEFT JOIN tblubicacion u ON e.intidubicacion = u.intidubicacion
        LEFT JOIN tblestado es ON e.intidestado = es.intidestado
        WHERE e.booldisponible = 1
        AND (l.vchtitulo LIKE ? OR l.vchautor LIKE ? OR l.vchisbn LIKE ? OR
             l.vcheditorial LIKE ? OR e.vchcodigobarras LIKE ? OR e.vchfolio LIKE ? OR
             c.vchcategoria LIKE ?)
        ORDER BY l.vchtitulo ASC LIMIT 50
    `;
    const [resultados] = await conexion.query(sql, [t, t, t, t, t, t, t]);
    return resultados;
}

// Buscar usuario por matrícula con sus préstamos pendientes
async function buscarUsuarioConPrestamos(matricula) {
    const sql = `
        SELECT u.intmatricula, u.vchnombre, u.vchapaterno, u.vchamaterno,
               u.vchcorreo, u.vchtelefono, r.vchrol
        FROM tblusuarios u
        LEFT JOIN tblroles r ON u.intidrol = r.intidrol
        WHERE u.intmatricula = ?
    `;
    const [resultados] = await conexion.query(sql, [matricula]);

    if (resultados.length === 0) return null;

    const usuario = resultados[0];
    const sqlPendientes = "SELECT COUNT(*) as pendientes FROM tblprestamos WHERE intmatricula_usuario = ? AND booldevuelto = 0";
    const [resPendientes] = await conexion.query(sqlPendientes, [matricula]);

    usuario.prestamos_pendientes = resPendientes && resPendientes[0] ? resPendientes[0].pendientes : 0;
    return usuario;
}

// Generar ticket único
async function generarTicket() {
    const anio = new Date().getFullYear();
    const sql = "SELECT vchticket FROM tblprestamos WHERE vchticket LIKE ? ORDER BY intidprestamo DESC LIMIT 1";
    const [resultados] = await conexion.query(sql, [`TK-${anio}-%`]);

    let numero = 1;
    if (resultados.length > 0) {
        const partes = resultados[0].vchticket.split('-');
        numero = parseInt(partes[partes.length - 1]) + 1;
    }
    return `TK-${anio}-${String(numero).padStart(3, '0')}`;
}

// Registrar nuevo préstamo (con transacción)
async function registrarPrestamo(datos) {
    const { vchticket, intmatriculausuario, matriculaEmpleado, idRol, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones } = datos;
    const conn = await conexion.getConnection();

    try {
        await conn.beginTransaction();

        // Verificar usuario
        const [resU] = await conn.query("SELECT intmatricula FROM tblusuarios WHERE intmatricula = ?", [intmatriculausuario]);
        if (resU.length === 0) {
            await conn.rollback();
            return { ok: false, mensaje: `El usuario con matrícula ${intmatriculausuario} no existe` };
        }

        // Verificar empleado/admin
        let resE;
        if (idRol === 1) {
            [resE] = await conn.query("SELECT intmatricula FROM tbladministrador WHERE intmatricula = ?", [matriculaEmpleado]);
        } else {
            [resE] = await conn.query("SELECT intmatricula FROM tblusuarios WHERE intmatricula = ? AND intidrol = 2", [matriculaEmpleado]);
        }

        if (resE.length === 0) {
            const tipo = idRol === 1 ? 'administrador' : 'empleado';
            await conn.rollback();
            return { ok: false, mensaje: `La matrícula ${matriculaEmpleado} no existe en la tabla de ${tipo}s` };
        }

        // Verificar disponibilidad del ejemplar
        const [resV] = await conn.query("SELECT booldisponible FROM tblejemplares WHERE intidejemplar = ?", [intidejemplar]);
        if (resV.length === 0 || resV[0].booldisponible != 1) {
            await conn.rollback();
            return { ok: false, mensaje: 'El ejemplar ya no está disponible' };
        }

        // Insertar préstamo
        const sqlPrestamo = `
            INSERT INTO tblprestamos 
            (vchticket, intmatricula_usuario, intmatricula_empleado, 
             fecha_prestamo, fecha_devolucion, booldevuelto, intidejemplar, vchobservaciones)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `;
        const [resP] = await conn.query(sqlPrestamo, [vchticket, intmatriculausuario, matriculaEmpleado, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones || null]);

        // Actualizar ejemplar a no disponible
        await conn.query("UPDATE tblejemplares SET booldisponible = 0 WHERE intidejemplar = ?", [intidejemplar]);

        // Si todo sale bien confirmamos la transacción
        await conn.commit();
        return { ok: true, idprestamo: resP.insertId, ticket: vchticket };

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// Marcar sanción como pagada
async function pagarSancion(intiddevolucion) {
    const sql = "UPDATE tbldevolucion SET boolsancion = 1 WHERE intiddevolucion = ?";
    const [resultado] = await conexion.query(sql, [intiddevolucion]);
    return resultado;
}

// Buscar préstamo por ticket
async function buscarPorTicket(ticket) {
    const sql = `
        SELECT p.intidprestamo, p.vchticket, p.intmatricula_usuario, p.intmatricula_empleado,
               p.fecha_prestamo, p.fecha_devolucion, p.booldevuelto, p.intidejemplar,
               CONCAT(u.vchnombre, ' ', u.vchapaterno, ' ', COALESCE(u.vchamaterno, '')) as nombre_usuario,
               l.vchtitulo as titulo_libro, l.vchautor as autor_libro,
               ej.vchcodigobarras
        FROM tblprestamos p
        LEFT JOIN tblusuarios u ON p.intmatricula_usuario = u.intmatricula
        LEFT JOIN tblejemplares ej ON p.intidejemplar = ej.intidejemplar
        LEFT JOIN tbllibros l ON ej.vchfolio = l.vchfolio
        WHERE p.vchticket = ?
    `;
    const [resultados] = await conexion.query(sql, [ticket]);
    return resultados;
}

// Registrar devolución (con transacción)
async function registrarDevolucion(datos) {
    const { intidprestamo, intidejemplar, intmatricula_empleado, vchentrega, fechareal_devolucion, vchsancion, flmontosancion, boolsancion } = datos;

    const conn = await conexion.getConnection();

    try {
        await conn.beginTransaction();

        // Verificar estado del préstamo
        const [resV] = await conn.query("SELECT booldevuelto FROM tblprestamos WHERE intidprestamo = ?", [intidprestamo]);
        if (resV.length === 0) {
            await conn.rollback();
            return { ok: false, mensaje: 'Préstamo no encontrado' };
        }
        if (resV[0].booldevuelto == 1) {
            await conn.rollback();
            return { ok: false, mensaje: 'Este préstamo ya fue devuelto' };
        }

        // Obtener ID estado entrega
        const [resE] = await conn.query("SELECT intidestrega FROM tblestadoentrega WHERE vchestadoentrega = ?", [vchentrega]);
        let intidestrega = (resE && resE.length > 0) ? resE[0].intidestrega :
            (vchentrega === 'Bueno' ? 1 : vchentrega === 'Regular' ? 2 : 3);

        const montoSancion = flmontosancion ? parseFloat(flmontosancion) : 0;
        const sancionCumplida = boolsancion ? 1 : 0;

        // Insertar devolución
        const sqlDev = `INSERT INTO tbldevolucion (intidprestamo, fechareal_devolucion, intmatricula_empleado, vchsancion, flmontosancion, boolsancion, intidestrega) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [resD] = await conn.query(sqlDev, [intidprestamo, fechareal_devolucion, intmatricula_empleado, vchsancion || null, montoSancion, sancionCumplida, intidestrega]);

        // Marcar préstamo como devuelto
        await conn.query("UPDATE tblprestamos SET booldevuelto = 1 WHERE intidprestamo = ?", [intidprestamo]);

        // Liberar ejemplar
        await conn.query("UPDATE tblejemplares SET booldisponible = 1 WHERE intidejemplar = ?", [intidejemplar]);

        await conn.commit();
        return { ok: true, iddevolucion: resD.insertId, montoSancion };

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// Obtener préstamos de un usuario específico
const obtenerPrestamosUsuario = async (matricula) => {
    const sql = `
        SELECT 
            p.intidprestamo, p.vchticket, p.fecha_prestamo, p.fecha_devolucion,
            p.booldevuelto, p.vchobservaciones,
            l.vchtitulo AS titulo_libro, l.vchautor AS autor_libro, l.vchfolio,
            ej.vchcodigobarras, ej.vchedicion,
            d.fechareal_devolucion, d.flmontosancion, d.boolsancion, d.vchsancion,
            DATEDIFF(p.fecha_devolucion, CURDATE()) AS dias_restantes,
            CASE 
                WHEN p.booldevuelto = 1 THEN 'devuelto'
                WHEN p.booldevuelto = 0 AND CURDATE() > p.fecha_devolucion THEN 'vencido'
                WHEN p.booldevuelto = 0 AND DATEDIFF(p.fecha_devolucion, CURDATE()) <= 3 THEN 'proximo'
                ELSE 'activo'
            END AS estado
        FROM tblprestamos p
        LEFT JOIN tblejemplares ej ON p.intidejemplar = ej.intidejemplar
        LEFT JOIN tbllibros     l  ON ej.vchfolio     = l.vchfolio
        LEFT JOIN tbldevolucion d  ON p.intidprestamo = d.intidprestamo
        WHERE p.intmatricula_usuario = ?
        ORDER BY p.fecha_prestamo DESC
    `;
    const [rows] = await conexion.query(sql, [matricula]);
    return rows;
};

export {
    obtenerPrestamos,
    buscarEjemplares,
    buscarUsuarioConPrestamos,
    generarTicket,
    registrarPrestamo,
    pagarSancion,
    buscarPorTicket,
    registrarDevolucion,
    obtenerPrestamosUsuario
};