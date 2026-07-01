const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 
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

        // Generar el Access Token (2 minutos)
        const accessToken = jwt.sign(
            { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '2m' } 
        );

        // Generar el Refresh Token (40 caracteres aleatorios)
        const refreshToken = crypto.randomBytes(40).toString('hex');
        
        // Calcular fecha de expiración 
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

        // Generar un NUEVO Access Token de 2 minutos
        const nuevoAccessToken = jwt.sign(
            { id_usuario: rtData.id_usuario, id_rol: usuario.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '2m' }
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

const registrarUsuario = async (req, res) => {
    const { nombres, apellidos, correo, contrasena, id_rol } = req.body;

    try {
        if (!nombres || !apellidos || !correo || !contrasena || !id_rol) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios, incluyendo los apellidos.' });
        }

        if (contrasena.length < 8) {
        return res.status(400).json({ mensaje: 'Por políticas de seguridad, la contraseña debe tener al menos 8 caracteres.' });
        }

        const usuarioExistente = await pool.query('SELECT * FROM usuarios_sistema WHERE correo = $1', [correo]);
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ mensaje: 'El correo ya está registrado en el club.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHasheada = await bcrypt.hash(contrasena, salt);

        const query = `
            INSERT INTO usuarios_sistema (nombres, apellidos, correo, contrasena, id_rol) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id_usuario, nombres, apellidos, correo, id_rol
        `;
        const valores = [nombres, apellidos, correo, passwordHasheada, id_rol];
        
        const nuevoUsuario = await pool.query(query, valores);

        res.status(201).json({ 
            mensaje: 'Usuario registrado exitosamente por Jefatura.',
            usuario: nuevoUsuario.rows[0]
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

const obtenerUsuarios = async (req, res) => {
    try {
        // Obtenemos todos los datos excepto la contraseña por seguridad
        const query = `
            SELECT id_usuario, nombres, apellidos, correo, id_rol, estado 
            FROM usuarios_sistema 
            ORDER BY id_usuario ASC
        `;
        const resultado = await pool.query(query);
        
        // Devolvemos la lista al frontend
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al listar usuarios.' });
    }
};


const actualizarUsuario = async (req, res) => {
    const { id } = req.params; 
    const { nombres, apellidos, id_rol } = req.body;

    try {
        if (!nombres || !apellidos || !id_rol) {
            return res.status(400).json({ mensaje: 'Nombres, apellidos y rol son obligatorios.' });
        }

        const query = `
            UPDATE usuarios_sistema 
            SET nombres = $1, apellidos = $2, id_rol = $3 
            WHERE id_usuario = $4 
            RETURNING id_usuario, nombres, apellidos, correo, id_rol
        `;
        const valores = [nombres, apellidos, id_rol, id];
        
        const resultado = await pool.query(query, valores);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        res.status(200).json({ mensaje: 'Usuario actualizado con éxito.', usuario: resultado.rows[0] });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ mensaje: 'Error interno al actualizar usuario.' });
    }
};

// Función para ELIMINAR un usuario
const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM usuarios_sistema WHERE id_usuario = $1 RETURNING id_usuario';
        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        res.status(200).json({ mensaje: 'Usuario eliminado del sistema.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ mensaje: 'Error interno al eliminar usuario.' });
    }
};

module.exports = { login, renovarToken, logout, registrarUsuario, obtenerUsuarios, actualizarUsuario, eliminarUsuario };
