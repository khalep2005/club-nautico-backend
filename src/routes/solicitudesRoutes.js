const express = require('express');
const router = express.Router();
const { crearSolicitud, obtenerSolicitudes } = require('../controllers/solicitudesController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTA GET: Listar todas las solicitudes (Jefe y Secretaría tienen acceso)
router.get('/', verificarToken, autorizarRoles(1, 2), obtenerSolicitudes);

// RUTA POST: Crear nueva solicitud (SOLO Secretaría tiene acceso)
router.post('/crear', verificarToken, autorizarRoles(2), crearSolicitud);

module.exports = router;