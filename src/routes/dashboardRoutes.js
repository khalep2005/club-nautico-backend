const express = require('express');
const router = express.Router();
const { obtenerMetricasSecretaria, obtenerDashboardNaviero } = require('../controllers/dashboardController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTA GET: Obtener métricas (Acceso para Jefe y Secretaría)
router.get('/secretaria', verificarToken, autorizarRoles(1, 2), obtenerMetricasSecretaria);

// RUTA GET: Obtener dashboard naviero (Acceso para Naviero)
router.get('/naviero', verificarToken, autorizarRoles(3), obtenerDashboardNaviero);

module.exports = router;