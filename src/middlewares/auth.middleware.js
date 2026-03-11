const { verificarToken } = require('../config/jwt');

function verificarAutenticacion(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Token no proporcionado'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verificarToken(token);
        req.usuario = decoded;
        req.session = req.session || {};
        req.session.usuario = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado. Inicia sesión nuevamente'
            });
        }
        return res.status(401).json({
            success: false,
            error: 'Token inválido'
        });
    }
}

function verificarRolAdminEmpleado(req, res, next) {
    const idRol = parseInt(req.usuario.idrol);
    if (idRol !== 1 && idRol !== 2) {
        return res.status(403).json({
            success: false,
            error: 'No tienes permisos para acceder a esta sección'
        });
    }
    next();
}

module.exports = { verificarAutenticacion, verificarRolAdminEmpleado };