const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Importar la conexión a la base de datos
require('./config/db');

// Middlewares globales
app.use(cors());
app.use(express.json()); 

// ========================
// RUTAS DE LA API
// ========================
const authRoutes = require('./routes/authRoutes');
const solicitudesRoutes = require('./routes/solicitudesRoutes');
const sociosRoutes = require('./routes/sociosRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const embarcacionesRoutes = require('./routes/embarcacionesRoutes');
const radasRoutes = require('./routes/radasRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/socios', sociosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/embarcaciones', embarcacionesRoutes);
app.use('/api/radas', radasRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ mensaje: '¡Servidor del Club Náutico Poseidón en línea! ⚓' });
});

// Levantar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});