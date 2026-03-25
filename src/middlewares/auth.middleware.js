import { verificarToken } from '../config/jwt.js';

function verificarAutenticacion(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Token no proporcionado o formato inválido'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verificarToken(token);
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

function verificarRolAdminEmpleado(req, res, next) {
    // Nos aseguramos de que el usuario exista 
    if (!req.usuario) {
        return res.status(401).json({
            success: false,
            error: 'Usuario no autenticado'
        });
    }

    const idRol = parseInt(req.usuario.idrol);
    // Verificamos si es Administrador (1) o Empleado (2)
    if (idRol !== 1 && idRol !== 2) {
        return res.status(403).json({
            success: false,
            error: 'No tienes permisos para acceder a esta sección'
        });
    }
    next();
}

export { verificarAutenticacion, verificarRolAdminEmpleado };