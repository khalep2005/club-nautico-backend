const jwt = require('jsonwebtoken');

// GUARDIA 1: Verifica si traes el pase VIP (Autenticación)
const verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'Acceso denegado. No se proporcionó un token válido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = verificado; // Guardamos { id_usuario, id_rol }
        next(); 
    } catch (error) {
        return res.status(401).json({ mensaje: 'El token es inválido o ha expirado.' });
    }
};

// GUARDIA 2: Verifica si tu Rol tiene permiso para esta zona (Autorización)
// Recibe una lista de roles permitidos (ej. [1, 4] -> Jefatura y Finanzas)
const autorizarRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Verificamos si el rol del usuario está dentro de la lista de roles permitidos
        if (!req.usuario || !rolesPermitidos.includes(req.usuario.id_rol)) {
            return res.status(403).json({ 
                mensaje: 'Acceso denegado (403). Tu rol no tiene permisos para realizar esta acción.' 
            });
        }
        // Si su rol está en la lista, lo dejamos pasar
        next();
    };
};

module.exports = { verificarToken, autorizarRoles };