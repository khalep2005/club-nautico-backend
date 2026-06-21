const express = require('express');
const router = express.Router();
const { obtenerConsumosPendientes } = require('../controllers/facturacionController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTA GET: Listar consumos pendientes de facturación, agrupados por socio
// Acceso: Jefe (1) y Finanzas (4)
router.get('/consumos-pendientes', verificarToken, autorizarRoles(1, 4), obtenerConsumosPendientes);

module.exports = router;
