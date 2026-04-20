import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// GET /api/reportes/prestamos-por-mes
async function getPrestamosPorMes(req, res) {
    try {
        const mesesSolicitados = parseInt(req.query.meses) || 6;

        // Obtener datos crudos
        const datosLibros = await obtenerPrestamosPorLibro(mesesSolicitados);
        const datosCategorias = await obtenerPrestamosPorCategoria(mesesSolicitados);

        // === LIBROS ===
        const librosMap = {};
        datosLibros.forEach(fila => {
            if (!librosMap[fila.vchfolio]) {
                librosMap[fila.vchfolio] = {
                    id: fila.vchfolio,
                    nombre: fila.nombre,
                    categoria: fila.categoria || 'Sin categoría',
                    meses: [],      // ← Agregamos meses reales por libro
                    prestamos: []   // ← Prestamos alineados
                };
            }

            librosMap[fila.vchfolio].meses.push(fila.mes);
            librosMap[fila.vchfolio].prestamos.push(fila.total || 0);
        });

        let libros = Object.values(librosMap);

        // Filtrar libros que tengan al menos un préstamo
        libros = libros.filter(l => l.prestamos.some(p => p > 0));

        // Ordenar por total de préstamos descendente
        libros.sort((a, b) => {
            const totalA = a.prestamos.reduce((s, v) => s + v, 0);
            const totalB = b.prestamos.reduce((s, v) => s + v, 0);
            return totalB - totalA;
        });

        // === CATEGORÍAS ===
        const categoriasMap = {};
        datosCategorias.forEach(fila => {
            if (!categoriasMap[fila.intidcategoria]) {
                categoriasMap[fila.intidcategoria] = {
                    id: fila.intidcategoria,
                    nombre: fila.nombre,
                    meses: [],
                    prestamos: []
                };
            }
            categoriasMap[fila.intidcategoria].meses.push(fila.mes);
            categoriasMap[fila.intidcategoria].prestamos.push(fila.total || 0);
        });

        let categorias = Object.values(categoriasMap);
        categorias = categorias.filter(c => c.prestamos.some(p => p > 0));

        categorias.sort((a, b) => {
            const totalA = a.prestamos.reduce((s, v) => s + v, 0);
            const totalB = b.prestamos.reduce((s, v) => s + v, 0);
            return totalB - totalA;
        });

        // Meses globales (para gráficos generales)
        const todosLosMeses = [...new Set([
            ...libros.flatMap(l => l.meses),
            ...categorias.flatMap(c => c.meses)
        ])].sort();

        res.json({
            success: true,
            data: {
                meses: todosLosMeses,        // meses globales para resumen
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