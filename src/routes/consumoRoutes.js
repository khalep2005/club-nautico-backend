const express = require('express');
const router = express.Router();
const { obtenerPreciosServicios, crearConsumo } = require('../controllers/consumoController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTA GET: Listar tarifas preestablecidas (Jefe y Secretaría tienen acceso)
router.get('/precios', verificarToken, autorizarRoles(1, 2), obtenerPreciosServicios);

// RUTA POST: Registrar consumo/servicio a un socio (SOLO Secretaría tiene acceso)
router.post('/', verificarToken, autorizarRoles(2), crearConsumo);

module.exports = router;
