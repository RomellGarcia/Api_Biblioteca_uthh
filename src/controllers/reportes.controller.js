import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// ====================== LEY DE CRECIMIENTO: dx/dt = kx ======================
// Solución: x(t) = C·e^(kt)
//
// REGLAS FIJAS (Método A):
//   t = índice absoluto del mes en el arreglo (0=Nov, 1=Dic, ..., 5=Abr)
//   tFinal = SIEMPRE prestamos.length - 1 = 5 para 6 meses
//   C = primer valor > 0 en el arreglo
//   t0 = índice donde está C
//   k = ln(xFinal / C) / (tFinal - t0)
//
// IMPORTANTE: tFinal nunca cambia (siempre el último índice del rango).
// El deltaT se calcula desde t0 hasta tFinal, no desde 0 hasta tInicio.

function calcularTasaK(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    const tFinal = prestamos.length - 1;  // siempre 5 para 6 meses
    const xFinal = prestamos[tFinal];

    // Buscar C: primer valor > 0 en el arreglo
    const t0 = prestamos.findIndex(v => v > 0);
    if (t0 === -1) return 0;          // sin ningún dato
    const C = prestamos[t0];

    // Si el único mes con datos es el último, no hay tendencia calculable
    if (t0 === tFinal) return 0;

    // xFinal puede ser 0 (último mes sin datos): buscar último valor > 0
    let xEfectivo = xFinal;
    let tEfectivo = tFinal;
    if (xFinal === 0) {
        for (let i = tFinal - 1; i > t0; i--) {
            if (prestamos[i] > 0) {
                xEfectivo = prestamos[i];
                tEfectivo = i;
                break;
            }
        }
        if (xEfectivo === 0) return 0;  // solo un mes con datos
    }

    // k = ln(xEfectivo / C) / (tEfectivo - t0)
    // deltaT usa los índices reales para respetar los meses vacíos
    const deltaT = tEfectivo - t0;
    if (deltaT <= 0) return 0;

    const k = Math.log(xEfectivo / C) / deltaT;
    return isFinite(k) ? k : 0;
}

// C = primer valor > 0 del arreglo (condición inicial real)
function obtenerC(prestamos) {
    if (!prestamos || prestamos.length === 0) return 0;
    const idx = prestamos.findIndex(v => v > 0);
    return idx !== -1 ? prestamos[idx] : 0;
}

// t0 = índice donde está C
function obtenerT0(prestamos) {
    if (!prestamos || prestamos.length === 0) return 0;
    const idx = prestamos.findIndex(v => v > 0);
    return idx !== -1 ? idx : 0;
}

// ====================== GET /api/reportes/prestamos-por-mes?meses=6 ======================
async function getPrestamosPorMes(req, res) {
    try {
        const numMeses = parseInt(req.query.meses) || 6;

        const mesesDisponibles = await obtenerMesesDisponibles(numMeses);
        const datosLibros      = await obtenerPrestamosPorLibro(numMeses);
        const datosCategorias  = await obtenerPrestamosPorCategoria(numMeses);

        // ── Libros ──
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

        const libros = Object.values(librosMap)
            .map(libro => {
                // arreglo de 6 posiciones alineado a mesesDisponibles, 0 donde no hubo
                const prestamos = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
                const k   = calcularTasaK(prestamos);
                const C   = obtenerC(prestamos);
                const t0  = obtenerT0(prestamos);
                const puntosConDatos = prestamos.filter(v => v > 0).length;

                return {
                    nombre:    libro.nombre,
                    categoria: libro.categoria,
                    prestamos,
                    C,
                    t0,
                    tasa_k:            k,
                    porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
                    datos_suficientes:  puntosConDatos >= 2
                };
            })
            .filter(l => l.prestamos.some(p => p > 0))
            .sort((a, b) => b.tasa_k - a.tasa_k);

        // ── Categorías ──
        const categoriasMap = {};
        datosCategorias.forEach(fila => {
            if (!categoriasMap[fila.intidcategoria]) {
                categoriasMap[fila.intidcategoria] = {
                    id:     fila.intidcategoria,
                    nombre: fila.nombre,
                    prestamosPorMes: {}
                };
            }
            categoriasMap[fila.intidcategoria].prestamosPorMes[fila.mes] = fila.total;
        });

        const categorias = Object.values(categoriasMap)
            .map(cat => {
                const prestamos = mesesDisponibles.map(mes => cat.prestamosPorMes[mes] || 0);
                const k  = calcularTasaK(prestamos);
                const C  = obtenerC(prestamos);
                const t0 = obtenerT0(prestamos);

                return {
                    id:     cat.id,
                    nombre: cat.nombre,
                    prestamos,
                    C,
                    t0,
                    tasa_k:            k,
                    porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1))
                };
            })
            .sort((a, b) => b.tasa_k - a.tasa_k);

        res.json({
            success: true,
            data: { meses: mesesDisponibles, libros, categorias }
        });

    } catch (error) {
        console.error('Error en getPrestamosPorMes:', error);
        res.status(500).json({
            success:  false,
            message:  'Error en reportes',
            error:    error.message
        });
    }
}

// ====================== GET /api/reportes/estadisticas ======================
async function getEstadisticas(req, res) {
    try {
        const stats = await obtenerEstadisticasGenerales();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error en getEstadisticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error:   error.message
        });
    }
}

export { getPrestamosPorMes, getEstadisticas };