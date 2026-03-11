const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generar token JWT con los datos del usuario
function generarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            matricula: usuario.matricula,
            idrol: usuario.idrol,
            rol: usuario.rol,
            tipo_tabla: usuario.tipo_tabla
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Verificar y decodificar token JWT
function verificarToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = { generarToken, verificarToken };