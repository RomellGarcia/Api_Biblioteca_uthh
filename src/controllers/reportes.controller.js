import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

//LEY DE CRECIMIENTO: dx/dt = kx
// Solución: x(t) = C·e^(kt)
// Donde:
//   C  = x(t=0) = valor en el PRIMER mes del rango (condición inicial)
//   t  = número de mes (0, 1, 2, 3, 4, 5 para 6 meses)
//   k  = ln(x_último / C) / t_último
//   Si C = 0 → se usa el primer mes con valor > 0 como origen

function calcularTasaK(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    const tFinal = prestamos.length - 1;  // último índice = t máximo

    // C = valor en t=0 (primer mes del rango)
    const C = prestamos[0];
    // x_final = valor en t=tFinal (último mes del rango)
    const xFinal = prestamos[tFinal];

    // Caso normal: C > 0 y xFinal > 0
    if (C > 0 && xFinal > 0) {
        const k = Math.log(xFinal / C) / tFinal;
        return isFinite(k) ? k : 0;
    }

    // Caso C = 0: buscar primer mes con actividad como origen
    if (C === 0 && xFinal > 0) {
        const primerIdx = prestamos.findIndex(v => v > 0);
        if (primerIdx === -1 || primerIdx === tFinal) return 0;
        const C2 = prestamos[primerIdx];
        const deltaT = tFinal - primerIdx;
        const k = Math.log(xFinal / C2) / deltaT;
        return isFinite(k) ? k : 0;
    }

    // Caso xFinal = 0: buscar último mes con actividad como destino
    if (C > 0 && xFinal === 0) {
        let ultimoIdx = -1;
        for (let i = tFinal - 1; i >= 0; i--) {
            if (prestamos[i] > 0) { ultimoIdx = i; break; }
        }
        if (ultimoIdx <= 0) return 0;
        const xUlt = prestamos[ultimoIdx];
        const k = Math.log(xUlt / C) / ultimoIdx;
        return isFinite(k) ? k : 0;
    }
    return 0;
}

// Obtener C (condición inicial) para enviarlo al frontend
function obtenerC(prestamos) {
    if (!prestamos || prestamos.length === 0) return 0;
    if (prestamos[0] > 0) return prestamos[0];
    // Si C=0, el C efectivo es el primer valor > 0
    const primerIdx = prestamos.findIndex(v => v > 0);
    return primerIdx !== -1 ? prestamos[primerIdx] : 0;
}

// t en que está C (si prestamos[0] > 0 es t=0, si no es el índice del primer >0)
function obtenerT0(prestamos) {
    if (!prestamos || prestamos.length === 0) return 0;
    if (prestamos[0] > 0) return 0;
    return prestamos.findIndex(v => v > 0);
}

// GET /api/reportes/prestamos-por-mes?meses=6
async function getPrestamosPorMes(req, res) {
    try {
        const numMeses = parseInt(req.query.meses) || 6;

        const mesesDisponibles = await obtenerMesesDisponibles(numMeses);
        const datosLibros = await obtenerPrestamosPorLibro(numMeses);
        const datosCategorias = await obtenerPrestamosPorCategoria(numMeses);

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
                // prestamos[] alineado a los 6 meses, con 0 donde no hubo
                const prestamos = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
                const k = calcularTasaK(prestamos);
                const C = obtenerC(prestamos);
                const t0 = obtenerT0(prestamos);
                const puntosConDatos = prestamos.filter(v => v > 0).length;

                return {
                    nombre: libro.nombre,
                    categoria: libro.categoria,
                    prestamos,           // arreglo completo de 6 meses
                    C,                   // condición inicial
                    t0,                  // índice donde está C
                    tasa_k: k,           // constante de crecimiento
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

//GET /api/reportes/estadisticas
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