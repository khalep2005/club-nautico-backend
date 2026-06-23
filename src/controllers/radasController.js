const pool = require('../config/db');

// 1. Obtener todas las radas con el nombre de la embarcación si la hay
const obtenerRadas = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id_rada as id, 
                r.codigo, 
                r.estado, 
                e.nombre_nave as embarcacion
            FROM radas r
            LEFT JOIN embarcaciones e ON r.id_embarcacion = e.id_embarcacion
            ORDER BY r.codigo ASC
        `;
        const resultado = await pool.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener radas:', error);
        res.status(500).json({ mensaje: 'Error al cargar el mapa de radas.' });
    }
};

// 2. Asignar una embarcación a una rada
const asignarRada = async (req, res) => {
    const { id } = req.params; // ID de la rada
    const { id_embarcacion } = req.body;

    try {
        // REGLA DE NEGOCIO: Validar que la embarcación esté registrada y validada por Capitanía
        const checkEmb = await pool.query("SELECT estado_capitania FROM embarcaciones WHERE id_embarcacion = $1", [id_embarcacion]);
        if (checkEmb.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Embarcación no encontrada.' });
        }
        if (checkEmb.rows[0].estado_capitania !== 'Validado') {
            return res.status(400).json({ mensaje: 'No se puede asignar una rada a una embarcación que no ha sido validada por la Dirección de Capitanías.' });
        }

        const query = `
            UPDATE radas 
            SET id_embarcacion = $1, estado = 'Ocupado' 
            WHERE id_rada = $2 
            RETURNING *
        `;
        const resultado = await pool.query(query, [id_embarcacion, id]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Rada no encontrada.' });
        }
        res.status(200).json({ mensaje: 'Rada asignada con éxito.' });
    } catch (error) {
        console.error('Error al asignar rada:', error);
        res.status(500).json({ mensaje: 'Error interno al asignar la rada.' });
    }
};

// 3. Liberar una rada (Quitar la embarcación)
const liberarRada = async (req, res) => {
    const { id } = req.params; // ID de la rada

    try {
        const query = `
            UPDATE radas 
            SET id_embarcacion = NULL, estado = 'Disponible' 
            WHERE id_rada = $1 
            RETURNING *
        `;
        const resultado = await pool.query(query, [id]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Rada no encontrada.' });
        }
        res.status(200).json({ mensaje: 'Rada liberada con éxito.' });
    } catch (error) {
        console.error('Error al liberar rada:', error);
        res.status(500).json({ mensaje: 'Error interno al liberar la rada.' });
    }
};

module.exports = { obtenerRadas, asignarRada, liberarRada };