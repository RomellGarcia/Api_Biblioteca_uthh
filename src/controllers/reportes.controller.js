import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// Ley de Crecimiento/Decaimiento
function calcularTasaK(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    var puntos = [];
    prestamos.forEach(function(v, i) {
        if (v > 0) puntos.push({ valor: v, idx: i });
    });

    if (puntos.length < 2) return 0;

    var sumaK = 0;
    var count = 0;

    for (var i = 1; i < puntos.length; i++) {
        var x0 = puntos[i - 1].valor;
        var x1 = puntos[i].valor;
        var deltaT = puntos[i].idx - puntos[i - 1].idx;
        if (deltaT <= 0) continue;

        var k = Math.log(x1 / x0) / deltaT;  // k = ln(x1/x0) / Δt
        if (!isFinite(k) || Math.abs(k) >= 5) continue;

        sumaK += k; 
        count++;
    }

    if (count === 0) return 0;

    var resultado = sumaK / count; 
    return Math.max(-1.1, Math.min(1.1, resultado));
}

// GET /api/reportes/prestamos-por-mes?meses=6
async function getPrestamosPorMes(req, res) {
    try {
        const meses = parseInt(req.query.meses) || 6;
        const mesesDisponibles = await obtenerMesesDisponibles(meses);
        const datosLibros = await obtenerPrestamosPorLibro(meses);
        const datosCategorias = await obtenerPrestamosPorCategoria(meses);
        const librosMap = {};
        datosLibros.forEach(row => {
            if (!librosMap[row.vchfolio]) {
                librosMap[row.vchfolio] = {
                    nombre: row.nombre,
                    categoria: row.categoria,
                    prestamosPorMes: {}
                };
            }
            librosMap[row.vchfolio].prestamosPorMes[row.mes] = row.total;
        });

        //Convertir a arreglo con prestamos[] alineado a mesesDisponibles
        const libros = Object.values(librosMap)
            .map(libro => {
                const prestamos = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
                const k = calcularTasaK(prestamos);
                const puntosConDatos = prestamos.filter(v => v > 0).length;

                return {
                    nombre: libro.nombre,
                    categoria: libro.categoria,
                    prestamos: prestamos,
                    tasa_k: k,
                    porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
                    datos_suficientes: puntosConDatos >= 2 
                };
            })
            .filter(l => l.prestamos.some(p => p > 0))
            .sort((a, b) => b.tasa_k - a.tasa_k); 

        // 4. Construir mapa de categorías
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

        const categorias = Object.values(categoriasMap)
            .map(cat => {
                const prestamos = mesesDisponibles.map(mes => cat.prestamosPorMes[mes] || 0);
                const k = calcularTasaK(prestamos);

                return {
                    id: cat.id,
                    nombre: cat.nombre,
                    prestamos: prestamos,
                    tasa_k: k,
                    porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1))
                };
            })
            .sort((a, b) => b.tasa_k - a.tasa_k);

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
            message: 'Error en reportes',
            error: error.message
        });
    }
}

// GET /api/reportes/estadisticas
async function getEstadisticas(req, res) {
    try {
        const stats = await obtenerEstadisticasGenerales();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error en getEstadisticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
}

export { getPrestamosPorMes, getEstadisticas };