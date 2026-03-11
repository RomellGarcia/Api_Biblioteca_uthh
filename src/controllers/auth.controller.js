const { generarToken } = require('../config/jwt');
const {
    buscarUsuarioPorMatricula,
    obtenerRolPorId,
    verificarPassword,
    hashearPassword,
    obtenerUsuarios,
    obtenerAdministradores,
    obtenerEmpleados,
    eliminarUsuario,
    obtenerPerfil,
    actualizarPerfil,
    obtenerUsuarioPorMatricula,
    obtenerRoles,
    actualizarUsuario
} = require('../models/auth.model');

// POST /api/auth/login
async function login(req, res) {
    const { matricula, password, recordar } = req.body;

    if (!matricula || !password) {
        return res.status(400).json({ success: false, message: 'Matrícula y contraseña son requeridos' });
    }

    const matriculaNum = parseInt(matricula);
    if (isNaN(matriculaNum) || matriculaNum <= 0) {
        return res.status(400).json({ success: false, message: 'Matrícula inválida' });
    }

    buscarUsuarioPorMatricula(matriculaNum, async (error, resultados) => {
        if (error) return res.status(500).json({ success: false, message: 'Error de base de datos' });
        if (resultados.length === 0) return res.status(404).json({ success: false, message: 'Perfil no encontrado' });

        const usuario = resultados[0];

        const passwordValido = await verificarPassword(password, usuario.vchpassword);
        if (!passwordValido) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

        obtenerRolPorId(usuario.intidrol, (errorRol, resultadosRol) => {
            if (errorRol) return res.status(500).json({ success: false, message: 'Error al obtener rol' });

            const nombreRol = resultadosRol.length > 0 ? resultadosRol[0].vchrol.trim() : 'Sin Rol';
            const apellidos = `${usuario.vchapaterno || ''} ${usuario.vchamaterno || ''}`.trim();
            const nombreCompleto = `${usuario.vchnombre} ${apellidos}`.trim();

            const datosUsuario = {
                id: usuario.intmatricula,
                matricula: usuario.intmatricula,
                nombre: usuario.vchnombre,
                apellidos,
                nombre_completo: nombreCompleto,
                correo: usuario.vchcorreo,
                idrol: usuario.intidrol,
                rol: nombreRol,
                tipo_tabla: usuario.tipo_tabla
            };

            const token = generarToken(datosUsuario);

            const redirectPorRol = {
                1: '/HTML/gestion_prestamos.html', // Administrador
                2: '/HTML/gestion_prestamos.html', // Empleado
                3: '/HTML/index.html'              // Usuario
            };

            res.json({
                success: true,
                message: 'Inicio de sesión exitoso',
                token,
                usuario: datosUsuario,
                redirect: redirectPorRol[usuario.intidrol] || '/HTML/index.html'
            });
        });
    });
}

// GET /api/auth/verificar
function verificar(req, res) {
    if (!req.session || !req.session.logueado || !req.session.usuario) {
        return res.json({ success: false, logged_in: false });
    }
    res.json({ success: true, logged_in: true, usuario: req.session.usuario });
}
// POST /api/auth/logout
function logout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Sesión cerrada correctamente', redirect: '/HTML/index.html' });
    });
}

// GET /api/auth/usuarios
function getUsuarios(req, res) {
    obtenerUsuarios((error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
        res.json({ success: true, data: resultados });
    });
}

// GET /api/auth/administradores
function getAdministradores(req, res) {
    obtenerAdministradores((error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al obtener administradores' });
        res.json({ success: true, data: resultados });
    });
}

// GET /api/auth/empleados
function getEmpleados(req, res) {
    obtenerEmpleados((error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al obtener empleados' });
        res.json({ success: true, data: resultados });
    });
}

