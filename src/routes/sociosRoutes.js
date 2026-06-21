const express = require('express');
const router = express.Router();
const { obtenerSocios, buscarSocioPorDocumento } = require('../controllers/sociosController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTA GET: Buscar un socio por tipo y número de documento (usado en Registrar Servicio)
router.get('/buscar', verificarToken, autorizarRoles(1, 2, 3), buscarSocioPorDocumento);

// RUTA GET: Listar todos los socios
router.get('/', verificarToken, autorizarRoles(1, 2, 3), obtenerSocios);

module.exports = router;