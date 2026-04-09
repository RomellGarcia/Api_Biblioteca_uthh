import db from '../config/db.js';

// Obtener préstamos agrupados por libro y por mes (últimos N meses)
async function obtenerPrestamosPorLibro(meses = 6) {
    const sql = `
        SELECT 
            l.vchfolio,
            l.vchtitulo AS nombre,
            c.vchcategoria AS categoria,
            DATE_FORMAT(p.dtfecharegistro, '%Y-%m') AS mes,
            COUNT(p.intidprestamo) AS total
        FROM tblprestamos p
        INNER JOIN tblejemplares e ON p.intidejemplar = e.intidejemplar
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE p.dtfecharegistro >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY l.vchfolio, l.vchtitulo, c.vchcategoria, DATE_FORMAT(p.dtfecharegistro, '%Y-%m')
        ORDER BY l.vchtitulo ASC, mes ASC
    `;
    const [rows] = await db.query(sql, [meses]);
    return rows;
}

// Obtener préstamos agrupados por categoría y por mes
async function obtenerPrestamosPorCategoria(meses = 6) {
    const sql = `
        SELECT 
            c.intidcategoria,
            c.vchcategoria AS nombre,
            DATE_FORMAT(p.dtfecharegistro, '%Y-%m') AS mes,
            COUNT(p.intidprestamo) AS total
        FROM tblprestamos p
        INNER JOIN tblejemplares e ON p.intidejemplar = e.intidejemplar
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        INNER JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE p.dtfecharegistro >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY c.intidcategoria, c.vchcategoria, DATE_FORMAT(p.dtfecharegistro, '%Y-%m')
        ORDER BY c.vchcategoria ASC, mes ASC
    `;
    const [rows] = await db.query(sql, [meses]);
    return rows;
}

// Obtener estadísticas generales
async function obtenerEstadisticasGenerales() {
    const sqlTotal = `
        SELECT 
            COUNT(CASE WHEN p.dtfecharegistro >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN 1 END) AS total_mes_actual,
            COUNT(CASE WHEN p.dtfecharegistro >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) 
                        AND p.dtfecharegistro < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN 1 END) AS total_mes_anterior,
            COUNT(p.intidprestamo) AS total_historico,
            COUNT(CASE WHEN p.booldevuelto = 0 THEN 1 END) AS prestamos_activos
        FROM tblprestamos p
    `;

    const sqlLibros = `
        SELECT COUNT(DISTINCT l.vchfolio) AS total_libros
        FROM tbllibros l
        WHERE l.boolactivo = 1
    `;

    const sqlCategorias = `
        SELECT COUNT(DISTINCT c.intidcategoria) AS total_categorias
        FROM tblcategoria c
    `;

    const [totales] = await db.query(sqlTotal);
    const [libros] = await db.query(sqlLibros);
    const [categorias] = await db.query(sqlCategorias);

    return {
        ...totales[0],
        ...libros[0],
        ...categorias[0]
    };
}

// Obtener lista de meses disponibles para el rango solicitado
async function obtenerMesesDisponibles(meses = 6) {
    const sql = `
        SELECT DISTINCT DATE_FORMAT(p.dtfecharegistro, '%Y-%m') AS mes
        FROM tblprestamos p
        WHERE p.dtfecharegistro >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        ORDER BY mes ASC
    `;
    const [rows] = await db.query(sql, [meses]);
    return rows.map(r => r.mes);
}

export {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
};