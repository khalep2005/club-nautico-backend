const express = require('express');
const router = express.Router();
const { obtenerConsumosPendientes, generarFacturacionMensual, obtenerFacturasMorosas } = require('../controllers/facturacionController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTA GET: Listar consumos pendientes de facturación, agrupados por socio
// Acceso: Jefe (1) y Finanzas (4)
router.get('/consumos-pendientes', verificarToken, autorizarRoles(1, 4), obtenerConsumosPendientes);

// RUTA POST: Generar la facturación mensual (consolida consumos pendientes en facturas)
// Acceso: SOLO Finanzas (4)
router.post('/generar', verificarToken, autorizarRoles(4), generarFacturacionMensual);

// RUTA GET: Listar facturas vencidas sin pagar (morosidad)
// Acceso: Jefe (1) y Cobranza (5)
router.get('/morosos', verificarToken, autorizarRoles(1, 5), obtenerFacturasMorosas);

module.exports = router;
