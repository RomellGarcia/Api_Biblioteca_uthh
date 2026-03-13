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
    actualizarUsuario,
    obtenerUltimaMatricula,  // ← agregar
    registrarUsuario         // ← agregar
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

// GET /api/auth/usuarios/todos
async function getTodosLosUsuarios(req, res) {
    try {
        // Ejecuta las tres consultas en paralelo
        const [usuarios, admins, empleados] = await Promise.all([
            new Promise((resolve) => obtenerUsuarios( (err, data) => resolve(data || []))),
            new Promise((resolve) => obtenerAdministradores( (err, data) => resolve(data || []))),
            new Promise((resolve) => obtenerEmpleados( (err, data) => resolve(data || [])))
        ]);

        // Combina todo en un solo array
        const todos = [...usuarios, ...admins, ...empleados];
        res.json({ success: true, data: todos });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al consolidar usuarios' });
    }
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
    const { matricula, idrol } = req.usuario;  // ← req.usuario
    const tablasPorRol = { 1: 'tbladministrador', 2: 'tblempleados', 3: 'tblusuarios' };
    const tabla = tablasPorRol[parseInt(idrol)];

    if (!tabla) return res.status(400).json({ success: false, error: 'Rol no válido' });

    obtenerPerfil(tabla, matricula, (error, resultados) => {
        if (error) return res.status(500).json({ success: false, error: 'Error al obtener perfil' });
        if (resultados.length === 0) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        res.json({ success: true, usuario: resultados[0] });
    });
}

// PUT /api/auth/perfil
async function putPerfil(req, res) {
    const { matricula, idrol } = req.usuario;  // ← req.usuario
    const tablasPorRol = { 1: 'tbladministrador', 2: 'tblempleados', 3: 'tblusuarios' };
    const tabla = tablasPorRol[parseInt(idrol)];

    if (!tabla) return res.status(400).json({ success: false, mensaje: 'Rol no válido' });

    const { vchnombre, vchcorreo, vchpassword } = req.body;
    if (!vchnombre || !vchcorreo) {
        return res.status(400).json({ success: false, mensaje: 'Nombre y correo son requeridos' });
    }

    const campos = { ...req.body };

    if (vchpassword && vchpassword.trim() !== '') {
        campos.vchpassword = await hashearPassword(vchpassword);
    }

    actualizarPerfil(tabla, campos, matricula, (error, resultado) => {
        if (error) return res.status(500).json({ success: false, mensaje: 'Error al actualizar perfil' });
        if (resultado.affectedRows === 0) return res.json({ success: false, mensaje: 'No se pudo actualizar el perfil' });
        res.json({ success: true, mensaje: 'Perfil actualizado correctamente' });
    });
}

// POST /api/auth/logout
function logout(req, res) {
    res.json({ success: true, message: 'Sesión cerrada correctamente', redirect: '/HTML/iniciar_sesion.html' });
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

// POST /api/auth/registro
async function registro(req, res) {
    const { vchnombre, vchapaterno, vchamaterno, vchtelefono, vchcorreo, vchcalle, vchcolonia, vchpassword, intidrol } = req.body;

    if (!vchnombre || !vchapaterno || !vchcorreo || !vchpassword || !intidrol) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }

    const rol = parseInt(intidrol);
    const tablasPorRol = { 1: 'tbladministrador', 2: 'tblempleados', 3: 'tblusuarios' };
    const tabla = tablasPorRol[rol];

    if (!tabla) {
        return res.status(400).json({ success: false, message: 'Rol no válido' });
    }

    try {
        const passwordHash = await hashearPassword(vchpassword);

        obtenerUltimaMatricula(tabla, (error, resultados) => {
            if (error) return res.status(500).json({ success: false, message: 'Error al generar matrícula' });

            const ultimaMatricula = resultados[0].ultima || 10100000;
            const nuevaMatricula = ultimaMatricula + 1;

            const datos = {
                matricula: nuevaMatricula,
                vchnombre,
                vchapaterno,
                vchamaterno: vchamaterno || null,
                vchtelefono: vchtelefono || null,
                vchcorreo,
                vchcalle: vchcalle || null,
                vchcolonia: vchcolonia || null,
                vchpassword: passwordHash,
                intidrol: rol
            };

            registrarUsuario(tabla, datos, (errorReg, resultado) => {
                if (errorReg) {
                    if (errorReg.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ success: false, message: 'El correo ya está registrado' });
                    }
                    return res.status(500).json({ success: false, message: 'Error al registrar usuario' });
                }

                res.json({
                    success: true,
                    message: 'Usuario registrado correctamente',
                    matricula: nuevaMatricula
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al procesar registro' });
    }
}

module.exports = {
    login, verificar, logout,
    getUsuarios, getAdministradores, getEmpleados,
    deleteUsuario, getPerfil, putPerfil,
    getUsuarioPorMatricula, getRoles, postActualizarUsuario,
    obtenerUltimaMatricula, registrarUsuario,
    registro
};