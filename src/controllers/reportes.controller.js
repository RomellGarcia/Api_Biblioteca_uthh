import {
  obtenerPrestamosPorLibro,
  obtenerPrestamosPorCategoria,
  obtenerEstadisticasGenerales,
  obtenerMesesDisponibles
} from '../models/reportes.model.js';

// Regresión lineal exponencial sobre ln(x)
// Devuelve { k, C, t0 } para usar en x(t) = C · e^(k · (t - t0))
function calcularModelo(prestamos) {
  // Solo puntos con actividad real, guardando su índice t
  var puntos = [];
  prestamos.forEach(function (v, i) {
    if (v > 0) puntos.push({ t: i, lnX: Math.log(v) });
  });

  // Sin suficientes puntos no hay modelo
  if (puntos.length < 2) {
    return { k: 0, C: prestamos.find(function (v) { return v > 0; }) || 1, t0: 0 };
  }

  var n = puntos.length;
  var sumT  = 0;
  var sumY  = 0;
  var sumTY = 0;
  var sumT2 = 0;

  puntos.forEach(function (p) {
    sumT  += p.t;
    sumY  += p.lnX;
    sumTY += p.t * p.lnX;
    sumT2 += p.t * p.t;
  });

  // Denominador de la fórmula de mínimos cuadrados
  var denominador = (n * sumT2 - sumT * sumT);

  // Si todos los t son iguales no hay pendiente calculable
  if (denominador === 0) {
    return { k: 0, C: Math.exp(sumY / n), t0: 0 };
  }

  // Pendiente k = tasa de crecimiento continua
  var k = (n * sumTY - sumT * sumY) / denominador;

  // Intercepto: ln(C) cuando t=0
  var lnC = (sumY - k * sumT) / n;
  var C   = Math.exp(lnC);

  // Limitar k para evitar proyecciones absurdas con pocos datos
  k = Math.max(-1.1, Math.min(1.1, k));

  return { k: k, C: C, t0: 0 };
}

// GET /api/reportes/prestamos-por-mes?meses=6
async function getPrestamosPorMes(req, res) {
  try {
    const numMeses = parseInt(req.query.meses) || 6;

    // 1. Obtener meses disponibles y datos de BD
    const mesesDisponibles  = await obtenerMesesDisponibles(numMeses);
    const datosLibros       = await obtenerPrestamosPorLibro(numMeses);
    const datosCategorias   = await obtenerPrestamosPorCategoria(numMeses);

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
        const prestamos       = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
        const modelo          = calcularModelo(prestamos);
        const k               = modelo.k;
        const C               = modelo.C;
        const t0              = modelo.t0;
        const puntosConDatos  = prestamos.filter(v => v > 0).length;

        return {
          nombre:             libro.nombre,
          categoria:          libro.categoria,
          prestamos:          prestamos,
          tasa_k:             k,
          C:                  C,
          t0:                 t0,
          porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
          datos_suficientes:  puntosConDatos >= 2
        };
      })
      .filter(l => l.prestamos.some(p => p > 0))
      .sort((a, b) => b.tasa_k - a.tasa_k);

    // 4. Construir mapa de categorías
    const categoriasMap = {};
    datosCategorias.forEach(fila => {
      if (!categoriasMap[fila.intidcategoria]) {
        categoriasMap[fila.intidcategoria] = {
          id:              fila.intidcategoria,
          nombre:          fila.nombre,
          prestamosPorMes: {}
        };
      }
      categoriasMap[fila.intidcategoria].prestamosPorMes[fila.mes] = fila.total;
    });

    const categorias = Object.values(categoriasMap)
      .map(cat => {
        const prestamos = mesesDisponibles.map(mes => cat.prestamosPorMes[mes] || 0);
        const modelo    = calcularModelo(prestamos);
        const k         = modelo.k;
        const C         = modelo.C;
        const t0        = modelo.t0;

        return {
          id:                 cat.id,
          nombre:             cat.nombre,
          prestamos:          prestamos,
          tasa_k:             k,
          C:                  C,
          t0:                 t0,
          porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
          datos_suficientes:  prestamos.filter(v => v > 0).length >= 2
        };
      })
      .sort((a, b) => b.tasa_k - a.tasa_k);

    res.json({
      success: true,
      data: {
        meses:      mesesDisponibles,
        libros:     libros,
        categorias: categorias
      }
    });

  } catch (error) {
    console.error('Error en getPrestamosPorMes:', error);
    res.status(500).json({
      success: false,
      message: 'Error en reportes',
      error:   error.message
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
      error:   error.message
    });
  }
}

export { getPrestamosPorMes, getEstadisticas };