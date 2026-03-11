const conexion = require('../config/db');

// Obtener todos los préstamos con filtros opcionales
function obtenerPrestamos(filtro, busqueda, callback) {
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
    conexion.query(sql, params, callback);
}

// Buscar ejemplares disponibles por término
function buscarEjemplares(termino, callback) {
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
    conexion.query(sql, [t, t, t, t, t, t, t], callback);
}

// Buscar usuario por matrícula con sus préstamos pendientes
function buscarUsuarioConPrestamos(matricula, callback) {
    const sql = `
        SELECT u.intmatricula, u.vchnombre, u.vchapaterno, u.vchamaterno,
               u.vchcorreo, u.vchtelefono, r.vchrol
        FROM tblusuarios u
        LEFT JOIN tblroles r ON u.intidrol = r.intidrol
        WHERE u.intmatricula = ?
    `;
    conexion.query(sql, [matricula], (error, resultados) => {
        if (error) return callback(error, null);
        if (resultados.length === 0) return callback(null, null);

        const usuario = resultados[0];
        const sqlPendientes = "SELECT COUNT(*) as pendientes FROM tblprestamos WHERE intmatricula_usuario = ? AND booldevuelto = 0";
        conexion.query(sqlPendientes, [matricula], (errorP, resPendientes) => {
            usuario.prestamos_pendientes = resPendientes && resPendientes[0] ? resPendientes[0].pendientes : 0;
            callback(null, usuario);
        });
    });
}

// Generar ticket único
function generarTicket(callback) {
    const anio = new Date().getFullYear();
    const sql = "SELECT vchticket FROM tblprestamos WHERE vchticket LIKE ? ORDER BY intidprestamo DESC LIMIT 1";
    conexion.query(sql, [`TK-${anio}-%`], (error, resultados) => {
        if (error) return callback(error, null);
        let numero = 1;
        if (resultados.length > 0) {
            const partes = resultados[0].vchticket.split('-');
            numero = parseInt(partes[partes.length - 1]) + 1;
        }
        const ticket = `TK-${anio}-${String(numero).padStart(3, '0')}`;
        callback(null, ticket);
    });
}

// Registrar nuevo préstamo (con transacción)
function registrarPrestamo(datos, callback) {
    const { vchticket, intmatriculausuario, matriculaEmpleado, idRol, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones } = datos;

    conexion.beginTransaction(error => {
        if (error) return callback(error, null);

        // Verificar que el usuario existe
        conexion.query("SELECT intmatricula FROM tblusuarios WHERE intmatricula = ?", [intmatriculausuario], (errorU, resU) => {
            if (errorU || resU.length === 0) {
                return conexion.rollback(() => callback(null, { ok: false, mensaje: `El usuario con matrícula ${intmatriculausuario} no existe` }));
            }

            // Verificar que el empleado existe en su tabla
            const tablaEmpleado = idRol === 1 ? 'tbladministrador' : 'tblempleados';
            conexion.query(`SELECT intmatricula FROM ${tablaEmpleado} WHERE intmatricula = ?`, [matriculaEmpleado], (errorE, resE) => {
                if (errorE || resE.length === 0) {
                    const tipo = idRol === 1 ? 'administrador' : 'empleado';
                    return conexion.rollback(() => callback(null, { ok: false, mensaje: `La matrícula ${matriculaEmpleado} no existe en la tabla de ${tipo}s` }));
                }

                // Verificar disponibilidad del ejemplar
                conexion.query("SELECT booldisponible FROM tblejemplares WHERE intidejemplar = ?", [intidejemplar], (errorV, resV) => {
                    if (errorV || resV.length === 0 || resV[0].booldisponible != 1) {
                        return conexion.rollback(() => callback(null, { ok: false, mensaje: 'El ejemplar ya no está disponible' }));
                    }

                    // Insertar préstamo
                    const sqlPrestamo = `
                        INSERT INTO tblprestamos 
                        (vchticket, intmatricula_usuario, intmatricula_empleado, 
                         fecha_prestamo, fecha_devolucion, booldevuelto, intidejemplar, vchobservaciones)
                        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                    `;
                    conexion.query(sqlPrestamo, [vchticket, intmatriculausuario, matriculaEmpleado, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones || null], (errorP, resP) => {
                        if (errorP) {
                            return conexion.rollback(() => callback(errorP, null));
                        }

                        // Marcar ejemplar como no disponible
                        conexion.query("UPDATE tblejemplares SET booldisponible = 0 WHERE intidejemplar = ?", [intidejemplar], (errorA) => {
                            if (errorA) return conexion.rollback(() => callback(errorA, null));

                            conexion.commit(errorC => {
                                if (errorC) return conexion.rollback(() => callback(errorC, null));
                                callback(null, { ok: true, idprestamo: resP.insertId, ticket: vchticket });
                            });
                        });
                    });
                });
            });
        });
    });
}

