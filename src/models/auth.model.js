const conexion = require('../config/db');
const bcrypt = require('bcryptjs');

// Buscar usuario en las 3 tablas por matrícula
function buscarUsuarioPorMatricula(matricula, callback) {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchpassword, intidrol, 'Usuario' as tipo_tabla
        FROM tblusuarios WHERE intmatricula = ?
        UNION ALL
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchpassword, intidrol, 'Administrador' as tipo_tabla
        FROM tbladministrador WHERE intmatricula = ?
        UNION ALL
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchpassword, intidrol, 'Empleado' as tipo_tabla
        FROM tblempleados WHERE intmatricula = ?
    `;
    conexion.query(sql, [matricula, matricula, matricula], callback);
}

// Obtener nombre del rol por ID
function obtenerRolPorId(idRol, callback) {
    const sql = "SELECT vchrol FROM tblroles WHERE intidrol = ?";
    conexion.query(sql, [idRol], callback);
}

// Verificar contraseña — soporta bcrypt y MD5 legacy
async function verificarPassword(passwordIngresado, passwordGuardado) {
    // Intentar bcrypt primero
    const esBcrypt = passwordGuardado.startsWith('$2');
    if (esBcrypt) {
        return await bcrypt.compare(passwordIngresado, passwordGuardado);
    }
    // Fallback MD5 legacy (para cuentas antiguas)
    const crypto = require('crypto');
    const md5 = crypto.createHash('md5').update(passwordIngresado).digest('hex');
    return md5 === passwordGuardado;
}

// Hashear contraseña con bcrypt
async function hashearPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Obtener todos los usuarios
function obtenerUsuarios(callback) {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchtelefono, vchcalle, vchcolonia, intidrol,
               'Usuario' as tipo_usuario, 'tblusuarios' as tabla_origen
        FROM tblusuarios ORDER BY vchnombre ASC
    `;
    conexion.query(sql, callback);
}

// Obtener todos los administradores
function obtenerAdministradores(callback) {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchtelefono, vchcalle, vchcolonia, intidrol,
               'Administrador' as tipo_usuario, 'tbladministrador' as tabla_origen
        FROM tbladministrador ORDER BY vchnombre ASC
    `;
    conexion.query(sql, callback);
}

// Obtener todos los empleados
function obtenerEmpleados(callback) {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchtelefono, vchcalle, vchcolonia, intidrol,
               'Empleado' as tipo_usuario, 'tblempleados' as tabla_origen
        FROM tblempleados ORDER BY vchnombre ASC
    `;
    conexion.query(sql, callback);
}

// Eliminar usuario de una tabla
function eliminarUsuario(tabla, matricula, callback) {
    const sql = `DELETE FROM ${tabla} WHERE intmatricula = ?`;
    conexion.query(sql, [matricula], callback);
}

// Obtener perfil de usuario por matrícula y tabla
function obtenerPerfil(tabla, matricula, callback) {
    const sql = `
        SELECT u.intmatricula, u.vchnombre, u.vchapaterno, u.vchamaterno,
               u.vchtelefono, u.vchcorreo, u.vchcalle, u.vchcolonia, r.vchrol
        FROM ${tabla} u
        JOIN tblroles r ON u.intidrol = r.intidrol
        WHERE u.intmatricula = ?
    `;
    conexion.query(sql, [matricula], callback);
}

// Actualizar perfil de usuario
function actualizarPerfil(tabla, campos, matricula, callback) {
    const { vchnombre, vchapaterno, vchamaterno, vchtelefono, vchcorreo, vchcalle, vchcolonia, vchpassword } = campos;

    let sql = `
        UPDATE ${tabla} SET 
            vchnombre = ?, vchapaterno = ?, vchamaterno = ?,
            vchtelefono = ?, vchcorreo = ?, vchcalle = ?, vchcolonia = ?
    `;

    const params = [
        vchnombre, vchapaterno || '', vchamaterno || '',
        vchtelefono || '', vchcorreo, vchcalle || '', vchcolonia || ''
    ];

    if (vchpassword && vchpassword.trim() !== '') {
        sql += ', vchpassword = ?';
        params.push(vchpassword); // Ya viene hasheado desde el controller
    }

    sql += ' WHERE intmatricula = ?';
    params.push(matricula);

    conexion.query(sql, params, callback);
}

module.exports = {
    buscarUsuarioPorMatricula,
    obtenerRolPorId,
    verificarPassword,
    hashearPassword,
    obtenerUsuarios,
    obtenerAdministradores,
    obtenerEmpleados,
    eliminarUsuario,
    obtenerPerfil,
    actualizarPerfil
};