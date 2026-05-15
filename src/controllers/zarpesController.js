const pool = require('../config/db');

// 1. Listar zarpes con los nombres de todas las entidades (INNER JOIN múltiple)
const obtenerZarpes = async (req, res) => {
    try {
        const query = `
            SELECT 
                z.id_zarpe, z.fecha_salida, z.hora_salida, z.fecha_retorno, z.hora_retorno, 
                z.destino, z.pasajeros, z.estado,
                s.nombres AS socio_nombres, s.apellidos AS socio_apellidos,
                e.nombre_nave AS embarcacion,
                t.nombres AS tripulante_nombres, t.apellidos AS tripulante_apellidos
            FROM zarpes z
            INNER JOIN socios s ON z.id_socio = s.id_socio
            INNER JOIN embarcaciones e ON z.id_embarcacion = e.id_embarcacion
            INNER JOIN tripulantes t ON z.id_tripulante = t.id_tripulante
            ORDER BY z.fecha_salida DESC, z.hora_salida DESC
        `;
        const resultado = await pool.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener zarpes:', error);
        res.status(500).json({ mensaje: 'Error al cargar el historial de zarpes.' });
    }
};

// 2. Crear un nuevo Permiso de Zarpe
const crearZarpe = async (req, res) => {
    const { id_socio, id_embarcacion, id_tripulante, fecha_salida, hora_salida, fecha_retorno, hora_retorno, destino, pasajeros } = req.body;

    try {
        const query = `
            INSERT INTO zarpes (id_socio, id_embarcacion, id_tripulante, fecha_salida, hora_salida, fecha_retorno, hora_retorno, destino, pasajeros, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pendiente')
            RETURNING *
        `;
        const values = [id_socio, id_embarcacion, id_tripulante, fecha_salida, hora_salida, fecha_retorno, hora_retorno, destino, pasajeros || null];
        const resultado = await pool.query(query, values);

        res.status(201).json({ mensaje: 'Solicitud de zarpe registrada con éxito.', zarpe: resultado.rows[0] });
    } catch (error) {
        console.error('Error al registrar zarpe:', error);
        res.status(500).json({ mensaje: 'Error interno al registrar el permiso de salida.' });
    }
};

// 3. Aprobar el Zarpe (Cambiar estado)
const aprobarZarpe = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            UPDATE zarpes 
            SET estado = 'Aprobado' 
            WHERE id_zarpe = $1 
            RETURNING *
        `;
        const resultado = await pool.query(query, [id]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Zarpe no encontrado.' });
        }
        res.status(200).json({ mensaje: 'Permiso de zarpe aprobado por la Autoridad Marítima.' });
    } catch (error) {
        console.error('Error al aprobar zarpe:', error);
        res.status(500).json({ mensaje: 'Error interno al aprobar el zarpe.' });
    }
};

module.exports = { obtenerZarpes, crearZarpe, aprobarZarpe };