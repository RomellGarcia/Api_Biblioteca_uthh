import db from '../config/db.js';

// Obtener préstamos agrupados por libro y por mes (últimos N meses)
async function obtenerPrestamosPorLibro(meses = 6) {
    const sql = `
        SELECT
            l.vchfolio,
            l.vchtitulo AS nombre,
            c.vchcategoria AS categoria,
            DATE_FORMAT(p.fecha_prestamo, '%Y-%m') AS mes,  
            COUNT(p.intidprestamo) AS total
        FROM tblprestamos p
        INNER JOIN tblejemplares e ON p.intidejemplar = e.intidejemplar
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE p.fecha_prestamo >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)  
        GROUP BY l.vchfolio, l.vchtitulo, c.vchcategoria, DATE_FORMAT(p.fecha_prestamo, '%Y-%m')
        ORDER BY l.vchtitulo ASC, mes ASC
    `;
    const [rows] = await db.query(sql, [meses]);
    return rows;
}

async function obtenerPrestamosPorCategoria(meses = 6) {
    const sql = `
        SELECT
            c.intidcategoria,
            c.vchcategoria AS nombre,
            DATE_FORMAT(p.fecha_prestamo, '%Y-%m') AS mes,  
            COUNT(p.intidprestamo) AS total
        FROM tblprestamos p
        INNER JOIN tblejemplares e ON p.intidejemplar = e.intidejemplar
        INNER JOIN tbllibros l ON e.vchfolio = l.vchfolio
        INNER JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE p.fecha_prestamo >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)  
        GROUP BY c.intidcategoria, c.vchcategoria, DATE_FORMAT(p.fecha_prestamo, '%Y-%m')
        ORDER BY c.vchcategoria ASC, mes ASC
    `;
    const [rows] = await db.query(sql, [meses]);
    return rows;
}

// Obtener estadísticas generales
async function obtenerEstadisticasGenerales() {
    const sqlTotal = `
        SELECT
            COUNT(CASE WHEN p.fecha_prestamo >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN 1 END) AS total_mes_actual,
            COUNT(CASE WHEN p.fecha_prestamo >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
                AND p.fecha_prestamo < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN 1 END) AS total_mes_anterior,
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
    var resultado = [];
    var ahora = new Date();
    // Generar los últimos N meses en orden ascendente
    for (var i = meses - 1; i >= 0; i--) {
        var d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        var anio = d.getFullYear();
        var mes = d.getMonth() + 1;
        var mesStr = anio + '-' + (mes < 10 ? '0' + mes : '' + mes);
        resultado.push(mesStr);
    }
    return resultado;
}

export {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
};