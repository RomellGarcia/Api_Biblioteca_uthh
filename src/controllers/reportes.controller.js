import {
  obtenerPrestamosPorLibro,
  obtenerPrestamosPorCategoria,
  obtenerEstadisticasGenerales,
  obtenerMesesDisponibles
} from '../models/reportes.model.js';

// ====================== LEY DE CRECIMIENTO/DECRECIMIENTO ======================
// Fórmula: x(t) = C · e^(k · t)
// Origen:  dx/dt = kx  →  dx/x = k dt  →  ln(x) = kt + ln(C)  →  x = Ce^(kt)
//
// Cálculo de C y k (método del punto promedio, igual para todos los libros):
//   - Los meses con 0 préstamos se reemplazan por 0.1 antes de calcular.
//     Esto evita que un cero absoluto jale el promedio artificialmente hacia
//     abajo, y además ln(0) es matemáticamente indefinido.
//   - C  = valor del primer mes (condición inicial: x(0) = C)
//   - t̄  = promedio de los índices t = (n-1)/2  →  2.5 para 6 meses
//   - x̄  = promedio de los préstamos ajustados
//   - k  = ln(x̄ / C) / t̄   (despejado de x̄ = C · e^(k · t̄))
//
// Mínimo requerido: al menos 2 meses con préstamos > 0 para calcular.

function calcularModelo(prestamos) {
  var n = prestamos.length;
  var mesesConDatos = prestamos.filter(function(v) { return v > 0; }).length;

  // Sin datos suficientes para calcular tendencia
  if (mesesConDatos < 2) {
    var primerValor = prestamos.find(function(v) { return v > 0; }) || 1;
    return {
      k: 0,
      C: primerValor,
      t0: 0,
      datos_suficientes: false,
      meses_con_datos: mesesConDatos
    };
  }

  // Reemplazar 0 por 0.1 — mismo ajuste para todos los libros
  var datos = prestamos.map(function(x) { return x === 0 ? 0.1 : x; });

  // C = primer mes ajustado (condición inicial)
  var C = datos[0];

  // t̄ = promedio de los índices de tiempo
  var tPromedio = (n - 1) / 2;

  // x̄ = promedio de los préstamos ajustados
  var sumaX = datos.reduce(function(s, v) { return s + v; }, 0);
  var xPromedio = sumaX / n;

  // k = ln(x̄ / C) / t̄
  var k = Math.log(xPromedio / C) / tPromedio;
  k = Math.max(-1.1, Math.min(1.1, k));

  return {
    k: parseFloat(k.toFixed(6)),
    C: parseFloat(C.toFixed(4)),
    t0: 0,
    datos_suficientes: true,
    meses_con_datos: mesesConDatos,
    tPromedio: parseFloat(tPromedio.toFixed(4)),
    xPromedio: parseFloat(xPromedio.toFixed(4))
  };
}

// GET /api/reportes/prestamos-por-mes?meses=6
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
        const prestamos = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
        const modelo    = calcularModelo(prestamos);
        return {
          nombre:             libro.nombre,
          categoria:          libro.categoria,
          prestamos:          prestamos,
          tasa_k:             modelo.k,
          C:                  modelo.C,
          t0:                 modelo.t0,
          porcentaje_mensual: parseFloat(((Math.exp(modelo.k) - 1) * 100).toFixed(1)),
          datos_suficientes:  modelo.datos_suficientes,
          meses_con_datos:    modelo.meses_con_datos,
          tPromedio:          modelo.tPromedio || null,
          xPromedio:          modelo.xPromedio || null
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
        const modelo    = calcularModelo(prestamos);
        return {
          id:                 cat.id,
          nombre:             cat.nombre,
          prestamos:          prestamos,
          tasa_k:             modelo.k,
          C:                  modelo.C,
          t0:                 modelo.t0,
          porcentaje_mensual: parseFloat(((Math.exp(modelo.k) - 1) * 100).toFixed(1)),
          datos_suficientes:  modelo.datos_suficientes,
          meses_con_datos:    modelo.meses_con_datos,
          tPromedio:          modelo.tPromedio || null,
          xPromedio:          modelo.xPromedio || null
        };
      })
      .sort((a, b) => b.tasa_k - a.tasa_k);

    res.json({
      success: true,
      data: { meses: mesesDisponibles, libros, categorias }
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
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error en getEstadisticas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
  }
}

export { getPrestamosPorMes, getEstadisticas };