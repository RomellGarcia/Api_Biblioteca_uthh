// prestamo.model.js - Modelo de préstamos y devoluciones
const conexion = require('../config/database.config');

const PrestamoModel = {
    /**
     * Obtener todos los préstamos con filtros
     */
    obtenerPrestamos: (filtro = 'todos', busqueda = '') => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    p.intidprestamo,
                    p.vchticket,
                    p.intmatricula_usuario,
                    p.intmatricula_empleado,
                    p.fecha_prestamo,
                    p.fecha_devolucion,
                    p.booldevuelto,
                    p.vchobservaciones,
                    CONCAT(u.vchnombre, ' ', u.vchapaterno, ' ', COALESCE(u.vchamaterno, '')) as nombre_usuario,
                    l.vchtitulo as titulo_libro,
                    l.vchautor as autor_libro,
                    ej.vchcodigobarras,
                    ej.intidejemplar,
                    d.fechareal_devolucion,
                    d.flmontosancion,
                    d.boolsancion,
                    d.vchsancion,
                    d.intiddevolucion,
                    DATEDIFF(CURDATE(), p.fecha_devolucion) as dias_diferencia,
                    CASE 
                        WHEN p.booldevuelto = 1 THEN 'devuelto'
                        WHEN DATEDIFF(CURDATE(), p.fecha_devolucion) > 0 THEN 'vencido'
                        WHEN DATEDIFF(CURDATE(), p.fecha_devolucion) = 0 THEN 'proximo'
                        ELSE 'activo'
                    END as estado
                FROM tblprestamos p
                LEFT JOIN tblusuarios u ON p.intmatricula_usuario = u.intmatricula
                LEFT JOIN tblejemplares ej ON p.intidejemplar = ej.intidejemplar
                LEFT JOIN tbllibros l ON ej.vchfolio = l.vchfolio
                LEFT JOIN tbldevolucion d ON p.intidprestamo = d.intidprestamo
            `;

            let condiciones = [];
            let params = [];

            // Filtros de estado
            if (filtro === 'activos') {
                condiciones.push('p.booldevuelto = 0');
            } else if (filtro === 'devueltos') {
                condiciones.push('p.booldevuelto = 1');
            } else if (filtro === 'vencidos') {
                condiciones.push('p.booldevuelto = 0 AND DATEDIFF(CURDATE(), p.fecha_devolucion) > 0');
            } else if (filtro === 'proximos') {
                condiciones.push('p.booldevuelto = 0 AND DATEDIFF(CURDATE(), p.fecha_devolucion) = 0');
            } else if (filtro === 'con_sancion') {
                condiciones.push('d.flmontosancion > 0 AND d.boolsancion = 0');
            }

            // Búsqueda
            if (busqueda) {
                condiciones.push(`(
                    p.vchticket LIKE ? OR
                    u.vchnombre LIKE ? OR
                    u.vchapaterno LIKE ? OR
                    u.vchamaterno LIKE ? OR
                    l.vchtitulo LIKE ? OR
                    p.intmatricula_usuario LIKE ?
                )`);
                const terminoBusqueda = `%${busqueda}%`;
                params = [terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda];
            }

            if (condiciones.length > 0) {
                sql += ' WHERE ' + condiciones.join(' AND ');
            }

            sql += ' ORDER BY p.fecha_prestamo DESC';

            conexion.query(sql, params, (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Obtener estadísticas de préstamos
     */
    obtenerEstadisticas: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN booldevuelto = 0 THEN 1 ELSE 0 END) as activos,
                    SUM(CASE WHEN booldevuelto = 1 THEN 1 ELSE 0 END) as devueltos,
                    SUM(CASE WHEN booldevuelto = 0 AND DATEDIFF(CURDATE(), fecha_devolucion) > 0 THEN 1 ELSE 0 END) as vencidos,
                    SUM(CASE WHEN booldevuelto = 0 AND DATEDIFF(CURDATE(), fecha_devolucion) = 0 THEN 1 ELSE 0 END) as proximos,
                    (SELECT COUNT(*) FROM tbldevolucion WHERE flmontosancion > 0 AND boolsancion = 0) as con_sancion_pendiente
                FROM tblprestamos
            `;

            conexion.query(sql, (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados[0]);
            });
        });
    },

    /**
     * Buscar ejemplares disponibles para préstamo
     */
    buscarEjemplaresDisponibles: (termino) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.vchfolio,
                    l.vchtitulo,
                    l.vchautor,
                    l.vcheditorial,
                    l.vchisbn,
                    l.imagen,
                    c.vchcategoria,
                    GROUP_CONCAT(
                        CONCAT_WS('|', 
                            e.intidejemplar, 
                            e.vchcodigobarras, 
                            e.vchedicion, 
                            e.vchubicacion, 
                            e.booldisponible
                        ) SEPARATOR '||'
                    ) as ejemplares_data,
                    COUNT(e.intidejemplar) as total_ejemplares,
                    SUM(CASE WHEN e.booldisponible = 1 THEN 1 ELSE 0 END) as ejemplares_disponibles
                FROM tbllibros l
                LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
                LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
                WHERE (
                    l.vchtitulo LIKE ? OR
                    l.vchautor LIKE ? OR
                    l.vchisbn LIKE ? OR
                    l.vcheditorial LIKE ? OR
                    e.vchcodigobarras LIKE ? OR
                    l.vchfolio LIKE ? OR
                    c.vchcategoria LIKE ?
                )
                GROUP BY l.vchfolio
                HAVING ejemplares_disponibles > 0
                ORDER BY l.vchtitulo ASC
                LIMIT 50
            `;

            const terminoBusqueda = `%${termino}%`;

            conexion.query(sql, 
                [terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda, 
                 terminoBusqueda, terminoBusqueda, terminoBusqueda], 
            (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                // Procesar resultados y convertir imagen a base64
                const libros = resultados.map(libro => {
                    if (libro.imagen) {
                        libro.imagen = `data:image/jpeg;base64,${libro.imagen.toString('base64')}`;
                    }

                    // Parsear ejemplares
                    if (libro.ejemplares_data) {
                        libro.ejemplares = libro.ejemplares_data.split('||').map(ej => {
                            const [intidejemplar, vchcodigobarras, vchedicion, vchubicacion, booldisponible] = ej.split('|');
                            return {
                                intidejemplar: parseInt(intidejemplar),
                                vchcodigobarras,
                                vchedicion,
                                vchubicacion,
                                booldisponible: parseInt(booldisponible)
                            };
                        });
                        delete libro.ejemplares_data;
                    }

                    return libro;
                });

                resolve(libros);
            });
        });
    },

    /**
     * Buscar usuario por matrícula
     */
    buscarUsuarioPorMatricula: (matricula) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    u.intmatricula,
                    u.vchnombre,
                    u.vchapaterno,
                    u.vchamaterno,
                    u.vchcorreo,
                    u.vchtelefono,
                    (SELECT COUNT(*) FROM tblprestamos WHERE intmatricula_usuario = u.intmatricula AND booldevuelto = 0) as prestamos_pendientes
                FROM tblusuarios u
                WHERE u.intmatricula = ?
            `;

            conexion.query(sql, [matricula], (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Generar ticket único
     */
    generarTicket: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT vchticket 
                FROM tblprestamos 
                WHERE YEAR(fecha_prestamo) = YEAR(CURDATE())
                ORDER BY intidprestamo DESC 
                LIMIT 1
            `;

            conexion.query(sql, (error, resultados) => {
                if (error) {
                    return reject(error);
                }

                const year = new Date().getFullYear();
                let numero = 1;

                if (resultados.length > 0) {
                    const ultimoTicket = resultados[0].vchticket;
                    const match = ultimoTicket.match(/TK-\d{4}-(\d+)/);
                    if (match) {
                        numero = parseInt(match[1]) + 1;
                    }
                }

                const nuevoTicket = `TK-${year}-${String(numero).padStart(3, '0')}`;
                resolve(nuevoTicket);
            });
        });
    },

    /**
     * Registrar préstamo (con transacción)
     */
    registrarPrestamo: (datos) => {
        return new Promise((resolve, reject) => {
            conexion.beginTransaction(error => {
                if (error) {
                    return reject(error);
                }

                // 1. Validar usuario
                const sqlValidarUsuario = "SELECT intmatricula FROM tblusuarios WHERE intmatricula = ?";
                
                conexion.query(sqlValidarUsuario, [datos.intmatriculausuario], (errorU, usuarioResult) => {
                    if (errorU || usuarioResult.length === 0) {
                        return conexion.rollback(() => {
                            reject(new Error('Usuario no encontrado'));
                        });
                    }

                    // 2. Validar empleado
                    const tablaEmpleado = datos.idRolEmpleado === 1 ? 'tbladministrador' : 'tblempleados';
                    const sqlValidarEmpleado = `SELECT intmatricula FROM ${tablaEmpleado} WHERE intmatricula = ?`;
                    
                    conexion.query(sqlValidarEmpleado, [datos.intmatricula_empleado], (errorE, empleadoResult) => {
                        if (errorE || empleadoResult.length === 0) {
                            return conexion.rollback(() => {
                                reject(new Error('Empleado no encontrado'));
                            });
                        }

                        // 3. Validar disponibilidad con bloqueo FOR UPDATE
                        const sqlValidarEjemplar = `
                            SELECT booldisponible 
                            FROM tblejemplares 
                            WHERE intidejemplar = ? 
                            FOR UPDATE
                        `;
                        
                        conexion.query(sqlValidarEjemplar, [datos.intidejemplar], (errorEj, ejemplarResult) => {
                            if (errorEj || ejemplarResult.length === 0) {
                                return conexion.rollback(() => {
                                    reject(new Error('Ejemplar no encontrado'));
                                });
                            }

                            if (ejemplarResult[0].booldisponible == 0) {
                                return conexion.rollback(() => {
                                    reject(new Error('Este ejemplar no está disponible'));
                                });
                            }

                            // 4. Insertar préstamo (el trigger actualizará disponibilidad)
                            const sqlInsertPrestamo = `
                                INSERT INTO tblprestamos 
                                (vchticket, intmatricula_usuario, intmatricula_empleado, 
                                 fecha_prestamo, fecha_devolucion, intidejemplar, 
                                 vchobservaciones, booldevuelto)
                                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                            `;

                            conexion.query(sqlInsertPrestamo, 
                                [datos.vchticket, datos.intmatriculausuario, datos.intmatricula_empleado, 
                                 datos.fechaprestamo, datos.fechadevolucion, datos.intidejemplar, 
                                 datos.vchobservaciones || null],
                            (errorP, resultadoP) => {
                                if (errorP) {
                                    return conexion.rollback(() => {
                                        reject(errorP);
                                    });
                                }

                                // Commit
                                conexion.commit(errorC => {
                                    if (errorC) {
                                        return conexion.rollback(() => {
                                            reject(errorC);
                                        });
                                    }

                                    resolve({
                                        idprestamo: resultadoP.insertId,
                                        ticket: datos.vchticket
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    /**
     * Buscar préstamo por ticket
     */
    buscarPrestamoPorTicket: (ticket) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    p.intidprestamo,
                    p.vchticket,
                    p.intmatricula_usuario,
                    p.intmatricula_empleado,
                    p.fecha_prestamo,
                    p.fecha_devolucion,
                    p.booldevuelto,
                    p.intidejemplar,
                    CONCAT(u.vchnombre, ' ', u.vchapaterno, ' ', COALESCE(u.vchamaterno, '')) as nombre_usuario,
                    l.vchtitulo as titulo_libro,
                    l.vchautor as autor_libro,
                    ej.vchcodigobarras
                FROM tblprestamos p
                LEFT JOIN tblusuarios u ON p.intmatricula_usuario = u.intmatricula
                LEFT JOIN tblejemplares ej ON p.intidejemplar = ej.intidejemplar
                LEFT JOIN tbllibros l ON ej.vchfolio = l.vchfolio
                WHERE p.vchticket = ?
            `;

            conexion.query(sql, [ticket], (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Registrar devolución (con transacción)
     */
    registrarDevolucion: (datos) => {
        return new Promise((resolve, reject) => {
            conexion.beginTransaction(error => {
                if (error) {
                    return reject(error);
                }

                // 1. Verificar que el préstamo existe y no está devuelto
                const sqlVerificar = "SELECT booldevuelto FROM tblprestamos WHERE intidprestamo = ?";
                
                conexion.query(sqlVerificar, [datos.intidprestamo], (errorV, prestamoResult) => {
                    if (errorV || prestamoResult.length === 0) {
                        return conexion.rollback(() => {
                            reject(new Error('Préstamo no encontrado'));
                        });
                    }

                    if (prestamoResult[0].booldevuelto == 1) {
                        return conexion.rollback(() => {
                            reject(new Error('Este préstamo ya fue devuelto anteriormente'));
                        });
                    }

                    // 2. Obtener ID de estado de entrega
                    const sqlEstado = "SELECT intidestrega FROM tblestadoentrega WHERE vchestadoentrega = ?";
                    
                    conexion.query(sqlEstado, [datos.vchentrega], (errorE, estadoResult) => {
                        let intidestrega = null;
                        
                        if (estadoResult && estadoResult.length > 0) {
                            intidestrega = estadoResult[0].intidestrega;
                        } else {
                            // Valores por defecto
                            if (datos.vchentrega === 'Bueno') intidestrega = 1;
                            else if (datos.vchentrega === 'Regular') intidestrega = 2;
                            else if (datos.vchentrega === 'Mal') intidestrega = 3;
                        }

                        // 3. Insertar devolución (el trigger actualizará ejemplar y préstamo)
                        const sqlDevolucion = `
                            INSERT INTO tbldevolucion 
                            (intidprestamo, fechareal_devolucion, intmatricula_empleado, 
                             vchsancion, flmontosancion, boolsancion, intidestrega)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `;

                        const montoSancion = datos.flmontosancion ? parseFloat(datos.flmontosancion) : 0;
                        const sancionCumplida = datos.boolsancion ? 1 : 0;

                        conexion.query(sqlDevolucion, 
                            [datos.intidprestamo, datos.fechareal_devolucion, datos.intmatricula_empleado, 
                             datos.vchsancion || null, montoSancion, sancionCumplida, intidestrega],
                        (errorD, resultadoD) => {
                            if (errorD) {
                                return conexion.rollback(() => {
                                    reject(errorD);
                                });
                            }

                            // Commit
                            conexion.commit(errorC => {
                                if (errorC) {
                                    return conexion.rollback(() => {
                                        reject(errorC);
                                    });
                                }

                                resolve({
                                    iddevolucion: resultadoD.insertId,
                                    sancion_aplicada: montoSancion > 0,
                                    monto_sancion: montoSancion.toFixed(2)
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    /**
     * Marcar sanción como pagada
     */
    marcarSancionPagada: (idDevolucion) => {
        return new Promise((resolve, reject) => {
            const sql = "UPDATE tbldevolucion SET boolsancion = 1 WHERE intiddevolucion = ?";

            conexion.query(sql, [idDevolucion], (error, resultado) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultado);
            });
        });
    }
};

module.exports = PrestamoModel;