import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// ====================== LEY DE CRECIMIENTO: dx/dt = kx ======================
// Solución: x(t) = C·e^(kt)

function calcularTasaK(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    const tFinal = prestamos.length - 1;
    
    // Ajuste matemático: Si el valor inicial es 0, usamos 1 para poder calcular crecimiento
    let C = prestamos[0] > 0 ? prestamos[0] : 1;
    let xFinal = prestamos[tFinal] > 0 ? prestamos[tFinal] : 0.1; // 0.1 evita log(0)

    // Si el primer mes es 0, buscamos dónde empieza la actividad real para t
    let tInicio = 0;
    if (prestamos[0] === 0) {
        const primerIdx = prestamos.findIndex(v => v > 0);
        if (primerIdx !== -1 && primerIdx < tFinal) {
            C = prestamos[primerIdx];
            tInicio = primerIdx;
        }
    }

    const deltaT = tFinal - tInicio;
    if (deltaT <= 0) return 0;

    // k = ln(xFinal / C) / deltaT
    const k = Math.log(xFinal / C) / deltaT;
    return isFinite(k) ? k : 0;
}

// Obtener C (condición inicial) - Si es 0, devolvemos 1 para el modelo exponencial
function obtenerC(prestamos) {
    if (!prestamos || prestamos.length === 0) return 1;
    if (prestamos[0] > 0) return prestamos[0];
    
    const primerIdx = prestamos.findIndex(v => v > 0);
    // Si no hay datos, retornamos 1. Si hay, retornamos el primer valor real.
    return primerIdx !== -1 ? prestamos[primerIdx] : 1;
}

// t en que está C
function obtenerT0(prestamos) {
    if (!prestamos || prestamos.length === 0) return 0;
    if (prestamos[0] > 0) return 0;
    const idx = prestamos.findIndex(v => v > 0);
    return idx !== -1 ? idx : 0;
}

// ====================== GET /api/reportes/prestamos-por-mes?meses=6 ======================
async function getPrestamosPorMes(req, res) {
    try {
        const numMeses = parseInt(req.query.meses) || 6;

        const mesesDisponibles = await obtenerMesesDisponibles(numMeses);
        const datosLibros = await obtenerPrestamosPorLibro(numMeses);
        const datosCategorias = await obtenerPrestamosPorCategoria(numMeses);

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
                const prestamos = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
                const k = calcularTasaK(prestamos);
                const C = obtenerC(prestamos);
                const t0 = obtenerT0(prestamos);
                const puntosConDatos = prestamos.filter(v => v > 0).length;

                return {
                    nombre: libro.nombre,
                    categoria: libro.categoria,
                    prestamos, 
                    C,         
                    t0,        
                    tasa_k: k, 
                    porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
                    datos_suficientes: puntosConDatos >= 2
                };
            })
            .filter(l => l.prestamos.some(p => p > 0))
            .sort((a, b) => b.tasa_k - a.tasa_k);

        // ── Categorías ──
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
                const C = obtenerC(prestamos);
                const t0 = obtenerT0(prestamos);

                return {
                    id: cat.id,
                    nombre: cat.nombre,
                    prestamos,
                    C,
                    t0,
                    tasa_k: k,
                    porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1))
                };
            })
            .sort((a, b) => b.tasa_k - a.tasa_k);

        res.json({
            success: true,
            data: {
                meses: mesesDisponibles,
                libros,
                categorias
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