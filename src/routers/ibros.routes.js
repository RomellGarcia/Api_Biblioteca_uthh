// libros.routes.js - Rutas de libros y catálogo
const express = require('express');
const router = express.Router();
const LibrosController = require('../controllers/libros.controller');

// ============================================
// RUTAS PÚBLICAS (sin autenticación requerida)
// ============================================

/**
 * GET /api/libros
 * Obtener catálogo de libros con paginación
 */
router.get('/', LibrosController.obtenerCatalogo);

/**
 * GET /api/libros/buscar
 * Buscar libros en tiempo real
 */
router.get('/buscar', LibrosController.buscarLibros);

/**
 * GET /api/libros/categorias
 * Obtener todas las categorías
 */
router.get('/categorias', LibrosController.obtenerCategorias);

/**
 * GET /api/libros/mas-prestados
 * Obtener libros más prestados (recomendaciones)
 */
router.get('/mas-prestados', LibrosController.obtenerLibrosMasPrestados);

/**
 * GET /api/libros/categoria/:id
 * Obtener libros de una categoría específica
 */
router.get('/categoria/:id', LibrosController.obtenerLibrosPorCategoria);

/**
 * GET /api/libros/:folio
 * Obtener detalle de un libro por folio
 */
router.get('/:folio', LibrosController.obtenerLibroPorFolio);

module.exports = router;