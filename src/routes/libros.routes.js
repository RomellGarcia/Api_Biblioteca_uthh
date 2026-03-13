const express = require('express');
const router = express.Router();
const { getRecomendados, getCategorias, getMasPedidos, getCatalogo, getBuscar, getDetalle, getCategoria } = require('../controllers/libros.controller');

router.get('/detalle', getDetalle);
router.get('/recomendados/aleatorios', getRecomendados);
router.get('/categorias', getCategorias);
router.get('/mas-pedidos', getMasPedidos);
router.get('/buscar', getBuscar);
router.get('/categoria/:id', getCategoria);
router.get('/', getCatalogo);

module.exports = router;