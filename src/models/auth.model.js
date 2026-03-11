// auth.model.js - Modelo de autenticación y usuarios
const conexion = require('../config/database.config');
const crypto = require('crypto');

/**
 * Función helper para hashear con MD5
 */
const md5 = (texto) => {
    return crypto.createHash('md5').update(texto).digest('hex');
};

const AuthModel = {
    /**
     * Buscar usuario por matrícula en todas las tablas
     */
    buscarUsuarioPorMatricula: (matricula) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    u.intmatricula, 
                    u.vchnombre, 
                    u.vchapaterno, 
                    u.vchamaterno,
                    u.vchcorreo, 
                    u.vchpassword, 
                    u.intidrol,
                    'Usuario' as tipo_tabla
                FROM tblusuarios u
                WHERE u.intmatricula = ?
                
                UNION ALL
                
                SELECT 
                    a.intmatricula, 
                    a.vchnombre, 
                    a.vchapaterno, 
                    a.vchamaterno,
                    a.vchcorreo, 
                    a.vchpassword, 
                    a.intidrol,
                    'Administrador' as tipo_tabla
                FROM tbladministrador a
                WHERE a.intmatricula = ?
                
                UNION ALL
                
                SELECT 
                    e.intmatricula, 
                    e.vchnombre, 
                    e.vchapaterno, 
                    e.vchamaterno,
                    e.vchcorreo, 
                    e.vchpassword, 
                    e.intidrol,
                    'Empleado' as tipo_tabla
                FROM tblempleados e
                WHERE e.intmatricula = ?
            `;

            conexion.query(sql, [matricula, matricula, matricula], (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Obtener rol por ID
     */
    obtenerRolPorId: (idRol) => {
        return new Promise((resolve, reject) => {
            const sql = "SELECT vchrol FROM tblroles WHERE intidrol = ?";
            
            conexion.query(sql, [idRol], (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Obtener todos los usuarios (estudiantes)
     */
    obtenerTodosLosUsuarios: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    u.intmatricula,
                    u.vchnombre,
                    u.vchapaterno,
                    u.vchamaterno,
                    u.vchcorreo,
                    u.vchtelefono,
                    u.vchcalle,
                    u.vchcolonia,
                    u.intidrol,
                    'Usuario' as tipo_usuario,
                    'tblusuarios' as tabla_origen
                FROM tblusuarios u
                ORDER BY u.vchnombre ASC
            `;

            conexion.query(sql, (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Obtener todos los administradores
     */
    obtenerTodosLosAdministradores: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    a.intmatricula,
                    a.vchnombre,
                    a.vchapaterno,
                    a.vchamaterno,
                    a.vchcorreo,
                    a.vchtelefono,
                    a.vchcalle,
                    a.vchcolonia,
                    a.intidrol,
                    'Administrador' as tipo_usuario,
                    'tbladministrador' as tabla_origen
                FROM tbladministrador a
                ORDER BY a.vchnombre ASC
            `;

            conexion.query(sql, (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Obtener todos los empleados
     */
    obtenerTodosLosEmpleados: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    e.intmatricula,
                    e.vchnombre,
                    e.vchapaterno,
                    e.vchamaterno,
                    e.vchcorreo,
                    e.vchtelefono,
                    e.vchcalle,
                    e.vchcolonia,
                    e.intidrol,
                    'Empleado' as tipo_usuario,
                    'tblempleados' as tabla_origen
                FROM tblempleados e
                ORDER BY e.vchnombre ASC
            `;

            conexion.query(sql, (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Obtener perfil de usuario por matrícula y rol
     */
    obtenerPerfilUsuario: (matricula, idRol) => {
        return new Promise((resolve, reject) => {
            // Determinar tabla según el rol
            let tabla = '';
            switch (idRol) {
                case 1:
                    tabla = 'tbladministrador';
                    break;
                case 2:
                    tabla = 'tblempleados';
                    break;
                case 3:
                    tabla = 'tblusuarios';
                    break;
                default:
                    return reject(new Error('Rol no válido'));
            }

            const sql = `
                SELECT 
                    u.intmatricula, 
                    u.vchnombre, 
                    u.vchapaterno, 
                    u.vchamaterno, 
                    u.vchtelefono, 
                    u.vchcorreo, 
                    u.vchcalle, 
                    u.vchcolonia, 
                    r.vchrol
                FROM ${tabla} u
                JOIN tblroles r ON u.intidrol = r.intidrol
                WHERE u.intmatricula = ?
            `;

            conexion.query(sql, [matricula], (error, resultados) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultados);
            });
        });
    },

    /**
     * Actualizar perfil de usuario
     */
    actualizarPerfilUsuario: (matricula, idRol, datos) => {
        return new Promise((resolve, reject) => {
            // Determinar tabla según el rol
            let tabla = '';
            switch (idRol) {
                case 1:
                    tabla = 'tbladministrador';
                    break;
                case 2:
                    tabla = 'tblempleados';
                    break;
                case 3:
                    tabla = 'tblusuarios';
                    break;
                default:
                    return reject(new Error('Rol no válido'));
            }

            // Construir SQL dinámicamente
            let sql = `
                UPDATE ${tabla} SET 
                    vchnombre = ?,
                    vchapaterno = ?,
                    vchamaterno = ?,
                    vchtelefono = ?,
                    vchcorreo = ?,
                    vchcalle = ?,
                    vchcolonia = ?
            `;

            const params = [
                datos.vchnombre,
                datos.vchapaterno || '',
                datos.vchamaterno || '',
                datos.vchtelefono || '',
                datos.vchcorreo,
                datos.vchcalle || '',
                datos.vchcolonia || ''
            ];

            // Si se proporciona nueva contraseña, hashearla y agregarla
            if (datos.vchpassword && datos.vchpassword.trim() !== '') {
                sql += ', vchpassword = ?';
                params.push(md5(datos.vchpassword));
            }

            sql += ' WHERE intmatricula = ?';
            params.push(matricula);

            conexion.query(sql, params, (error, resultado) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultado);
            });
        });
    },

    /**
     * Eliminar usuario
     */
    eliminarUsuario: (matricula, tabla) => {
        return new Promise((resolve, reject) => {
            // Validar tabla
            const tablasPermitidas = ['tblusuarios', 'tbladministrador', 'tblempleados'];
            if (!tablasPermitidas.includes(tabla)) {
                return reject(new Error('Tabla no válida'));
            }

            const sql = `DELETE FROM ${tabla} WHERE intmatricula = ?`;

            conexion.query(sql, [matricula], (error, resultado) => {
                if (error) {
                    return reject(error);
                }
                resolve(resultado);
            });
        });
    }
};

module.exports = { AuthModel, md5 };