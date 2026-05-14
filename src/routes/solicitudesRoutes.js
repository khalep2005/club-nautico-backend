const express = require('express');
const router = express.Router();
const { crearSolicitud, obtenerSolicitudes,evaluarSolicitud } = require('../controllers/solicitudesController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTA GET: Listar todas las solicitudes (Jefe y Secretaría tienen acceso)
router.get('/', verificarToken, autorizarRoles(1, 2), obtenerSolicitudes);

// RUTA POST: Crear nueva solicitud (SOLO Secretaría tiene acceso)
router.post('/crear', verificarToken, autorizarRoles(2), crearSolicitud);

// RUTA PUT: Evaluar solicitud (Aprobar/Rechazar) (SOLO Jefe tiene acceso)
router.put('/:id/evaluar', verificarToken, autorizarRoles(1), evaluarSolicitud);

module.exports = router;