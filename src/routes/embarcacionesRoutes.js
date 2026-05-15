const express = require('express');
const router = express.Router();
const { obtenerEmbarcaciones, crearEmbarcacion, validarEmbarcacion } = require('../controllers/embarcacionesController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// Solo Naviero (Rol 3) tiene acceso a gestionar la flota
router.get('/', verificarToken, autorizarRoles(3), obtenerEmbarcaciones);
router.post('/crear', verificarToken, autorizarRoles(3), crearEmbarcacion);
router.put('/:id/validar', verificarToken, autorizarRoles(3), validarEmbarcacion);

module.exports = router;