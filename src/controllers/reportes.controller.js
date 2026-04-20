import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// Ley de Crecimiento/Decaimiento: k promedio ponderado entre pares válidos
function calcularTasaK(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    // Puntos con actividad real, guardando índice para calcular deltaT correcto
    var puntos = [];
    prestamos.forEach(function(v, i) {
        if (v > 0) puntos.push({ valor: v, idx: i });
    });

    // Sin historial o un solo mes con datos — sin tendencia calculable
    if (puntos.length < 2) return 0;

    var sumaPonderada = 0;
    var sumaPesos = 0;

    for (var i = 1; i < puntos.length; i++) {
        var x0 = puntos[i - 1].valor;
        var x1 = puntos[i].valor;
        var deltaT = puntos[i].idx - puntos[i - 1].idx; // meses reales entre ambos
        if (deltaT <= 0) continue;

        var k = Math.log(x1 / x0) / deltaT;
        if (!isFinite(k) || Math.abs(k) >= 5) continue;

        // Pares más recientes tienen más peso (2^i)
        var peso = Math.pow(2, i);
        sumaPonderada += k * peso;
        sumaPesos += peso;
    }

    if (sumaPesos === 0) return 0;

    // Limitar k a ±1.1 para evitar proyecciones absurdas con pocos datos
    var resultado = sumaPonderada / sumaPesos;
    return Math.max(-1.1, Math.min(1.1, resultado));
}

// GET /api/reportes/prestamos-por-mes?meses=6
async function getPrestamosPorMes(req, res) {
    try {
        const numMeses = parseInt(req.query.meses) || 6;

        // 1. Obtener meses disponibles y datos de BD
        const mesesDisponibles = await obtenerMesesDisponibles(numMeses);
        const datosLibros = await obtenerPrestamosPorLibro(numMeses);
        const datosCategorias = await obtenerPrestamosPorCategoria(numMeses);

        // 2. Construir mapa de libros
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

        // 3. Convertir a arreglo con prestamos[] alineado a mesesDisponibles
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
                    datos_suficientes: puntosConDatos >= 2  // flag para el frontend
                };
            })
            .filter(l => l.prestamos.some(p => p > 0))
            .sort((a, b) => b.tasa_k - a.tasa_k);  // typo corregido

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