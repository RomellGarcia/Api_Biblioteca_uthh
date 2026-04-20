import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// Función auxiliar para calcular k basándose en el primer y último mes con actividad
function calcularTasaK(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    const primerIndice = prestamos.findIndex(p => p > 0);
    const ultimoIndice = prestamos.map(p => p > 0).lastIndexOf(true);

    if (primerIndice === -1 || ultimoIndice === -1 || primerIndice === ultimoIndice) {
        return 0;
    }

    const deltaT = ultimoIndice - primerIndice;
    const xStart = prestamos[primerIndice];
    const xEnd = prestamos[ultimoIndice];

    const k = Math.log(xEnd / xStart) / deltaT;
    return isFinite(k) ? k : 0;
}

// GET /api/reportes/prestamos-por-mes
async function getPrestamosPorMes(req, res) {
    try {
        const meses = parseInt(req.query.meses) || 6;
        const mesesDisponibles = await obtenerMesesDisponibles(meses);

        const datosLibros = await obtenerPrestamosPorLibro(meses);
        const datosCategorias = await obtenerPrestamosPorCategoria(meses);

        const librosMap = {};
        datosLibros.forEach(fila => {
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

        const libros = Object.values(librosMap).map(libro => {
            const prestamos = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
            const k = calcularTasaK(prestamos); 
            
            return {
                ...libro,
                prestamos: prestamos,
                tasa_k: k,
                porcentaje_mensual: (Math.exp(k) - 1) * 100 
            };
        }).filter(l => l.prestamos.some(p => p > 0));

        const categoriasMap = {};
        datosCategorias.forEach(fila => {
            if (!categoriasMap[fila.intidcategoria]) {
                categoriasMap[fila.intidcategoria] = {
                    id: fila.intidcategoria,
                    nombre: fila.nombre,
                    prestamosPorMes: {}
                };
            }
            categoriasMap[fila.intidcategoria].prestamosPorMes[fila.mes] = fila.total;
        });

        const categorias = Object.values(categoriasMap).map(cat => {
            const prestamos = mesesDisponibles.map(mes => cat.prestamosPorMes[mes] || 0);
            const k = calcularTasaK(prestamos);
            
            return {
                ...cat,
                prestamos: prestamos,
                tasa_k: k,
                porcentaje_mensual: (Math.exp(k) - 1) * 100
            };
        });
        libros.sort((a, b) => b.tasa_k - a.k);

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
        res.status(500).json({ success: false, message: 'Error en reportes', error: error.message });
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