// Marcar sanción como pagada
function pagarSancion(intiddevolucion, callback) {
    const sql = "UPDATE tbldevolucion SET boolsancion = 1 WHERE intiddevolucion = ?";
    conexion.query(sql, [intiddevolucion], callback);
}

// Buscar préstamo por ticket
function buscarPorTicket(ticket, callback) {
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
    conexion.query(sql, [ticket], callback);
}

// Registrar devolución (con transacción)
function registrarDevolucion(datos, callback) {
    const { intidprestamo, intidejemplar, intmatricula_empleado, vchentrega, fechareal_devolucion, vchsancion, flmontosancion, boolsancion } = datos;

    conexion.beginTransaction(error => {
        if (error) return callback(error, null);

        // Verificar que el préstamo existe y no fue devuelto
        conexion.query("SELECT booldevuelto FROM tblprestamos WHERE intidprestamo = ?", [intidprestamo], (errorV, resV) => {
            if (errorV || resV.length === 0) {
                return conexion.rollback(() => callback(null, { ok: false, mensaje: 'Préstamo no encontrado' }));
            }
            if (resV[0].booldevuelto == 1) {
                return conexion.rollback(() => callback(null, { ok: false, mensaje: 'Este préstamo ya fue devuelto anteriormente' }));
            }

            // Obtener ID estado entrega
            conexion.query("SELECT intidestrega FROM tblestadoentrega WHERE vchestadoentrega = ?", [vchentrega], (errorE, resE) => {
                let intidestrega = null;
                if (resE && resE.length > 0) {
                    intidestrega = resE[0].intidestrega;
                } else {
                    if (vchentrega === 'Bueno') intidestrega = 1;
                    else if (vchentrega === 'Regular') intidestrega = 2;
                    else if (vchentrega === 'Mal') intidestrega = 3;
                }

                const montoSancion = flmontosancion ? parseFloat(flmontosancion) : 0;
                const sancionCumplida = boolsancion ? 1 : 0;

                // Insertar devolución
                const sqlDev = `
                    INSERT INTO tbldevolucion 
                    (intidprestamo, fechareal_devolucion, intmatricula_empleado, 
                     vchsancion, flmontosancion, boolsancion, intidestrega)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                conexion.query(sqlDev, [intidprestamo, fechareal_devolucion, intmatricula_empleado, vchsancion || null, montoSancion, sancionCumplida, intidestrega], (errorD, resD) => {
                    if (errorD) return conexion.rollback(() => callback(errorD, null));

                    // Marcar préstamo como devuelto
                    conexion.query("UPDATE tblprestamos SET booldevuelto = 1 WHERE intidprestamo = ?", [intidprestamo], (errorUP) => {
                        if (errorUP) return conexion.rollback(() => callback(errorUP, null));

                        // Liberar ejemplar
                        conexion.query("UPDATE tblejemplares SET booldisponible = 1 WHERE intidejemplar = ?", [intidejemplar], (errorUE) => {
                            if (errorUE) return conexion.rollback(() => callback(errorUE, null));

                            conexion.commit(errorC => {
                                if (errorC) return conexion.rollback(() => callback(errorC, null));
                                callback(null, { ok: true, iddevolucion: resD.insertId, montoSancion });
                            });
                        });
                    });
                });
            });
        });
    });
}

module.exports = {
    obtenerPrestamos,
    buscarEjemplares,
    buscarUsuarioConPrestamos,
    generarTicket,
    registrarPrestamo,
    pagarSancion,
    buscarPorTicket,
    registrarDevolucion
};