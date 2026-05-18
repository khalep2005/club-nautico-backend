const express = require('express');
const router = express.Router();
const { obtenerRadas, asignarRada, liberarRada } = require('../controllers/radasController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// Solo Naviero (Rol 3) gestiona los espacios de amarre
router.get('/', verificarToken, autorizarRoles(3), obtenerRadas);
router.put('/:id/asignar', verificarToken, autorizarRoles(3), asignarRada);
router.put('/:id/liberar', verificarToken, autorizarRoles(3), liberarRada);

module.exports = router;