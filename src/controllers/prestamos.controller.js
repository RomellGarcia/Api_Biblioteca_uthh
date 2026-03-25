import {
    obtenerPrestamos,
    buscarEjemplares,
    buscarUsuarioConPrestamos,
    generarTicket,
    registrarPrestamo,
    pagarSancion,
    buscarPorTicket,
    registrarDevolucion,
    obtenerPrestamosUsuario
} from '../models/prestamos.model.js';

// GET /api/prestamos
async function getPrestamos(req, res) {
    const { busqueda = '', filtro = 'todos' } = req.query;

    try {
        const resultados = await obtenerPrestamos(filtro, busqueda);

        const estadisticas = { total: resultados.length, activos: 0, devueltos: 0, vencidos: 0, proximos: 0, con_sancion_pendiente: 0 };
        
        resultados.forEach(p => {
            if (p.estado === 'devuelto') {
                estadisticas.devueltos++;
                if (p.flmontosancion > 0 && p.boolsancion == 0) estadisticas.con_sancion_pendiente++;
            } else if (p.estado === 'vencido') {
                estadisticas.vencidos++;
            } else if (p.estado === 'proximo') {
                estadisticas.proximos++;
            } else {
                estadisticas.activos++;
            }
        });

        res.json({ success: true, data: { prestamos: resultados, estadisticas } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /api/prestamos/buscar-ejemplares
async function getBuscarEjemplares(req, res) {
    const { termino = '' } = req.query;
    if (termino.length < 1) return res.json({ success: true, libros: [], total: 0 });
    try {
        const ejemplares = await buscarEjemplares(termino);
        const librosAgrupados = {};
        ejemplares.forEach(ejemplar => {
            const folio = ejemplar.vchfolio;
            if (!librosAgrupados[folio]) {
                librosAgrupados[folio] = {
                    vchfolio: folio,
                    vchtitulo: ejemplar.vchtitulo,
                    vchautor: ejemplar.vchautor,
                    vcheditorial: ejemplar.vcheditorial,
                    vchisbn: ejemplar.vchisbn,
                    intanio: ejemplar.intanio,
                    imagen: ejemplar.vchimagen || null,
                    vchcategoria: ejemplar.vchcategoria,
                    ejemplares_disponibles: ejemplar.ejemplares_disponibles,
                    ejemplares: []
                };
            }
            librosAgrupados[folio].ejemplares.push({
                intidejemplar: ejemplar.intidejemplar,
                vchcodigobarras: ejemplar.vchcodigobarras,
                vchedicion: ejemplar.vchedicion,
                vchubicacion: ejemplar.vchubicacion,
                descripcion_ubicacion: ejemplar.descripcion_ubicacion,
                vchestadolibro: ejemplar.vchestadolibro
            });
        });
        res.json({ success: true, libros: Object.values(librosAgrupados), total: Object.keys(librosAgrupados).length });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al buscar ejemplares', error: error.message });
    }
}

// GET /api/prestamos/buscar-usuario
async function getBuscarUsuario(req, res) {
    const { matricula } = req.query;
    if (!matricula) return res.status(400).json({ success: false, mensaje: 'Matrícula requerida' });

    try {
        const usuario = await buscarUsuarioConPrestamos(matricula);
        if (!usuario) return res.json({ success: false, mensaje: 'Usuario no encontrado' });
        
        res.json({ success: true, usuario });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al buscar usuario', error: error.message });
    }
}

// GET /api/prestamos/generar-ticket
async function getGenerarTicket(req, res) {
    try {
        const ticket = await generarTicket();
        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al generar ticket', error: error.message });
    }
}

// POST /api/prestamos/registrar
async function postRegistrar(req, res) {
    const { vchticket, intmatriculausuario, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones } = req.body;

    if (!vchticket || !intmatriculausuario || !fechaprestamo || !fechadevolucion || !intidejemplar) {
        return res.status(400).json({ success: false, mensaje: 'Faltan campos requeridos' });
    }

    const datos = {
        vchticket, 
        intmatriculausuario, 
        fechaprestamo, 
        fechadevolucion, 
        intidejemplar, 
        vchobservaciones,
        matriculaEmpleado: req.usuario.matricula,
        idRol: req.usuario.idrol
    };

    try {
        const resultado = await registrarPrestamo(datos);
        if (!resultado.ok) return res.json({ success: false, mensaje: resultado.mensaje });
        
        res.json({ 
            success: true, 
            mensaje: 'Préstamo registrado exitosamente', 
            idprestamo: resultado.idprestamo, 
            ticket: resultado.ticket 
        });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al registrar préstamo', error: error.message });
    }
}

// POST /api/prestamos/sancion
async function postSancion(req, res) {
    const { intiddevolucion } = req.body;
    if (!intiddevolucion) return res.status(400).json({ success: false, error: 'ID de devolución requerido' });

    try {
        const resultado = await pagarSancion(intiddevolucion);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Devolución no encontrada' });
        }
        res.json({ success: true, message: 'Sanción marcada como pagada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// GET /api/prestamos/buscar-por-ticket
async function getBuscarPorTicket(req, res) {
    const { ticket } = req.query;
    if (!ticket) return res.status(400).json({ success: false, mensaje: 'Ticket requerido' });

    try {
        const resultados = await buscarPorTicket(ticket);
        if (!resultados || resultados.length === 0) {
            return res.json({ success: false, mensaje: 'No se encontró un préstamo con ese ticket' });
        }
        res.json({ success: true, prestamo: resultados[0] });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al buscar préstamo', error: error.message });
    }
}

// POST /api/prestamos/devolucion
async function postDevolucion(req, res) {
    const { intidprestamo, intidejemplar, intmatricula_empleado, vchentrega, fechareal_devolucion } = req.body;
    
    if (!intidprestamo || !intidejemplar || !intmatricula_empleado || !vchentrega || !fechareal_devolucion) {
        return res.status(400).json({ success: false, mensaje: 'Faltan campos requeridos' });
    }

    try {
        const resultado = await registrarDevolucion(req.body);
        
        if (!resultado || !resultado.ok) {
            return res.json({ success: false, mensaje: resultado?.mensaje || 'Error desconocido en la devolución' });
        }
        
        // Aseguramos que montoSancion sea un número antes de usar toFixed
        const monto = Number(resultado.montoSancion) || 0;

        res.json({
            success: true,
            mensaje: 'Devolución registrada exitosamente',
            data: {
                iddevolucion: resultado.iddevolucion,
                sancion_aplicada: monto > 0,
                monto_sancion: monto.toFixed(2)
            }
        });
    } catch (error) {
        console.error("Error en postDevolucion:", error);
        res.status(500).json({ success: false, mensaje: 'Error al registrar devolución', error: error.message });
    }
}

const getMisPrestamos = async (req, res) => {
    try {
        const { matricula } = req.params;
        
        const rows = await obtenerPrestamosUsuario(matricula);
        res.json(rows);
        
    } catch (error) {
        console.error('Error en getMisPrestamos:', error);
        res.status(500).json({ mensaje: 'Error al obtener los préstamos', error: error.message });
    }
};

export { 
    getPrestamos, 
    getBuscarEjemplares, 
    getBuscarUsuario, 
    getGenerarTicket, 
    postRegistrar, 
    postSancion, 
    getBuscarPorTicket, 
    postDevolucion,
    getMisPrestamos
};