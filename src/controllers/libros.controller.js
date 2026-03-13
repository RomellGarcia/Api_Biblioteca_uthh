const {
    obtenerLibrosRecomendados,
    obtenerCategorias,
    obtenerLibrosMasPedidos,
    obtenerCatalogo,
    buscarLibros,
    obtenerDetalle,
    obtenerPorCategoria
} = require('../models/libros.model');

// GET /api/libros/recomendados/aleatorios
function getRecomendados(req, res) {
    obtenerLibrosRecomendados((error, libros) => {
        if (error) {
            return res.status(500).json({ success: false, error: 'Error de base de datos: ' + error.message, codigo: error.code });
        }
        res.json({ success: true, data: libros, total: libros.length });
    });
}

// GET /api/libros/categorias
function getCategorias(req, res) {
    obtenerCategorias((error, categorias) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, data: categorias });
    });
}

// GET /api/libros/mas-pedidos
function getMasPedidos(req, res) {
    obtenerLibrosMasPedidos((error, libros) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, data: libros });
    });
}

// GET /api/libros
function getCatalogo(req, res) {
    obtenerCatalogo((error, libros) => {
        if (error) {
            return res.status(500).json({ success: false, error: 'Error al obtener el catálogo', detalles: error.message });
        }
        res.json({ success: true, data: libros, total: libros.length });
    });
}

// GET /api/libros/buscar?q=
function getBuscar(req, res) {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Parámetro de búsqueda requerido' });

    buscarLibros(q, (error, libros) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        res.json({ success: true, data: libros });
    });
}

// GET /api/libros/detalle?folio=
function getDetalle(req, res) {
    const folio = req.query.folio;
    console.log("Buscando folio:", folio);
    if (!folio) return res.status(400).json({ success: false, error: 'Folio requerido' });

    obtenerDetalle(folio, (error, libro) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        if (!libro) return res.status(404).json({ success: false, error: 'Libro no encontrado' });
        res.json({ success: true, data: libro });
    });
}

// GET /api/libros/categoria/:id
function getCategoria(req, res) {
    const categoriaId = parseInt(req.params.id);
    if (isNaN(categoriaId) || categoriaId <= 0) {
        return res.status(400).json({ success: false, error: 'ID de categoría inválido' });
    }

    obtenerPorCategoria(categoriaId, (error, data) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        if (!data) return res.status(404).json({ success: false, error: 'Categoría no encontrada' });
        res.json({ success: true, data });
    });
}

module.exports = { getRecomendados, getCategorias, getMasPedidos, getCatalogo, getBuscar, getDetalle, getCategoria };