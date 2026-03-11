const { verificarToken } = require('../config/jwt');

// Middleware doble: verifica sesión activa Y token JWT válido
function verificarAutenticacion(req, res, next) {
    // 1. Verificar sesión
    if (!req.session || !req.session.logueado || !req.session.usuario) {
        return res.status(401).json({
            success: false,
            error: 'Sesión no válida. Inicia sesión nuevamente'
        });
    }

    // 2. Verificar token JWT del header Authorization: Bearer <token>
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

        // 3. Verificar que el token corresponde al mismo usuario de la sesión
        if (decoded.matricula !== req.session.usuario.matricula) {
            return res.status(401).json({
                success: false,
                error: 'Token no corresponde a la sesión activa'
            });
        }

        // Adjuntar datos del token al request para uso en controllers
        req.usuario = decoded;
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

// Middleware para verificar rol admin o empleado
function verificarRolAdminEmpleado(req, res, next) {
    const idRol = req.session.usuario.idrol;
    if (idRol !== 1 && idRol !== 2) {
        return res.status(403).json({
            success: false,
            error: 'No tienes permisos para acceder a esta sección'
        });
    }
    next();
}

module.exports = { verificarAutenticacion, verificarRolAdminEmpleado };