// libros.controller.js - Controlador de libros y catálogo
const LibroModel = require('../models/libro.model');

const LibrosController = {
    /**
     * GET /api/libros
     * Obtener catálogo de libros
     */
    obtenerCatalogo: async (req, res) => {
        try {
            const limite = parseInt(req.query.limite) || 50;
            const offset = parseInt(req.query.offset) || 0;

            const libros = await LibroModel.obtenerCatalogo(limite, offset);

            res.json({
                success: true,
                data: libros,
                pagination: {
                    limite,
                    offset,
                    total: libros.length
                }
            });
        } catch (error) {
            console.error('Error al obtener catálogo:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener catálogo de libros'
            });
        }
    },

    /**
     * GET /api/libros/:folio
     * Obtener detalle de un libro
     */
    obtenerLibroPorFolio: async (req, res) => {
        try {
            const { folio } = req.params;

            const libros = await LibroModel.obtenerLibroPorFolio(folio);

            if (libros.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Libro no encontrado'
                });
            }

            // Obtener ejemplares del libro
            const ejemplares = await LibroModel.obtenerEjemplaresDeLibro(folio);

            res.json({
                success: true,
                libro: {
                    ...libros[0],
                    ejemplares
                }
            });
        } catch (error) {
            console.error('Error al obtener libro:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener detalle del libro'
            });
        }
    },

    /**
     * GET /api/libros/categoria/:id
     * Obtener libros por categoría
     */
    obtenerLibrosPorCategoria: async (req, res) => {
        try {
            const { id } = req.params;

            const libros = await LibroModel.obtenerLibrosPorCategoria(id);

            res.json({
                success: true,
                data: libros
            });
        } catch (error) {
            console.error('Error al obtener libros por categoría:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener libros de la categoría'
            });
        }
    },

    /**
     * GET /api/libros/buscar
     * Buscar libros en tiempo real
     */
    buscarLibros: async (req, res) => {
        try {
            const { q } = req.query;

            if (!q || q.trim() === '') {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const libros = await LibroModel.buscarLibros(q);

            res.json({
                success: true,
                data: libros
            });
        } catch (error) {
            console.error('Error al buscar libros:', error);
            res.status(500).json({
                success: false,
                error: 'Error al buscar libros'
            });
        }
    },

    /**
     * GET /api/libros/categorias
     * Obtener todas las categorías
     */
    obtenerCategorias: async (req, res) => {
        try {
            const categorias = await LibroModel.obtenerCategorias();

            res.json({
                success: true,
                data: categorias
            });
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener categorías'
            });
        }
    },

    /**
     * GET /api/libros/mas-prestados
     * Obtener libros más prestados (recomendaciones)
     */
    obtenerLibrosMasPrestados: async (req, res) => {
        try {
            const limite = parseInt(req.query.limite) || 10;

            const libros = await LibroModel.obtenerLibrosMasPrestados(limite);

            res.json({
                success: true,
                data: libros
            });
        } catch (error) {
            console.error('Error al obtener libros más prestados:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener recomendaciones'
            });
        }
    }
};

module.exports = LibrosController;