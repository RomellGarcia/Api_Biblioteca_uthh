import conexion from '../config/db.js';

// Obtener todos los estados (Bueno, Regular, Malo)
export const obtenerEstados = async () => {
    const [res] = await conexion.query("SELECT intidestado as id, vchestadolibro as nombre FROM tblestado");
    return res;
};

// Obtener todas las ubicaciones (Estante A-1, Almacén, etc.)
export const obtenerUbicaciones = async () => {
    const [res] = await conexion.query("SELECT intidubicacion as id, vchubicacion as nombre FROM tblubicacion");
    return res;
};

// Obtener la lista de ejemplares de un libro específico
export const obtenerEjemplaresPorFolio = async (folio) => {
    const sql = `
        SELECT e.intidejemplar, e.vchcodigobarras, e.vchedicion, e.booldisponible,
               s.vchestadolibro as estado, u.vchubicacion as ubicacion
        FROM tblejemplares e
        LEFT JOIN tblestado s ON e.intidestado = s.intidestado
        LEFT JOIN tblubicacion u ON e.intidubicacion = u.intidubicacion
        WHERE e.vchfolio = ?`;
    const [res] = await conexion.query(sql, [folio]);
    return res;
};

// Insertar un nuevo ejemplar
export const insertarEjemplar = async (datos) => {
    const { vchcodigobarras, vchedicion, intidestado, intidubicacion, booldisponible, vchfolio } = datos;
    const sql = `INSERT INTO tblejemplares 
                 (vchcodigobarras, vchedicion, intidestado, intidubicacion, booldisponible, vchfolio) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const [res] = await conexion.query(sql, [vchcodigobarras, vchedicion, intidestado, intidubicacion, booldisponible, vchfolio]);
    return res;
};