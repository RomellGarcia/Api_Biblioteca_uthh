// auth.controller.js - Controlador de autenticación y usuarios
const { AuthModel, md5 } = require('../models/auth.model');

const AuthController = {
    /**
     * POST /api/auth/login
     * Iniciar sesión
     */
    login: async (req, res) => {
        try {
            const { matricula, password, recordar } = req.body;

            // Validaciones básicas
            if (!matricula || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Matrícula y contraseña son requeridos'
                });
            }

            const matriculaNum = parseInt(matricula);
            if (isNaN(matriculaNum) || matriculaNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Matrícula inválida'
                });
            }

            // Buscar usuario en todas las tablas
            const usuarios = await AuthModel.buscarUsuarioPorMatricula(matriculaNum);

            if (usuarios.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Perfil no encontrado'
                });
            }

            const usuario = usuarios[0];

            // Verificar contraseña (MD5)
            const passwordHash = md5(password);
            if (passwordHash !== usuario.vchpassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Contraseña incorrecta'
                });
            }

            // Obtener nombre del rol
            const roles = await AuthModel.obtenerRolPorId(usuario.intidrol);
            const nombreRol = roles.length > 0 ? roles[0].vchrol.trim() : 'Sin Rol';
            
            const apellidos = `${usuario.vchapaterno || ''} ${usuario.vchamaterno || ''}`.trim();
            const nombreCompleto = `${usuario.vchnombre} ${apellidos}`.trim();

            // Crear sesión
            req.session.logueado = true;
            req.session.usuario = {
                id: usuario.intmatricula,
                matricula: usuario.intmatricula,
                nombre: usuario.vchnombre,
                apellido_paterno: usuario.vchapaterno || '',
                apellido_materno: usuario.vchamaterno || '',
                apellidos: apellidos,
                nombre_completo: nombreCompleto,
                correo: usuario.vchcorreo,
                idrol: usuario.intidrol,
                rol: nombreRol,
                tipo_tabla: usuario.tipo_tabla
            };

            // Si marcó "Recordarme"
            if (recordar) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 días
            }

            // Guardar sesión
            req.session.save((err) => {
                if (err) {
                    console.error('Error al guardar sesión:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error al crear sesión'
                    });
                }

                res.json({
                    success: true,
                    message: 'Inicio de sesión exitoso',
                    usuario: {
                        id: usuario.intmatricula,
                        matricula: usuario.intmatricula,
                        nombre: usuario.vchnombre,
                        apellidos: apellidos,
                        nombre_completo: nombreCompleto,
                        correo: usuario.vchcorreo,
                        rol: nombreRol,
                        idrol: usuario.intidrol,
                        tipo_tabla: usuario.tipo_tabla
                    }
                });
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                success: false,
                message: 'Error al iniciar sesión',
                error: error.message
            });
        }
    },

    /**
     * GET /api/auth/verificar
     * Verificar sesión activa
     */
    verificarSesion: (req, res) => {
        if (!req.session.logueado || !req.session.usuario) {
            return res.json({
                success: false,
                logged_in: false
            });
        }

        res.json({
            success: true,
            logged_in: true,
            usuario: req.session.usuario
        });
    },

    /**
     * POST /api/auth/logout
     * Cerrar sesión
     */
    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al cerrar sesión'
                });
            }

            res.clearCookie('connect.sid');
            res.json({
                success: true,
                message: 'Sesión cerrada correctamente'
            });
        });
    },

    /**
     * GET /api/auth/usuarios
     * Obtener todos los usuarios (estudiantes)
     */
    obtenerUsuarios: async (req, res) => {
        try {
            const usuarios = await AuthModel.obtenerTodosLosUsuarios();
            
            res.json({
                success: true,
                data: usuarios
            });
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener usuarios'
            });
        }
    },

    /**
     * GET /api/auth/administradores
     * Obtener todos los administradores
     */
    obtenerAdministradores: async (req, res) => {
        try {
            const administradores = await AuthModel.obtenerTodosLosAdministradores();
            
            res.json({
                success: true,
                data: administradores
            });
        } catch (error) {
            console.error('Error al obtener administradores:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener administradores'
            });
        }
    },

    /**
     * GET /api/auth/empleados
     * Obtener todos los empleados
     */
    obtenerEmpleados: async (req, res) => {
        try {
            const empleados = await AuthModel.obtenerTodosLosEmpleados();
            
            res.json({
                success: true,
                data: empleados
            });
        } catch (error) {
            console.error('Error al obtener empleados:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener empleados'
            });
        }
    },

    /**
     * GET /api/auth/perfil
     * Obtener perfil del usuario logueado
     */
    obtenerPerfil: async (req, res) => {
        try {
            const matricula = req.session.usuario.matricula;
            const idRol = req.session.usuario.idrol;

            const usuarios = await AuthModel.obtenerPerfilUsuario(matricula, idRol);

            if (usuarios.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                usuario: usuarios[0]
            });
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener perfil'
            });
        }
    },

    /**
     * PUT /api/auth/perfil
     * Actualizar perfil del usuario logueado
     */
    actualizarPerfil: async (req, res) => {
        try {
            const matricula = req.session.usuario.matricula;
            const idRol = req.session.usuario.idrol;
            
            const {
                vchnombre,
                vchapaterno,
                vchamaterno,
                vchtelefono,
                vchcorreo,
                vchcalle,
                vchcolonia,
                vchpassword
            } = req.body;

            // Validaciones
            if (!vchnombre || !vchcorreo) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Nombre y correo son requeridos'
                });
            }

            const resultado = await AuthModel.actualizarPerfilUsuario(matricula, idRol, {
                vchnombre,
                vchapaterno,
                vchamaterno,
                vchtelefono,
                vchcorreo,
                vchcalle,
                vchcolonia,
                vchpassword
            });

            if (resultado.affectedRows === 0) {
                return res.json({
                    success: false,
                    mensaje: 'No se pudo actualizar el perfil'
                });
            }

            // Actualizar información en la sesión
            req.session.usuario.nombre = vchnombre;
            req.session.usuario.apellido_paterno = vchapaterno || '';
            req.session.usuario.apellido_materno = vchamaterno || '';
            req.session.usuario.correo = vchcorreo;

            res.json({
                success: true,
                mensaje: 'Perfil actualizado correctamente'
            });
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al actualizar perfil'
            });
        }
    },

    /**
     * DELETE /api/auth/usuarios/:matricula
     * Eliminar usuario
     */
    eliminarUsuario: async (req, res) => {
        try {
            const { matricula } = req.params;
            const { tabla } = req.query;

            if (!tabla || !['tblusuarios', 'tbladministrador', 'tblempleados'].includes(tabla)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tabla no válida'
                });
            }

            const resultado = await AuthModel.eliminarUsuario(matricula, tabla);

            if (resultado.affectedRows === 0) {
                return res.json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Usuario eliminado correctamente'
            });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({
                success: false,
                error: 'Error al eliminar usuario'
            });
        }
    }
};

module.exports = AuthController;