import conexion from '../config/db.js';

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
async function obtenerLibrosRecomendados() {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial,
               l.intanio, l.imagen, c.vchcategoria
        FROM tbllibros l
        LEFT JOIN tblcategoria c ON l.intidcategoria = c.intidcategoria
        ORDER BY RAND() LIMIT 8
    `;
    const [resultados] = await conexion.query(sql);
    
    return resultados.map(libro => ({
        ...libro,
        imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
        color_fondo: !libro.imagen ? colorAleatorio() : undefined
    }));
}

// Obtener categorías con libros
async function obtenerCategorias() {
    const sql = `
        SELECT DISTINCT c.intidcategoria, c.vchcategoria, c.vchdescripcion
        FROM tblcategoria c
        LEFT JOIN tbllibros l ON c.intidcategoria = l.intidcategoria
        WHERE l.vchfolio IS NOT NULL
        GROUP BY c.intidcategoria, c.vchcategoria, c.vchdescripcion
        ORDER BY c.vchcategoria ASC
    `;
    const [resultados] = await conexion.query(sql);
    
    return resultados.map(categoria => ({
        intidcategoria: categoria.intidcategoria,
        vchcategoria: categoria.vchcategoria,
        icono: obtenerIconoCategoria(categoria.vchcategoria)
    }));
}

// Obtener libros más pedidos
async function obtenerLibrosMasPedidos() {
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
    const [resultados] = await conexion.query(sql);
    
    return resultados.map(libro => ({
        ...libro,
        imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
        color_fondo: !libro.imagen ? colorAleatorio() : undefined
    }));
}

// Obtener catálogo completo
async function obtenerCatalogo() {
    const sql = `
        SELECT l.vchfolio, l.vchtitulo, l.vchautor, l.vcheditorial, l.intanio,
               l.vchsinopsis, l.intidcategoria, l.boolactivo, l.imagen,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio AND e.booldisponible = 1) as ejemplares_disponibles,
               (SELECT COUNT(*) FROM tblejemplares e 
                WHERE e.vchfolio = l.vchfolio) as total_ejemplares
        FROM tbllibros l ORDER BY l.vchfolio DESC
    `;
    const [resultados] = await conexion.query(sql);
    
    return resultados.map(libro => ({
        ...libro,
        imagen: libro.imagen ? procesarImagen(libro.imagen) : null
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
        imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
        color_fondo: !libro.imagen ? colorAleatorio() : undefined
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
        return null; // Libro no existe
    }

    const data = resultados[0];
    let imagenBase64 = null;
    
    // Protección contra errores en el procesamiento de imagen
    if (data.imagen) {
        try {
            imagenBase64 = procesarImagen(data.imagen);
        } catch (imgError) {
            console.error("Error procesando imagen para el folio " + folio, imgError);
        }
    }

    return {
        ...data,
        imagen: imagenBase64
    };
}

// Obtener libros de una categoría específica
async function obtenerPorCategoria(categoriaId) {
    // Primera consulta: obtener detalles de la categoría
    const sqlCategoria = "SELECT vchcategoria, vchdescripcion FROM tblcategoria WHERE intidcategoria = ?";
    const [resCategoria] = await conexion.query(sqlCategoria, [categoriaId]);
    
    if (resCategoria.length === 0) return null;

    // Segunda consulta: obtener los libros de esa categoría
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
    const [resLibros] = await conexion.query(sqlLibros, [categoriaId]);
    
    const libros = resLibros.map(libro => ({
        ...libro,
        imagen: libro.imagen ? procesarImagen(libro.imagen) : null,
        color_fondo: !libro.imagen ? colorAleatorio() : undefined
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

export {
    obtenerLibrosRecomendados,
    obtenerCategorias,
    obtenerLibrosMasPedidos,
    obtenerCatalogo,
    buscarLibros,
    obtenerDetalle,
    obtenerPorCategoria
};