import {
  obtenerPrestamosPorLibro,
  obtenerPrestamosPorCategoria,
  obtenerEstadisticasGenerales,
  obtenerMesesDisponibles
} from '../models/reportes.model.js';

// ====================== LEY DE CRECIMIENTO/DECRECIMIENTO ======================
// Fórmula: x = C · e^(k · t)
// Obtenida de: dx/dt = kx → dx/x = k dt → ln(x) = kt + ln(C) → x = Ce^(kt)
//
// Para encontrar k y C usando los 6 meses completos:
// Linealizamos: Y = ln(x), entonces Y = kt + b  (donde b = ln(C))
// Planteamos sistema de 2 ecuaciones sumando los 6 pares (t, Y):
//   ΣY     = k·Σt  + n·b      → ecuación 1
//   Σ(t·Y) = k·Σt² + b·Σt    → ecuación 2
// Resolvemos el sistema para k y b, luego C = e^b
//
// Los meses con 0 préstamos se reemplazan por 0.1 para poder aplicar ln(x),
// porque ln(0) es matemáticamente indefinido.

function calcularModelo(prestamos) {
  var n = prestamos.length; // siempre 6

  // Reemplazar ceros por 0.1 para poder calcular ln(x)
  var datos = prestamos.map(function(x, t) {
    return { t: t, x: x === 0 ? 0.1 : x };
  });

  // Construir columnas de la tabla: Y=ln(x), t², t·Y
  var sumaT   = 0;   // Σt
  var sumaY   = 0;   // Σln(x)
  var sumaT2  = 0;   // Σt²
  var sumaTY  = 0;   // Σ(t·ln x)

  datos.forEach(function(punto) {
    var Y = Math.log(punto.x); // ln(x)
    sumaT  += punto.t;
    sumaY  += Y;
    sumaT2 += punto.t * punto.t;
    sumaTY += punto.t * Y;
  });

  // Resolver el sistema de ecuaciones para k
  // k = (n·Σ(t·Y) - Σt·ΣY) / (n·Σt² - (Σt)²)
  var denominador = n * sumaT2 - sumaT * sumaT;
  if (denominador === 0) return { k: 0, C: prestamos[0] || 1, t0: 0 };

  var k = (n * sumaTY - sumaT * sumaY) / denominador;

  // Calcular b = ln(C)
  // b = (ΣY - k·Σt) / n
  var b = (sumaY - k * sumaT) / n;

  // C = e^b  (condición inicial ajustada por regresión)
  var C = Math.exp(b);

  // Limitar k a ±1.1 para evitar proyecciones absurdas con pocos datos reales
  k = Math.max(-1.1, Math.min(1.1, k));

  // Verificar que hay al menos 2 meses con datos reales (no solo 0.1)
  var mesesConDatos = prestamos.filter(function(v) { return v > 0; }).length;
  if (mesesConDatos < 2) return { k: 0, C: C, t0: 0, datos_suficientes: false };

  return {
    k: k,
    C: parseFloat(C.toFixed(4)),
    t0: 0, // t siempre empieza en 0 (primer mes del rango)
    datos_suficientes: true
  };
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
        const modelo = calcularModelo(prestamos);

        return {
          nombre: libro.nombre,
          categoria: libro.categoria,
          prestamos: prestamos,
          tasa_k: modelo.k,
          C: modelo.C,
          t0: modelo.t0,
          porcentaje_mensual: parseFloat(((Math.exp(modelo.k) - 1) * 100).toFixed(1)),
          datos_suficientes: modelo.datos_suficientes !== false
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
        const modelo = calcularModelo(prestamos);

        return {
          id: cat.id,
          nombre: cat.nombre,
          prestamos: prestamos,
          tasa_k: modelo.k,
          C: modelo.C,
          t0: modelo.t0,
          porcentaje_mensual: parseFloat(((Math.exp(modelo.k) - 1) * 100).toFixed(1))
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