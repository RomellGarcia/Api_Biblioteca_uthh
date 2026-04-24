import {
  obtenerPrestamosPorLibro,
  obtenerPrestamosPorCategoria,
  obtenerEstadisticasGenerales,
  obtenerMesesDisponibles
} from '../models/reportes.model.js';

// ====================== LEY DE CRECIMIENTO/DECRECIMIENTO ======================
// Fórmula base: x = C · e^(k · t)
// Origen: dx/dt = kx → dx/x = k dt → ln(x) = kt + ln(C) → x = Ce^(kt)
//
// MÉTODO 1 - Punto Promedio (todos los meses tienen préstamos > 0):
//   C  = valor del primer mes (condición inicial directa)
//   t̄  = promedio de los índices t = (n-1)/2
//   P̄  = promedio de los préstamos
//   k  = ln(P̄ / C) / t̄
//
// MÉTODO 2 - Mínimos Cuadrados (algún mes tiene 0 préstamos):
//   Los ceros se reemplazan por 0.1 (ln(0) es indefinido)
//   Linealizar: Y = ln(x) → Y = kt + b  (b = ln(C))
//   Sistema de ecuaciones sumando los n meses:
//     ΣY     = k·Σt  + n·b
//     Σ(t·Y) = k·Σt² + b·Σt
//   k = (n·Σ(t·Y) - Σt·ΣY) / (n·Σt² - (Σt)²)
//   b = (ΣY - k·Σt) / n  →  C = e^b
//
// MÍNIMO: al menos 2 meses con préstamos > 0 para calcular.

function calcularModelo(prestamos) {
  var n = prestamos.length;
  var mesesConDatos = prestamos.filter(function(v) { return v > 0; }).length;

  // Sin datos suficientes
  if (mesesConDatos < 2) {
    var primerValor = prestamos.find(function(v) { return v > 0; }) || 1;
    return { k: 0, C: primerValor, t0: 0, datos_suficientes: false, meses_con_datos: mesesConDatos, metodo: 'ninguno' };
  }

  // ── MÉTODO 1: Punto Promedio ─────────────────────────────────────────
  // Aplica cuando TODOS los meses tienen préstamos (sin ceros)
  var todosTienenDatos = prestamos.every(function(v) { return v > 0; });

  if (todosTienenDatos) {
    var C = prestamos[0];                                          // CI = primer mes
    var tPromedio = (n - 1) / 2;                                   // t̄ = (0+1+...+n-1)/n
    var sumaP = prestamos.reduce(function(s, v) { return s + v; }, 0);
    var pPromedio = sumaP / n;                                     // P̄ = promedio préstamos
    var k = Math.log(pPromedio / C) / tPromedio;                   // k = ln(P̄/C) / t̄
    k = Math.max(-1.1, Math.min(1.1, k));

    return {
      k: parseFloat(k.toFixed(6)),
      C: parseFloat(C.toFixed(4)),
      t0: 0,
      datos_suficientes: true,
      meses_con_datos: mesesConDatos,
      metodo: 'promedio',
      tPromedio: parseFloat(tPromedio.toFixed(4)),
      pPromedio: parseFloat(pPromedio.toFixed(4))
    };
  }

  // ── MÉTODO 2: Mínimos Cuadrados ──────────────────────────────────────
  // Aplica cuando hay al menos un mes con 0 préstamos
  var datos = prestamos.map(function(x, t) {
    return { t: t, x: x === 0 ? 0.1 : x };
  });

  var sumaT  = 0;
  var sumaY  = 0;
  var sumaT2 = 0;
  var sumaTY = 0;

  datos.forEach(function(p) {
    var Y = Math.log(p.x);
    sumaT  += p.t;
    sumaY  += Y;
    sumaT2 += p.t * p.t;
    sumaTY += p.t * Y;
  });

  var denominador = n * sumaT2 - sumaT * sumaT;
  if (denominador === 0) {
    return { k: 0, C: prestamos[0] || 1, t0: 0, datos_suficientes: false, meses_con_datos: mesesConDatos, metodo: 'ninguno' };
  }

  var k = (n * sumaTY - sumaT * sumaY) / denominador;
  var b = (sumaY - k * sumaT) / n;
  var C = Math.exp(b);
  k = Math.max(-1.1, Math.min(1.1, k));

  return {
    k: parseFloat(k.toFixed(6)),
    C: parseFloat(C.toFixed(4)),
    t0: 0,
    datos_suficientes: true,
    meses_con_datos: mesesConDatos,
    metodo: 'minimos_cuadrados'
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
        librosMap[row.vchfolio] = { nombre: row.nombre, categoria: row.categoria, prestamosPorMes: {} };
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
          metodo:             modelo.metodo,
          tPromedio:          modelo.tPromedio || null,
          pPromedio:          modelo.pPromedio || null
        };
      })
      .filter(l => l.prestamos.some(p => p > 0))
      .sort((a, b) => b.tasa_k - a.tasa_k);

    // ── Categorías ──
    const categoriasMap = {};
    datosCategorias.forEach(fila => {
      if (!categoriasMap[fila.intidcategoria]) {
        categoriasMap[fila.intidcategoria] = { id: fila.intidcategoria, nombre: fila.nombre, prestamosPorMes: {} };
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
          metodo:             modelo.metodo,
          tPromedio:          modelo.tPromedio || null,
          pPromedio:          modelo.pPromedio || null
        };
      })
      .sort((a, b) => b.tasa_k - a.tasa_k);

    res.json({ success: true, data: { meses: mesesDisponibles, libros, categorias } });

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