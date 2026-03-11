const conexion = require('../config/db');

// Helper para convertir imagen BLOB a base64
function procesarImagen(imagenBlob) {
    if (!imagenBlob) return null;
    const buffer = Buffer.from(imagenBlob);
    let mimeType = 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        mimeType = 'image/png';
    }
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Helper para asignar color de fondo aleatorio
const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F4A460'];
function colorAleatorio() {
    return colores[Math.floor(Math.random() * colores.length)];
}

// Mapeo de categorías a imágenes locales
function obtenerIconoCategoria(nombreCategoria) {
    if (!nombreCategoria) return '/images/categorias/Ciencias.png';
    const nombre = nombreCategoria.toLowerCase().trim();
    const mapa = {
        'ficción - aventura': 'Ficción_Aventura',
        'historia': 'Historia',
        'cómics': 'Comics',
        'cocina y recetas': 'Cocina',
        'diccionarios': 'Diccionario',
        'literatura juvenil': 'Literatura_Juvenil',
        'ciencias': 'Ciencias',
        'tecnología': 'Tecnologia',
        'salud y deporte': 'Salud',
        'divulgativos': 'Divulgativos',
        'administración y negocios': 'Administracion',
        'educación y pedagogía': 'Pedagogia',
        'ingeniería': 'Ingenieria',
        'filosofía': 'Filosofia',
        'programación': 'Programacion',
        'matemáticas': 'Matematicas',
        'novela': 'novelas',
        'economía': 'Economia',
        'idiomas y lingüística': 'Idiomas'
    };
    const archivo = mapa[nombre] || 'Ciencias';
    return `/images/categorias/${archivo}.png`;
}

// Obtener libros recomendados aleatorios
function obtenerLibrosRecomendados(callback) {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial,
               l.intanio, l.imagen, c.vchcategoria
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        ORDER BY RAND() LIMIT 8
    `;
    conexion.query(sql, (error, resultados) => {
        if (error) return callback(error, null);
        const libros = resultados.map(libro => ({
            ...libro,
            imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
            color_fondo: !libro.imagen ? colorAleatorio() : undefined
        }));
        callback(null, libros);
    });
}

// Obtener categorías con libros
function obtenerCategorias(callback) {
    const sql = `
        SELECT DISTINCT c.intidcategoria, c.vchcategoria, c.vchdescripcion
        FROM tblcategoria c
        LEFT JOIN tbllibros l ON c.intidcategoria = l.intidcategoria
        WHERE l.vchfolio IS NOT NULL
        GROUP BY c.intidcategoria, c.vchcategoria, c.vchdescripcion
        ORDER BY c.vchcategoria ASC
    `;
    conexion.query(sql, (error, resultados) => {
        if (error) return callback(error, null);
        const categorias = resultados.map(categoria => ({
            intidcategoria: categoria.intidcategoria,
            vchcategoria: categoria.vchcategoria,
            icono: obtenerIconoCategoria(categoria.vchcategoria)
        }));
        callback(null, categorias);
    });
}

// Obtener libros más pedidos
function obtenerLibrosMasPedidos(callback) {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.imagen,
               c.vchcategoria, COUNT(p.intidprestamo) as total_prestamos
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        LEFT JOIN tblejemplares e ON l.vchfolio = e.vchfolio
        LEFT JOIN tblprestamos p ON e.intidejemplar = p.intidejemplar
        GROUP BY l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.imagen, c.vchcategoria
        ORDER BY total_prestamos DESC, RAND() LIMIT 6
    `;
    conexion.query(sql, (error, resultados) => {
        if (error) return callback(error, null);
        const libros = resultados.map(libro => ({
            ...libro,
            imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
            color_fondo: !libro.imagen ? colorAleatorio() : undefined
        }));
        callback(null, libros);
    });
}

// Obtener catálogo completo
function obtenerCatalogo(callback) {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.intanio,
               l.vchsinopsis, l.intidcategoria, l.boolactivo, l.imagen,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio) as total_ejemplares
        FROM tbllibros l ORDER BY l.vchfolio DESC
    `;
    conexion.query(sql, (error, resultados) => {
        if (error) return callback(error, null);
        const libros = resultados.map(libro => ({
            ...libro,
            imagen: libro.imagen ? procesarImagen(libro.imagen) : null
        }));
        callback(null, libros);
    });
}

// Buscar libros por título o autor
function buscarLibros(q, callback) {
    const sql = `
        SELECT l.*, c.vchcategoria,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        WHERE l.vchtitulo LIKE ? OR l.vchautor LIKE ?
    `;
    conexion.query(sql, [`%${q}%`, `%${q}%`], (error, resultados) => {
        if (error) return callback(error, null);
        const libros = resultados.map(libro => ({
            ...libro,
            imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
            color_fondo: !libro.imagen ? colorAleatorio() : undefined
        }));
        callback(null, libros);
    });
}

// Obtener detalle de un libro por folio
function obtenerDetalle(folio, callback) {
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
    conexion.query(sql, [folio], (error, resultados) => {
        if (error) return callback(error, null);
        if (resultados.length === 0) return callback(null, null);
        const libro = {
            ...resultados[0],
            imagen: resultados[0].imagen ? procesarImagen(resultados[0].imagen) : null
        };
        callback(null, libro);
    });
}

// Obtener libros de una categoría específica
function obtenerPorCategoria(categoriaId, callback) {
    const sqlCategoria = "SELECT vchcategoria, vchdescripcion FROM tblcategoria WHERE intidcategoria = ?";
    conexion.query(sqlCategoria, [categoriaId], (errorC, resCategoria) => {
        if (errorC) return callback(errorC, null);
        if (resCategoria.length === 0) return callback(null, null);

        const sqlLibros = `
            SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial,
                   l.intanio, l.imagen, l.vchisbn, l.boolactivo,
                   (SELECT COUNT(*) FROM tblejemplares e 
                    WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles,
                   (SELECT COUNT(*) FROM tblejemplares e 
                    WHERE e.vchfolio = l.vchfolio) as total_ejemplares
            FROM tbllibros l
            WHERE l.intidcategoria = ? ORDER BY l.vchtitulo ASC
        `;
        conexion.query(sqlLibros, [categoriaId], (errorL, resLibros) => {
            if (errorL) return callback(errorL, null);
            const libros = resLibros.map(libro => ({
                ...libro,
                imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
                color_fondo: !libro.imagen ? colorAleatorio() : undefined
            }));
            callback(null, {
                categoria: {
                    id: categoriaId,
                    nombre: resCategoria[0].vchcategoria,
                    descripcion: resCategoria[0].vchdescripcion
                },
                libros
            });
        });
    });
}

module.exports = {
    obtenerLibrosRecomendados,
    obtenerCategorias,
    obtenerLibrosMasPedidos,
    obtenerCatalogo,
    buscarLibros,
    obtenerDetalle,
    obtenerPorCategoria
};