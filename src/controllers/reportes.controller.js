import {
    obtenerPrestamosPorLibro,
    obtenerPrestamosPorCategoria,
    obtenerEstadisticasGenerales,
    obtenerMesesDisponibles
} from '../models/reportes.model.js';

// ====================== LEY DE CRECIMIENTO: dx/dt = kx ======================
function calcularTasaK(prestamos) {
    if (!prestamos || prestamos.length < 2) return 0;

    const tFinal = prestamos.length - 1;
    
    // Buscamos el PRIMER mes que tenga préstamos (nuestra Condición Inicial real)
    const primerIdx = prestamos.findIndex(v => v > 0);
    
    // Si no hay ningún préstamo o solo hay en el último mes, no hay tendencia calculable
    if (primerIdx === -1 || primerIdx === tFinal) return 0;

    const C = prestamos[primerIdx];
    const xFinal = prestamos[tFinal];

    // Si el último mes es 0, la tasa es negativa. 
    // Para evitar ln(0) [Syntax Error], usamos un valor muy pequeño (0.1) o 
    // buscamos el último valor registrado para marcar la tendencia hasta ese punto.
    if (xFinal === 0) {
        let ultimoConValorIdx = -1;
        for (let i = tFinal - 1; i >= 0; i--) {
            if (prestamos[i] > 0) { ultimoIdx = i; break; }
        }
        if (ultimoIdx <= primerIdx) return 0; // Solo hubo un pico de actividad
        
        // Calculamos k hasta el último momento que hubo actividad
        const kDescenso = Math.log(0.5 / C) / tFinal; // Simulamos tendencia a agotarse
        return isFinite(kDescenso) ? kDescenso : 0;
    }

    // Caso estándar: k = ln(xf / C) / deltaT
    const deltaT = tFinal - primerIdx;
    const k = Math.log(xFinal / C) / deltaT;

    return isFinite(k) ? k : 0;
}

function obtenerC(prestamos) {
    if (!prestamos) return 0;
    const primerVal = prestamos.find(v => v > 0);
    return primerVal || 0;
}

function obtenerT0(prestamos) {
    if (!prestamos) return 0;
    const idx = prestamos.findIndex(v => v > 0);
    return idx === -1 ? 0 : idx;
}

// ====================== GET /api/reportes/prestamos-por-mes ======================
export async function getPrestamosPorMes(req, res) {
    try {
        const numMeses = parseInt(req.query.meses) || 6;
        const mesesDisponibles = await obtenerMesesDisponibles(numMeses);
        
        // Ejecutamos consultas en paralelo para ganar velocidad
        const [datosLibros, datosCategorias] = await Promise.all([
            obtenerPrestamosPorLibro(numMeses),
            obtenerPrestamosPorCategoria(numMeses)
        ]);

        // Procesar Libros
        const librosMap = {};
        datosLibros.forEach(row => {
            if (!librosMap[row.vchfolio]) {
                librosMap[row.vchfolio] = {
                    nombre: row.nombre,
                    categoria: row.categoria,
                    datos: {}
                };
            }
            librosMap[row.vchfolio].datos[row.mes] = row.total;
        });

        const libros = Object.values(librosMap).map(libro => {
            // RELLENADO DE HUECOS: Si el mes no existe en la DB, va un 0
            const prestamosArr = mesesDisponibles.map(m => libro.datos[m] || 0);
            
            const k = calcularTasaK(prestamosArr);
            const puntosConDatos = prestamosArr.filter(v => v > 0).length;

            return {
                nombre: libro.nombre,
                categoria: libro.categoria,
                prestamos: prestamosArr,
                C: obtenerC(prestamosArr),
                t0: obtenerT0(prestamosArr),
                tasa_k: k,
                porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
                datos_suficientes: puntosConDatos >= 2
            };
        }).sort((a, b) => b.tasa_k - a.tasa_k);

        // Procesar Categorías (Misma lógica de rellenado)
        const categoriasMap = {};
        datosCategorias.forEach(row => {
            if (!categoriasMap[row.intidcategoria]) {
                categoriasMap[row.intidcategoria] = {
                    nombre: row.nombre,
                    datos: {}
                };
            }
            categoriasMap[row.intidcategoria].datos[row.mes] = row.total;
        });

        const categorias = Object.values(categoriasMap).map(cat => {
            const prestamosArr = mesesDisponibles.map(m => cat.datos[m] || 0);
            const k = calcularTasaK(prestamosArr);

            return {
                nombre: cat.nombre,
                prestamos: prestamosArr,
                C: obtenerC(prestamosArr),
                t0: obtenerT0(prestamosArr),
                tasa_k: k,
                porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1))
            };
        }).sort((a, b) => b.tasa_k - a.tasa_k);

        res.json({
            success: true,
            data: { meses: mesesDisponibles, libros, categorias }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al procesar reportes' });
    }
}

export async function getEstadisticas(req, res) {
    try {
        const stats = await obtenerEstadisticasGenerales();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}