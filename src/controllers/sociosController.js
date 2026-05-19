const pool = require('../config/db');

// Función para LISTAR todos los socios OFICIALES (Excluye pendientes y rechazados)
const obtenerSocios = async (req, res) => {
    try {
        const query = `
            SELECT 
                soc.id_socio, 
                soc.nombres, 
                soc.apellidos, 
                soc.dni, 
                soc.clasificacion, 
                soc.estado_membresia, 
                soc.fecha_ingreso,
                td.siglas AS tipo_doc_siglas
            FROM socios soc
            LEFT JOIN tipos_documento td ON soc.id_tipo_doc = td.id_tipo_doc
            WHERE soc.estado_membresia != 'Pendiente' AND soc.estado_membresia != 'Rechazado'
            ORDER BY soc.fecha_ingreso DESC
        `;
        const resultado = await pool.query(query);
        
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener socios:', error);
        res.status(500).json({ mensaje: 'Error al cargar la lista de socios.' });
    }
};

module.exports = {
    obtenerSocios
};