// DELETE /api/auth/usuarios/:matricula
function deleteUsuario(req, res) {
    const { matricula } = req.params;
    const { tabla } = req.query;

    if (!tabla || !['tblusuarios', 'tbladministrador', 'tblempleados'].includes(tabla)) {
        return res.status(400).json({ success: false, error: 'Tabla no válida' });
    }

    eliminarUsuario(tabla, matricula, (error, resultado) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
        if (resultado.affectedRows === 0) return res.json({ success: false, error: 'Usuario no encontrado' });
        res.json({ success: true, message: 'Usuario eliminado correctamente' });
    });
}

// GET /api/auth/perfil
function getPerfil(req, res) {
    const { matricula, idrol } = req.session.usuario;
    const tablasPorRol = { 1: 'tbladministrador', 2: 'tblempleados', 3: 'tblusuarios' };
    const tabla = tablasPorRol[idrol];

    if (!tabla) return res.status(400).json({ success: false, error: 'Rol no válido' });

    obtenerPerfil(tabla, matricula, (error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al obtener perfil' });
        if (resultados.length === 0) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        res.json({ success: true, usuario: resultados[0] });
    });
}

// PUT /api/auth/perfil
async function putPerfil(req, res) {
    const { matricula, idrol } = req.session.usuario;
    const tablasPorRol = { 1: 'tbladministrador', 2: 'tblempleados', 3: 'tblusuarios' };
    const tabla = tablasPorRol[idrol];

    if (!tabla) return res.status(400).json({ success: false, mensaje: 'Rol no válido' });

    const { vchnombre, vchcorreo, vchpassword } = req.body;
    if (!vchnombre || !vchcorreo) {
        return res.status(400).json({ success: false, mensaje: 'Nombre y correo son requeridos' });
    }

    const campos = { ...req.body };

    // Hashear nueva contraseña si se proporcionó
    if (vchpassword && vchpassword.trim() !== '') {
        campos.vchpassword = await hashearPassword(vchpassword);
    }

    actualizarPerfil(tabla, campos, matricula, (error, resultado) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al actualizar perfil' });
        if (resultado.affectedRows === 0) return res.json({ success: false, mensaje: 'No se pudo actualizar el perfil' });

        req.session.usuario.nombre = vchnombre;
        req.session.usuario.correo = vchcorreo;

        res.json({ success: true, mensaje: 'Perfil actualizado correctamente' });
    });
}

// GET /api/auth/usuarios/:matricula — obtener un usuario específico
function getUsuarioPorMatricula(req, res) {
    const { matricula } = req.params;
    const { tabla } = req.query;
    const tablasPermitidas = ['tblusuarios', 'tbladministrador', 'tblempleados'];

    if (!tabla || !tablasPermitidas.includes(tabla)) {
        return res.status(400).json({ success: false, error: 'Tabla no válida' });
    }

    obtenerUsuarioPorMatricula(tabla, matricula, (error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al obtener usuario' });
        if (resultados.length === 0) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        res.json({ success: true, data: resultados[0] });
    });
}

// GET /api/auth/roles — obtener todos los roles
function getRoles(req, res) {
    obtenerRoles((error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al obtener roles' });
        res.json({ success: true, data: resultados });
    });
}

// POST /api/auth/usuarios/actualizar — actualizar usuario por admin
async function postActualizarUsuario(req, res) {
    const { tabla } = req.body;
    const tablasPermitidas = ['tblusuarios', 'tbladministrador', 'tblempleados'];

    if (!tabla || !tablasPermitidas.includes(tabla)) {
        return res.status(400).json({ success: false, error: 'Tabla no válida' });
    }

    try {
        actualizarUsuario(req.body, (error, resultado) => {
            if (error) return res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
            if (resultado.affectedRows === 0) return res.json({ success: false, error: 'Usuario no encontrado' });
            res.json({ success: true, message: 'Usuario actualizado correctamente' });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al procesar la solicitud' });
    }
}

module.exports = {
    login, verificar, logout,
    getUsuarios, getAdministradores, getEmpleados,
    deleteUsuario, getPerfil, putPerfil,
    getUsuarioPorMatricula, getRoles, postActualizarUsuario
};