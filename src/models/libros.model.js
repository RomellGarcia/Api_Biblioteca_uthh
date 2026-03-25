import conexion from '../config/db.js';

// Helper para asignar color de fondo aleatorio
const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F4A460'];
function colorAleatorio() {
    return colores[Math.floor(Math.random() * colores.length)];
}

// Obtener libros recomendados aleatorios
async function obtenerLibrosRecomendados() {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial,
               l.intanio, l.vchimagen, c.vchcategoria
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        ORDER BY RAND() LIMIT 8
    `;
    const [resultados] = await conexion.query(sql);

    return resultados.map(libro => ({
        ...libro,
        imagen: libro.vchimagen || null,
        color_fondo: !libro.vchimagen ? colorAleatorio() : undefined
    }));
}

// Obtener categorías con libros
async function obtenerCategorias() {
    const sql = `
        SELECT c.intidcategoria, c.vchcategoria, c.vchdescripcion, c.vchimagen
        FROM tblcategoria c
        INNER JOIN tbllibros l ON c.intidcategoria = l.intidcategoria
        GROUP BY c.intidcategoria, c.vchcategoria, c.vchdescripcion, c.vchimagen
        ORDER BY c.vchcategoria ASC
    `;
    const [resultados] = await conexion.query(sql);

    return resultados.map(categoria => ({
        intidcategoria: categoria.intidcategoria,
        vchcategoria: categoria.vchcategoria,
        vchdescripcion: categoria.vchdescripcion,
        icono: categoria.vchimagen || null
    }));
}

// Obtener libros más pedidos
async function obtenerLibrosMasPedidos() {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.vchimagen,
               c.vchcategoria, COUNT(p.intidprestamo) as total_prestamos
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
        LEFT JOIN tblprestamos p ON e.intidejemplar = p.intidejemplar
        GROUP BY l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.vchimagen, c.vchcategoria
        ORDER BY total_prestamos DESC, RAND() LIMIT 6
    `;
    const [resultados] = await conexion.query(sql);

    return resultados.map(libro => ({
        ...libro,
        imagen: libro.vchimagen || null,
        color_fondo: !libro.vchimagen ? colorAleatorio() : undefined
    }));
}

// Obtener catálogo completo
async function obtenerCatalogo() {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.intanio,
               l.vchsinopsis, l.intidcategoria, l.boolactivo, l.vchimagen,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio) as total_ejemplares
        FROM tbllibros l ORDER BY l.vchfolio DESC
    `;
    const [resultados] = await conexion.query(sql);

    return resultados.map(libro => ({
        ...libro,
        imagen: libro.vchimagen || null
    }));
}

// Buscar libros por título o autor
async function buscarLibros(q) {
    const sql = `
        SELECT l.*, c.vchcategoria,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE l.vchtitulo LIKE ? OR l.vchautor LIKE ?
    `;
    const [resultados] = await conexion.query(sql, [`%${q}%`, `%${q}%`]);

    return resultados.map(libro => ({
        ...libro,
        imagen: libro.vchimagen || null,
        color_fondo: !libro.vchimagen ? colorAleatorio() : undefined
    }));
}

// Obtener detalle de un libro por folio
async function obtenerDetalle(folio) {
    const sql = `
        SELECT l.*, c.vchcategoria,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio) as total_ejemplares
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE l.vchfolio = ?
    `;

    const [resultados] = await conexion.query(sql, [folio]);

    if (!resultados || resultados.length === 0) {
        return null;
    }

    const data = resultados[0];

    return {
        ...data,
        imagen: data.vchimagen || null
    };
}

// Obtener libros de una categoría específica
async function obtenerPorCategoria(categoriaId) {
    const sqlCategoria = "SELECT vchcategoria, vchdescripcion FROM tblcategoria WHERE intidcategoria = ?";
    const [resCategoria] = await conexion.query(sqlCategoria, [categoriaId]);

    if (resCategoria.length === 0) return null;

    const sqlLibros = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial,
               l.intanio, l.vchimagen, l.vchisbn, l.boolactivo,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio) as total_ejemplares
        FROM tbllibros l
        WHERE l.intidcategoria = ? ORDER BY l.vchtitulo ASC
    `;
    const [resLibros] = await conexion.query(sqlLibros, [categoriaId]);

    const libros = resLibros.map(libro => ({
        ...libro,
        imagen: libro.vchimagen || null,
        color_fondo: !libro.vchimagen ? colorAleatorio() : undefined
    }));

    return {
        categoria: {
            id: categoriaId,
            nombre: resCategoria[0].vchcategoria,
            descripcion: resCategoria[0].vchdescripcion
        },
        libros
    };
}

// Insertar nuevo libro
async function registrarLibro(datos) {
    const {
        vchfolio, vchtitulo, vchautor, vcheditorial,
        intanio, vchisbn, vchsinopsis, intidcategoria, vchimagen
    } = datos;

    const sql = `
        INSERT INTO tbllibros 
        (vchfolio, vchtitulo, vchautor, vcheditorial, intanio, vchisbn, vchsinopsis, intidcategoria, vchimagen, boolactivo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    const [res] = await conexion.query(sql, [
        vchfolio, vchtitulo, vchautor, vcheditorial,
        intanio, vchisbn, vchsinopsis, intidcategoria, vchimagen
    ]);
    return res;
}

export {
    obtenerLibrosRecomendados,
    obtenerCategorias,
    obtenerLibrosMasPedidos,
    obtenerCatalogo,
    buscarLibros,
    obtenerDetalle,
    obtenerPorCategoria,
    registrarLibro
};