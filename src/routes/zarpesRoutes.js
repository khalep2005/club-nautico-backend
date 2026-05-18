const express = require('express');
const router = express.Router();
const { obtenerZarpes, crearZarpe, aprobarZarpe } = require('../controllers/zarpesController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');
const { obtenerZarpes, crearZarpe, aprobarZarpe, obtenerZarpePorId } = require('../controllers/zarpesController');

// Protegemos las rutas para que solo el Naviero (3) 
router.get('/', verificarToken, autorizarRoles(3), obtenerZarpes);
router.post('/crear', verificarToken, autorizarRoles(3), crearZarpe);
router.put('/:id/aprobar', verificarToken, autorizarRoles(3), aprobarZarpe);
router.get('/:id/documento', verificarToken, autorizarRoles(3), obtenerZarpePorId);

module.exports = router;