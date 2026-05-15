const express = require('express');
const router = express.Router();
const { obtenerZarpes, crearZarpe, aprobarZarpe } = require('../controllers/zarpesController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// Protegemos las rutas para que solo el Naviero (3) y el Jefe (1) puedan acceder
router.get('/', verificarToken, autorizarRoles(1, 3), obtenerZarpes);
router.post('/crear', verificarToken, autorizarRoles(1, 3), crearZarpe);
router.put('/:id/aprobar', verificarToken, autorizarRoles(1, 3), aprobarZarpe);

module.exports = router;