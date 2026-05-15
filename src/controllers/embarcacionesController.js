const pool = require('../config/db');

// 1. LISTAR embarcaciones (GET)
const obtenerEmbarcaciones = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id_embarcacion, e.matricula, e.nombre_nave, e.tipo, e.eslora, e.estado_capitania,
                s.nombres, s.apellidos
            FROM embarcaciones e
            INNER JOIN socios s ON e.id_socio = s.id_socio
            ORDER BY e.id_embarcacion DESC
        `;
        const resultado = await pool.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener embarcaciones:', error);
        res.status(500).json({ mensaje: 'Error al cargar la flota.' });
    }
};

// 2. CREAR embarcación (POST)
const crearEmbarcacion = async (req, res) => {
    const { id_socio, matricula, nombre_nave, tipo, eslora } = req.body;

    try {
        const query = `
            INSERT INTO embarcaciones (id_socio, matricula, nombre_nave, tipo, eslora, estado_capitania)
            VALUES ($1, $2, $3, $4, $5, 'Pendiente')
            RETURNING *
        `;
        const values = [id_socio, matricula, nombre_nave, tipo, eslora];
        const resultado = await pool.query(query, values);

        res.status(201).json({ mensaje: 'Embarcación registrada con éxito', embarcacion: resultado.rows[0] });
    } catch (error) {
        console.error('Error al crear embarcación:', error);
        // Manejo de error si la matrícula se repite (asumiendo que le pusiste UNIQUE en la BD)
        if (error.code === '23505') {
            return res.status(400).json({ mensaje: 'La matrícula ingresada ya existe.' });
        }
        res.status(500).json({ mensaje: 'Error interno al registrar la embarcación.' });
    }
};

// 3. VALIDAR embarcación (PUT) - Para el botón verde del Naviero
const validarEmbarcacion = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            UPDATE embarcaciones 
            SET estado_capitania = 'Validado' 
            WHERE id_embarcacion = $1 
            RETURNING *
        `;
        const resultado = await pool.query(query, [id]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Embarcación no encontrada.' });
        }
        res.status(200).json({ mensaje: 'Embarcación validada por Capitanía.' });
    } catch (error) {
        console.error('Error al validar embarcación:', error);
        res.status(500).json({ mensaje: 'Error al validar la embarcación.' });
    }
};

module.exports = { obtenerEmbarcaciones, crearEmbarcacion, validarEmbarcacion };