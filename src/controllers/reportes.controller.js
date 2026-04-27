import {
  obtenerPrestamosPorLibro,
  obtenerPrestamosPorCategoria,
  obtenerEstadisticasGenerales,
  obtenerMesesDisponibles
} from '../models/reportes.model.js';

// Ley de Crecimiento/Decaimiento: solo ultimos dos meses con datos
function calcularTasaK(prestamos) {
  if (!prestamos || prestamos.length < 2) return 0;

  var puntos = [];
  prestamos.forEach(function(v, i) {
    if (v > 0) puntos.push({ valor: v, idx: i });
  });

  if (puntos.length < 2) return 0;

  // Solo el penultimo y el ultimo punto con datos reales
  var p0 = puntos[puntos.length - 2];
  var p1 = puntos[puntos.length - 1];

  var deltaT = p1.idx - p0.idx;
  if (deltaT <= 0) return 0;

  var k = Math.log(p1.valor / p0.valor) / deltaT;

  if (!isFinite(k) || Math.abs(k) >= 5) return 0;

  return Math.max(-1.1, Math.min(1.1, k));
}

// Extrae C y t0 de los ultimos dos puntos con datos
function calcularCyT0(prestamos) {
  var puntos = [];
  prestamos.forEach(function(v, i) {
    if (v > 0) puntos.push({ valor: v, idx: i });
  });
  if (puntos.length < 2) {
    return { C: prestamos.find(v => v > 0) || 1, t0: 0 };
  }
  var p0 = puntos[puntos.length - 2];
  return { C: p0.valor, t0: p0.idx };
}

// GET /api/reportes/prestamos-por-mes?meses=6
async function getPrestamosPorMes(req, res) {
  try {
    const numMeses = parseInt(req.query.meses) || 6;

    const mesesDisponibles = await obtenerMesesDisponibles(numMeses);
    const datosLibros      = await obtenerPrestamosPorLibro(numMeses);
    const datosCategorias  = await obtenerPrestamosPorCategoria(numMeses);

    // Mapa de libros
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
        const prestamos       = mesesDisponibles.map(mes => libro.prestamosPorMes[mes] || 0);
        const k               = calcularTasaK(prestamos);
        const { C, t0 }       = calcularCyT0(prestamos);
        const puntosConDatos  = prestamos.filter(v => v > 0).length;

        return {
          nombre:            libro.nombre,
          categoria:         libro.categoria,
          prestamos:         prestamos,
          tasa_k:            k,
          C:                 C,
          t0:                t0,
          porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
          datos_suficientes: puntosConDatos >= 2
        };
      })
      .filter(l => l.prestamos.some(p => p > 0))
      .sort((a, b) => b.tasa_k - a.tasa_k);

    // Mapa de categorias
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
        const prestamos      = mesesDisponibles.map(mes => cat.prestamosPorMes[mes] || 0);
        const k              = calcularTasaK(prestamos);
        const { C, t0 }      = calcularCyT0(prestamos);
        const puntosConDatos = prestamos.filter(v => v > 0).length;

        return {
          id:                cat.id,
          nombre:            cat.nombre,
          prestamos:         prestamos,
          tasa_k:            k,
          C:                 C,
          t0:                t0,
          porcentaje_mensual: parseFloat(((Math.exp(k) - 1) * 100).toFixed(1)),
          datos_suficientes: puntosConDatos >= 2
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