import conexion from '../config/db.js'; 
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; 

//Buscar usuario en las 3 tablas por matrícula
async function buscarUsuarioPorMatricula(matricula) {
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
    const [rows] = await conexion.query(sql, [matricula, matricula, matricula]);
    return rows;
}

//Obtener nombre del rol por ID
async function obtenerRolPorId(idRol) {
    const sql = "SELECT vchrol FROM tblroles WHERE intidrol = ?";
    const [rows] = await conexion.query(sql, [idRol]);
    return rows;
}

//Verificar contraseña — soporta bcrypt y MD5 legacy
async function verificarPassword(passwordIngresado, passwordGuardado) {
    // Intentar bcrypt primero
    const esBcrypt = passwordGuardado.startsWith('$2');
    if (esBcrypt) {
        return await bcrypt.compare(passwordIngresado, passwordGuardado);
    }
    //Fallback MD5 para cuentas antiguas
    const md5 = crypto.createHash('md5').update(passwordIngresado).digest('hex');
    return md5 === passwordGuardado;
}

//Hashear contraseña con bcrypt
async function hashearPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Obtener todos los usuarios
async function obtenerUsuarios() {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchtelefono, vchcalle, vchcolonia, intidrol,
               'Usuario' as tipo_usuario, 'tblusuarios' as tabla_origen
        FROM tblusuarios ORDER BY vchnombre ASC
    `;
    const [rows] = await conexion.query(sql);
    return rows;
}

//Obtener todos los administradores
async function obtenerAdministradores() {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchtelefono, vchcalle, vchcolonia, intidrol,
               'Administrador' as tipo_usuario, 'tbladministrador' as tabla_origen
        FROM tbladministrador ORDER BY vchnombre ASC
    `;
    const [rows] = await conexion.query(sql);
    return rows;
}

//Obtener todos los empleados
async function obtenerEmpleados() {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchcorreo, vchtelefono, vchcalle, vchcolonia, intidrol,
               'Empleado' as tipo_usuario, 'tblempleados' as tabla_origen
        FROM tblempleados ORDER BY vchnombre ASC
    `;
    const [rows] = await conexion.query(sql);
    return rows;
}

//Eliminar usuario de una tabla
async function eliminarUsuario(tabla, matricula) {
    const sql = `DELETE FROM ${tabla} WHERE intmatricula = ?`;
    const [resultado] = await conexion.query(sql, [matricula]);
    return resultado;
}

//Obtener perfil de usuario por matrícula y tabla
async function obtenerPerfil(tabla, matricula) {
    const sql = `
        SELECT u.intmatricula, u.vchnombre, u.vchapaterno, u.vchamaterno,
               u.vchtelefono, u.vchcorreo, u.vchcalle, u.vchcolonia, r.vchrol
        FROM ${tabla} u
        JOIN tblroles r ON u.intidrol = r.intidrol
        WHERE u.intmatricula = ?
    `;
    const [rows] = await conexion.query(sql, [matricula]);
    return rows;
}

//Actualizar perfil de usuario
async function actualizarPerfil(tabla, campos, matricula) {
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

    const [resultado] = await conexion.query(sql, params);
    return resultado;
}

//Obtener un usuario específico por matrícula y tabla
async function obtenerUsuarioPorMatricula(tabla, matricula) {
    const sql = `
        SELECT intmatricula, vchnombre, vchapaterno, vchamaterno,
               vchtelefono, vchcorreo, vchcalle, vchcolonia, intidrol
        FROM ${tabla} WHERE intmatricula = ?
    `;
    const [rows] = await conexion.query(sql, [matricula]);
    return rows;
}

//Obtener todos los roles
async function obtenerRoles() {
    const sql = "SELECT intidrol, vchrol FROM tblroles ORDER BY intidrol ASC";
    const [rows] = await conexion.query(sql);
    return rows;
}

//Actualizar usuario por admin
async function actualizarUsuario(datos) {
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

    const [resultado] = await conexion.query(sql, params);
    return resultado;
}

//Obtener la última matrícula generada
async function obtenerUltimaMatricula(tabla) {
    const sql = `SELECT MAX(intmatricula) as ultima FROM ${tabla}`;
    const [rows] = await conexion.query(sql);
    return rows;
}

//Registrar nuevo usuario
async function registrarUsuario(tabla, datos) {
    const { matricula, vchnombre, vchapaterno, vchamaterno, vchtelefono, vchcorreo, vchcalle, vchcolonia, vchpassword, intidrol } = datos;
    const sql = `INSERT INTO ${tabla} (intmatricula, vchnombre, vchapaterno, vchamaterno, vchtelefono, vchcorreo, vchcalle, vchcolonia, vchpassword, intidrol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [matricula, vchnombre, vchapaterno, vchamaterno, vchtelefono || null, vchcorreo, vchcalle || null, vchcolonia || null, vchpassword, intidrol];
    
    const [resultado] = await conexion.query(sql, params);
    return resultado;
}

//Exportación estilo ES Modules
export {
    buscarUsuarioPorMatricula, obtenerRolPorId, verificarPassword, hashearPassword,
    obtenerUsuarios, obtenerAdministradores, obtenerEmpleados,
    eliminarUsuario, obtenerPerfil, actualizarPerfil,
    obtenerUsuarioPorMatricula, obtenerRoles, actualizarUsuario,
    obtenerUltimaMatricula, registrarUsuario
};