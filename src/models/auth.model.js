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
    // Fallback MD5 para cuentas antiguas)
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
        params.push(vchpassword);
    }

    sql += ' WHERE intmatricula = ?';
    params.push(matricula);

    conexion.query(sql, params, callback);
}

// Obtener un usuario específico por matrícula y tabla
function obtenerUsuarioPorMatricula(tabla, matricula, callback) {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchtelefono, vchcorreo, vchcalle, vchcolonia, intidrol
        FROM ${tabla} WHERE intmatricula = ?
    `;
    conexion.query(sql, [matricula], callback);
}

// Obtener todos los roles
function obtenerRoles(callback) {
    const sql = "SELECT intidrol, vchrol FROM tblroles ORDER BY intidrol ASC";
    conexion.query(sql, callback);
}

// Actualizar usuario por admin (cambia tabla, rol, datos y opcionalmente contraseña)
async function actualizarUsuario(datos, callback) {
    const {
        matricula_original, tabla, intmatricula, intidrol,
        vchnombre, vchapaterno, vchamaterno, vchtelefono,
        vchcorreo, vchcalle, vchcolonia, password_nueva
    } = datos;

    let sql = `
        UPDATE ${tabla} SET
            intmatricula = ?, intidrol = ?, vchnombre = ?, vchapaterno = ?,
            vchamaterno = ?, vchtelefono = ?, vchcorreo = ?,
            vchcalle = ?, vchcolonia = ?
    `;

    const params = [
        intmatricula, intidrol, vchnombre, vchapaterno || '',
        vchamaterno || '', vchtelefono || '', vchcorreo,
        vchcalle || '', vchcolonia || ''
    ];

    if (password_nueva && password_nueva.trim() !== '') {
        const hash = await hashearPassword(password_nueva);
        sql += ', vchpassword = ?';
        params.push(hash);
    }

    sql += ' WHERE intmatricula = ?';
    params.push(matricula_original);

    conexion.query(sql, params, callback);
}


// En obtenerUltimaMatricula y registrarUsuario, cambia pool por conexion:
function obtenerUltimaMatricula(tabla, callback) {
    conexion.query(`SELECT MAX(intmatricula) as ultima FROM ${tabla}`, callback);
}

function registrarUsuario(tabla, datos, callback) {
    const { matricula, vchnombre, vchapaterno, vchamaterno, vchtelefono, vchcorreo, vchcalle, vchcolonia, vchpassword, intidrol } = datos;
    const sql = `INSERT INTO ${tabla} (intmatricula, vchnombre, vchapaterno, vchamaterno, vchtelefono, vchcorreo, vchcalle, vchcolonia, vchpassword, intidrol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    conexion.query(sql, [matricula, vchnombre, vchapaterno, vchamaterno, vchtelefono || null, vchcorreo, vchcalle || null, vchcolonia || null, vchpassword, intidrol], callback);
}

module.exports = {
    buscarUsuarioPorMatricula, obtenerRolPorId, verificarPassword, hashearPassword,
    obtenerUsuarios, obtenerAdministradores, obtenerEmpleados,
    eliminarUsuario, obtenerPerfil, actualizarPerfil,
    obtenerUsuarioPorMatricula, obtenerRoles, actualizarUsuario,
    obtenerUltimaMatricula, registrarUsuario
};