const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Librería nativa de Node para generar textos aleatorios seguros
const pool = require('../config/db');

// 1. INICIAR SESIÓN
const login = async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        const result = await pool.query(
            'SELECT * FROM Usuarios_Sistema WHERE correo = $1 AND estado = $2',
            [correo, 'Activo']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        const usuario = result.rows[0];
        const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);
        
        if (!validPassword) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        // Generar el Access Token (Corto - 15 minutos)
        const accessToken = jwt.sign(
            { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } 
        );

        // Generar el Refresh Token (Largo - 40 caracteres aleatorios)
        const refreshToken = crypto.randomBytes(40).toString('hex');
        
        // Calcular fecha de expiración (7 días en el futuro)
        const fechaExp = new Date();
        fechaExp.setDate(fechaExp.getDate() + 7);

        // Guardar el Refresh Token en tu tabla de la base de datos
        await pool.query(
            'INSERT INTO Refresh_Tokens (id_usuario, token, fecha_expiracion) VALUES ($1, $2, $3)',
            [usuario.id_usuario, refreshToken, fechaExp]
        );

        res.json({
            mensaje: 'Login exitoso',
            accessToken: accessToken,
            refreshToken: refreshToken, // Se lo mandamos al Frontend para que lo guarde
            usuario: {
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                id_rol: usuario.id_rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// 2. RENOVAR EL ACCESS TOKEN
const renovarToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ mensaje: 'Se requiere el Refresh Token' });
        }

        // Buscar el token en la BD asegurándonos de que no esté revocado ni expirado
        const result = await pool.query(
            'SELECT * FROM Refresh_Tokens WHERE token = $1 AND revocado = FALSE AND fecha_expiracion > CURRENT_TIMESTAMP',
            [refreshToken]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ mensaje: 'Refresh Token inválido, revocado o expirado. Vuelve a iniciar sesión.' });
        }

        const rtData = result.rows[0];

        // Buscar el rol del usuario para el nuevo JWT
        const userResult = await pool.query(
            'SELECT id_rol FROM Usuarios_Sistema WHERE id_usuario = $1', 
            [rtData.id_usuario]
        );
        const usuario = userResult.rows[0];

        // Generar un NUEVO Access Token de 15 minutos
        const nuevoAccessToken = jwt.sign(
            { id_usuario: rtData.id_usuario, id_rol: usuario.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ accessToken: nuevoAccessToken });

    } catch (error) {
        console.error('Error al renovar:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// 3. CERRAR SESIÓN (LOGOUT)
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ mensaje: 'Se requiere el Refresh Token para cerrar sesión' });
        }

        // "Matar" el token en la base de datos (revocarlo)
        await pool.query(
            'UPDATE Refresh_Tokens SET revocado = TRUE WHERE token = $1',
            [refreshToken]
        );

        res.json({ mensaje: 'Sesión cerrada exitosamente de forma segura 🔒' });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { login, renovarToken, logout };