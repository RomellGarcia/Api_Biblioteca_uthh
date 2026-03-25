import { generarToken } from '../config/jwt.js';
import {
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
    obtenerUltimaMatricula,
    registrarUsuario        
} from '../models/auth.model.js';

// POST /api/auth/login
async function login(req, res) {
    try {
        const { matricula, password } = req.body;

        if (!matricula || !password) {
            return res.status(400).json({ success: false, message: 'Matrícula y contraseña son requeridos' });
        }

        const matriculaNum = parseInt(matricula);
        if (isNaN(matriculaNum) || matriculaNum <= 0) {
            return res.status(400).json({ success: false, message: 'Matrícula inválida' });
        }
        const resultados = await buscarUsuarioPorMatricula(matriculaNum);
        
        if (resultados.length === 0) {
            return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
        }

        const usuario = resultados[0];

        const passwordValido = await verificarPassword(password, usuario.vchpassword);
        if (!passwordValido) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        const resultadosRol = await obtenerRolPorId(usuario.intidrol);
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
            1: '/HTML/gestion_prestamos.html',
            2: '/HTML/gestion_prestamos.html',
            3: '/HTML/index.html'              
        };

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            usuario: datosUsuario,
            redirect: redirectPorRol[usuario.intidrol] || '/HTML/index.html'
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
}

// GET /api/auth/verificar (Refactorizado para JWT)
function verificar(req, res) {
    if (!req.usuario) {
        return res.json({ success: false, logged_in: false });
    }
    res.json({ success: true, logged_in: true, usuario: req.usuario });
}

// GET /api/auth/usuarios
async function getUsuarios(req, res) {
    try {
        const resultados = await obtenerUsuarios();
        res.json({ success: true, data: resultados });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
    }
}

// GET /api/auth/administradores
async function getAdministradores(req, res) {
    try {
        const resultados = await obtenerAdministradores();
        res.json({ success: true, data: resultados });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener administradores' });
    }
}

// GET /api/auth/empleados
async function getEmpleados(req, res) {
    try {
        const resultados = await obtenerEmpleados();
        res.json({ success: true, data: resultados });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener empleados' });
    }
}

// GET /api/auth/usuarios/todos
async function getTodosLosUsuarios(req, res) {
    try {
        const [usuarios, admins, empleados, roles] = await Promise.all([
            obtenerUsuarios(),
            obtenerAdministradores(),
            obtenerEmpleados(),
            obtenerRoles()
        ]);

        const todos = [...(usuarios || []), ...(admins || []), ...(empleados || [])];
        res.json({ success: true, data: todos, roles: roles || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener datos' });
    }
}

// DELETE /api/auth/usuarios/:matricula
async function deleteUsuario(req, res) {
    try {
        const { matricula } = req.params;
        const { tabla } = req.query;

        if (!tabla || !['tblusuarios', 'tbladministrador', 'tblempleados'].includes(tabla)) {
            return res.status(400).json({ success: false, error: 'Tabla no válida' });
        }

        const resultado = await eliminarUsuario(tabla, matricula);
        
        if (resultado.affectedRows === 0) {
            return res.json({ success: false, error: 'Usuario no encontrado' });
        }
        res.json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
    }
}

// GET /api/auth/perfil
async function getPerfil(req, res) {
    try {
        const { matricula, idrol } = req.usuario;
        const tablasPorRol = { 1: 'tbladministrador', 2: 'tblempleados', 3: 'tblusuarios' };
        const tabla = tablasPorRol[parseInt(idrol)];

        if (!tabla) return res.status(400).json({ success: false, error: 'Rol no válido' });

        const resultados = await obtenerPerfil(tabla, matricula);
        
        if (resultados.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }
        res.json({ success: true, usuario: resultados[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener perfil' });
    }
}

// PUT /api/auth/perfil
async function putPerfil(req, res) {
    try {
        const { matricula, idrol } = req.usuario;
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

        const resultado = await actualizarPerfil(tabla, campos, matricula);
        
        if (resultado.affectedRows === 0) {
            return res.json({ success: false, mensaje: 'No se pudo actualizar el perfil' });
        }
        res.json({ success: true, mensaje: 'Perfil actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al actualizar perfil' });
    }
}

// POST /api/auth/logout
function logout(req, res) {
    res.json({ success: true, message: 'Sesión cerrada correctamente', redirect: '/HTML/iniciar_sesion.html' });
}

// GET /api/auth/usuarios/:matricula
async function getUsuarioPorMatricula(req, res) {
    try {
        const { matricula } = req.params;
        const { tabla } = req.query;
        const tablasPermitidas = ['tblusuarios', 'tbladministrador', 'tblempleados'];

        if (!tabla || !tablasPermitidas.includes(tabla)) {
            return res.status(400).json({ success: false, error: 'Tabla no válida' });
        }

        const resultados = await obtenerUsuarioPorMatricula(tabla, matricula);
        
        if (resultados.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }
        res.json({ success: true, data: resultados[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener usuario' });
    }
}

// GET /api/auth/roles
async function getRoles(req, res) {
    try {
        const resultados = await obtenerRoles();
        res.json({ success: true, data: resultados });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener roles' });
    }
}

// POST /api/auth/usuarios/actualizar
async function postActualizarUsuario(req, res) {
    try {
        const { tabla } = req.body;
        const tablasPermitidas = ['tblusuarios', 'tbladministrador', 'tblempleados'];

        if (!tabla || !tablasPermitidas.includes(tabla)) {
            return res.status(400).json({ success: false, error: 'Tabla no válida' });
        }

        const resultado = await actualizarUsuario(req.body);
        
        if (resultado.affectedRows === 0) {
            return res.json({ success: false, error: 'Usuario no encontrado' });
        }
        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al procesar la solicitud' });
    }
}

// POST /api/auth/registro
async function registro(req, res) {
    try {
        const { vchnombre, vchapaterno, vchamaterno, vchtelefono, vchcorreo, vchcalle, vchcolonia, vchpassword, intidrol } = req.body;

        if (!vchnombre || !vchapaterno || !vchcorreo || !vchpassword || !intidrol) {
            return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
        }

        const rol = parseInt(intidrol);
        const tablasPorRol = { 1: 'tbladministrador', 2: 'tblempleados', 3: 'tblusuarios' };
        const tabla = tablasPorRol[rol];

        if (!tabla) return res.status(400).json({ success: false, message: 'Rol no válido' });

        const passwordHash = await hashearPassword(vchpassword);

        const resultadosUltima = await obtenerUltimaMatricula(tabla);
        const ultimaMatricula = resultadosUltima[0]?.ultima || 10100000;
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

        await registrarUsuario(tabla, datos);

        res.json({
            success: true,
            message: 'Usuario registrado correctamente',
            matricula: nuevaMatricula
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El correo ya está registrado' });
        }
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error al registrar usuario' });
    }
}

// POST /api/auth/registro-publico (sin autenticación, solo rol 3)
export async function registroPublico(req, res) {
    // Forzar rol 3 (usuario/lector) para evitar que se creen admins
    req.body.intidrol = 3;
    return registro(req, res);
}

export {
    login, verificar, logout,
    getUsuarios, getAdministradores, getEmpleados,
    deleteUsuario, getPerfil, putPerfil,
    getUsuarioPorMatricula, getRoles, postActualizarUsuario,
    obtenerUltimaMatricula, registrarUsuario,
    getTodosLosUsuarios,
    registro
};