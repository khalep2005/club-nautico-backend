const express = require('express');
const router = express.Router();

const { 
    obtenerConsumosPendientes, 
    obtenerTodosConsumos,
    generarFacturacionMensual, 
    obtenerFacturasMorosas, 
    obtenerFacturasPendientesPorVencer,
    fraccionarDeuda,
    obtenerEstadosCuentaGeneral, 
    obtenerDashboardFinanzas,
    registrarPago
} = require('../controllers/facturacionController');



const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');



// RUTA GET: Listar consumos pendientes de facturación, agrupados por socio
// Acceso: Jefe , Secretaría  y Finanzas 
router.get('/consumos-pendientes', verificarToken, autorizarRoles(1, 2, 4), obtenerConsumosPendientes);

// RUTA GET: Listar todos los consumos (historial general), agrupados por socio
// Acceso: Jefe , Secretaría y Finanzas 
router.get('/consumos', verificarToken, autorizarRoles(1, 2, 4), obtenerTodosConsumos);

// RUTA POST: Generar la facturación mensual (consolida consumos pendientes en facturas)
// Acceso: Finanzas 
router.post('/generar', verificarToken, autorizarRoles(4), generarFacturacionMensual);

// RUTA GET: Listar facturas vencidas sin pagar (morosidad)
// Acceso: Jefe , Finanzas  y Cobranza 
router.get('/morosos', verificarToken, autorizarRoles(1, 4, 5), obtenerFacturasMorosas);

// RUTA POST: Fraccionar una deuda existente en múltiples cuotas
// Acceso:  Finanzas 
router.post('/fraccionar', verificarToken, autorizarRoles(4), fraccionarDeuda);

// RUTA GET: Listar estado de cuenta general para la vista principal
// Acceso: Jefe  y Finanzas 
router.get('/estados-cuenta', verificarToken, autorizarRoles(1, 4), obtenerEstadosCuentaGeneral);

// RUTA GET: Obtener KPIs y datos para las gráficas del panel de inicio
// Acceso: Jefe  y Finanzas 
router.get('/dashboard', verificarToken, autorizarRoles(1, 4), obtenerDashboardFinanzas);

// RUTA POST: Registrar el pago de una factura y calcular interés SBS
// Acceso: Jefe , Finanzas  y Cobranza 
router.post('/pagar', verificarToken, autorizarRoles(1, 4, 5), registrarPago);

module.exports = router;