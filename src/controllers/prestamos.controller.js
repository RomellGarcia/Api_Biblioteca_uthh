const {
    obtenerPrestamos,
    buscarEjemplares,
    buscarUsuarioConPrestamos,
    generarTicket,
    registrarPrestamo,
    pagarSancion,
    buscarPorTicket,
    registrarDevolucion
} = require('../models/prestamos.model');

// GET /api/prestamos
function getPrestamos(req, res) {
    const { busqueda = '', filtro = 'todos' } = req.query;

    obtenerPrestamos(filtro, busqueda, (error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: error.message });

        const estadisticas = { total: resultados.length, activos: 0, devueltos: 0, vencidos: 0, proximos: 0, con_sancion_pendiente: 0 };
        resultados.forEach(p => {
            if (p.estado === 'devuelto') {
                estadisticas.devueltos++;
                if (p.flmontosancion > 0 && p.boolsancion == 0) estadisticas.con_sancion_pendiente++;
            } else if (p.estado === 'vencido') estadisticas.vencidos++;
            else if (p.estado === 'proximo') estadisticas.proximos++;
            else estadisticas.activos++;
        });

        res.json({ success: true, data: { prestamos: resultados, estadisticas } });
    });
}

// GET /api/prestamos/buscar-ejemplares
function getBuscarEjemplares(req, res) {
    const { termino = '' } = req.query;
    if (termino.length < 1) return res.json({ success: true, libros: [], total: 0 });

    buscarEjemplares(termino, (error, ejemplares) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al buscar ejemplares' });

        const librosAgrupados = {};
        ejemplares.forEach(ejemplar => {
            const folio = ejemplar.vchfolio;
            let imagenBase64 = null;
            if (ejemplar.imagen) {
                imagenBase64 = `data:image/webp;base64,${Buffer.from(ejemplar.imagen).toString('base64')}`;
            }
            if (!librosAgrupados[folio]) {
                librosAgrupados[folio] = {
                    vchfolio: folio,
                    vchtitulo: ejemplar.vchtitulo,
                    vchautor: ejemplar.vchautor,
                    vcheditorial: ejemplar.vcheditorial,
                    vchisbn: ejemplar.vchisbn,
                    intanio: ejemplar.intanio,
                    imagen: imagenBase64,
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
    });
}

// GET /api/prestamos/buscar-usuario
function getBuscarUsuario(req, res) {
    const { matricula } = req.query;
    if (!matricula) return res.status(400).json({ success: false, mensaje: 'Matrícula requerida' });

    buscarUsuarioConPrestamos(matricula, (error, usuario) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al buscar usuario' });
        if (!usuario) return res.json({ success: false, mensaje: 'Usuario no encontrado' });
        res.json({ success: true, usuario });
    });
}

// GET /api/prestamos/generar-ticket
function getGenerarTicket(req, res) {
    generarTicket((error, ticket) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al generar ticket' });
        res.json({ success: true, ticket });
    });
}

// POST /api/prestamos/registrar
function postRegistrar(req, res) {
    const { vchticket, intmatriculausuario, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones } = req.body;

    if (!vchticket || !intmatriculausuario || !fechaprestamo || !fechadevolucion || !intidejemplar) {
        return res.status(400).json({ success: false, mensaje: 'Faltan campos requeridos' });
    }

    const datos = {
        vchticket, intmatriculausuario, fechaprestamo, fechadevolucion, intidejemplar, vchobservaciones,
        matriculaEmpleado: req.session.usuario.matricula,
        idRol: req.session.usuario.idrol
    };

    registrarPrestamo(datos, (error, resultado) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al registrar préstamo' });
        if (!resultado.ok) return res.json({ success: false, mensaje: resultado.mensaje });
        res.json({ success: true, mensaje: 'Préstamo registrado exitosamente', idprestamo: resultado.idprestamo, ticket: resultado.ticket });
    });
}

// POST /api/prestamos/sancion
function postSancion(req, res) {
    const { intiddevolucion } = req.body;
    if (!intiddevolucion) return res.status(400).json({ success: false, error: 'ID de devolución requerido' });

    pagarSancion(intiddevolucion, (error, resultado) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        if (resultado.affectedRows === 0) return res.status(404).json({ success: false, error: 'Devolución no encontrada' });
        res.json({ success: true, message: 'Sanción marcada como pagada correctamente' });
    });
}

// GET /api/prestamos/buscar-por-ticket
function getBuscarPorTicket(req, res) {
    const { ticket } = req.query;
    if (!ticket) return res.status(400).json({ success: false, mensaje: 'Ticket requerido' });

    buscarPorTicket(ticket, (error, resultados) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al buscar préstamo' });
        if (resultados.length === 0) return res.json({ success: false, mensaje: 'No se encontró un préstamo con ese ticket' });
        res.json({ success: true, prestamo: resultados[0] });
    });
}

// POST /api/prestamos/devolucion
function postDevolucion(req, res) {
    const { intidprestamo, intidejemplar, intmatricula_empleado, vchentrega, fechareal_devolucion } = req.body;
    if (!intidprestamo || !intidejemplar || !intmatricula_empleado || !vchentrega || !fechareal_devolucion) {
        return res.status(400).json({ success: false, mensaje: 'Faltan campos requeridos' });
    }

    registrarDevolucion(req.body, (error, resultado) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al registrar devolución' });
        if (!resultado.ok) return res.json({ success: false, mensaje: resultado.mensaje });
        res.json({
            success: true,
            mensaje: 'Devolución registrada exitosamente',
            data: {
                iddevolucion: resultado.iddevolucion,
                sancion_aplicada: resultado.montoSancion > 0,
                monto_sancion: resultado.montoSancion.toFixed(2)
            }
        });
    });
}

module.exports = { getPrestamos, getBuscarEjemplares, getBuscarUsuario, getGenerarTicket, postRegistrar, postSancion, getBuscarPorTicket, postDevolucion };