import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// GET /api/reportes/prestamos-por-mes
async function getPrestamosPorMes(req, res) {
    try {
        const meses = parseInt(req.query.meses) || 6;

        // Obtener meses disponibles en el rango
        const mesesDisponibles = await obtenerMesesDisponibles(meses);

        // Obtener datos crudos
        const datosLibros = await obtenerPrestamosPorLibro(meses);
        const datosCategorias = await obtenerPrestamosPorCategoria(meses);

        // Agrupar libros: convertir filas planas a {nombre, categoria, prestamos: []}
        const librosMap = {};
        datosLibros.forEach(function(fila) {
            if (!librosMap[fila.vchfolio]) {
                librosMap[fila.vchfolio] = {
                    id: fila.vchfolio,
                    nombre: fila.nombre,
                    categoria: fila.categoria || 'Sin categoría',
                    prestamosPorMes: {}
                };
            }
            librosMap[fila.vchfolio].prestamosPorMes[fila.mes] = fila.total;
        });

        // Convertir a arreglo con prestamos alineados a los meses disponibles
        var libros = Object.values(librosMap).map(function(libro) {
            var prestamos = mesesDisponibles.map(function(mes) {
                return libro.prestamosPorMes[mes] || 0;
            });
            return {
                id: libro.id,
                nombre: libro.nombre,
                categoria: libro.categoria,
                prestamos: prestamos
            };
        });

        // Filtrar libros que tienen al menos 1 préstamo
        libros = libros.filter(function(l) {
            return l.prestamos.some(function(p) { return p > 0; });
        });

        // Ordenar por total de préstamos descendente
        libros.sort(function(a, b) {
            var totalA = a.prestamos.reduce(function(s, v) { return s + v; }, 0);
            var totalB = b.prestamos.reduce(function(s, v) { return s + v; }, 0);
            return totalB - totalA;
        });

        // Agrupar categorías
        var categoriasMap = {};
        datosCategorias.forEach(function(fila) {
            if (!categoriasMap[fila.intidcategoria]) {
                categoriasMap[fila.intidcategoria] = {
                    id: fila.intidcategoria,
                    nombre: fila.nombre,
                    prestamosPorMes: {}
                };
            }
            categoriasMap[fila.intidcategoria].prestamosPorMes[fila.mes] = fila.total;
        });

        var categorias = Object.values(categoriasMap).map(function(cat) {
            var prestamos = mesesDisponibles.map(function(mes) {
                return cat.prestamosPorMes[mes] || 0;
            });
            return {
                id: cat.id,
                nombre: cat.nombre,
                prestamos: prestamos
            };
        });

        categorias.sort(function(a, b) {
            var totalA = a.prestamos.reduce(function(s, v) { return s + v; }, 0);
            var totalB = b.prestamos.reduce(function(s, v) { return s + v; }, 0);
            return totalB - totalA;
        });

        res.json({
            success: true,
            data: {
                meses: mesesDisponibles,
                libros: libros,
                categorias: categorias
            }
        });

    } catch (error) {
        console.error('Error en getPrestamosPorMes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos de reportes',
            error: error.message
        });
    }
}

// GET /api/reportes/estadisticas
async function getEstadisticas(req, res) {
    try {
        const stats = await obtenerEstadisticasGenerales();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error en getEstadisticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
}

export {
    getPrestamosPorMes,
    getEstadisticas
};