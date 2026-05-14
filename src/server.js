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

app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudesRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ mensaje: '¡Servidor del Club Náutico Poseidón en línea! ⚓' });
});

// Levantar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});