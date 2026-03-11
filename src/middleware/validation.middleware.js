// validation.middleware.js - Middlewares de validación
/**
 * Middleware para validar que existan campos requeridos en el body
 * @param {Array} camposRequeridos - Array de nombres de campos requeridos
 */
const validarCamposRequeridos = (camposRequeridos) => {
    return (req, res, next) => {
        const camposFaltantes = [];

        for (const campo of camposRequeridos) {
            if (req.body[campo] === undefined || req.body[campo] === null || req.body[campo] === '') {
                camposFaltantes.push(campo);
            }
        }

        if (camposFaltantes.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos',
                camposFaltantes
            });
        }

        next();
    };
};

/**
 * Middleware para validar formato de matrícula
 */
const validarMatricula = (req, res, next) => {
    const { matricula } = req.body;

    if (!matricula) {
        return res.status(400).json({
            success: false,
            message: 'Matrícula es requerida'
        });
    }

    const matriculaNum = parseInt(matricula);
    
    if (isNaN(matriculaNum) || matriculaNum <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Matrícula inválida. Debe ser un número positivo'
        });
    }

    // Normalizar la matrícula como número
    req.body.matricula = matriculaNum;
    next();
};

/**
 * Middleware para validar formato de email
 */
const validarEmail = (req, res, next) => {
    const { vchcorreo } = req.body;

    // Si no se proporciona email, continuar (es opcional en algunos casos)
    if (!vchcorreo) {
        return next();
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(vchcorreo)) {
        return res.status(400).json({
            success: false,
            message: 'Formato de correo electrónico inválido'
        });
    }

    next();
};

/**
 * Middleware para validar formato de fecha
 */
const validarFecha = (nombreCampo) => {
    return (req, res, next) => {
        const fecha = req.body[nombreCampo];

        if (!fecha) {
            return res.status(400).json({
                success: false,
                message: `El campo ${nombreCampo} es requerido`
            });
        }

        const fechaObj = new Date(fecha);
        
        if (isNaN(fechaObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: `Formato de fecha inválido en ${nombreCampo}`
            });
        }

        next();
    };
};

/**
 * Middleware para validar query params
 */
const validarQueryParams = (paramsRequeridos) => {
    return (req, res, next) => {
        const paramsFaltantes = [];

        for (const param of paramsRequeridos) {
            if (!req.query[param]) {
                paramsFaltantes.push(param);
            }
        }

        if (paramsFaltantes.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros de consulta requeridos',
                paramsFaltantes
            });
        }

        next();
    };
};

module.exports = {
    validarCamposRequeridos,
    validarMatricula,
    validarEmail,
    validarFecha,
    validarQueryParams
};