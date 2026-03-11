// auth.middleware.js - Middlewares de autenticación y autorización

/**
 * Middleware para verificar que el usuario esté autenticado
 */
const verificarAutenticacion = (req, res, next) => {
    if (!req.session || !req.session.logueado || !req.session.usuario) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado. Por favor inicia sesión.'
        });
    }
    next();
};

/**
 * Middleware para verificar roles específicos
 * @param {Array} rolesPermitidos - Array de IDs de roles permitidos
 */
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.session.usuario || !req.session.usuario.idrol) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        const idRol = req.session.usuario.idrol;
        
        if (!rolesPermitidos.includes(idRol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a esta sección',
                rolRequerido: rolesPermitidos,
                rolActual: idRol
            });
        }

        next();
    };
};

/**
 * Middleware para verificar rol de Administrador o Empleado
 * Roles permitidos: 1 (Admin), 2 (Empleado)
 */
const verificarRolAdminEmpleado = verificarRol([1, 2]);

/**
 * Middleware para verificar solo rol de Administrador
 * Rol permitido: 1 (Admin)
 */
const verificarRolAdmin = verificarRol([1]);

/**
 * Middleware para verificar todos los roles (cualquier usuario autenticado)
 * Roles permitidos: 1 (Admin), 2 (Empleado), 3 (Usuario)
 */
const verificarCualquierRol = verificarRol([1, 2, 3]);

module.exports = {
    verificarAutenticacion,
    verificarRol,
    verificarRolAdminEmpleado,
    verificarRolAdmin,
    verificarCualquierRol
};