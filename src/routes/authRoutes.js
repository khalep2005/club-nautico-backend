const express = require('express');
const router = express.Router();
const { login, renovarToken, logout } = require('../controllers/authController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');

// RUTAS PÚBLICAS (No necesitan token)
router.post('/login', login);
router.post('/refresh', renovarToken); 
router.post('/logout', logout);

// RUTAS PROTEGIDAS (Requieren Access Token)
router.get('/perfil', verificarToken, (req, res) => {
    res.json({ mensaje: '¡Bienvenido al área VIP!', datos: req.usuario });
});

router.get('/finanzas/facturas', verificarToken, autorizarRoles(1, 4), (req, res) => {
    res.json({ mensaje: 'Bienvenido a la bóveda. Aquí están las facturas. 💰' });
});

router.get('/nautica/embarcaciones', verificarToken, autorizarRoles(1, 3), (req, res) => {
    res.json({ mensaje: 'Bienvenido al muelle. Aquí gestionas la flota. 🚢' });
});

router.get('/secretaria/solicitudes', verificarToken, autorizarRoles(1, 2), (req, res) => {
    res.json({ mensaje: 'Bienvenido a Secretaría. Aquí gestionas los ingresos de nuevos socios. 📝' });
});

module.exports = router;