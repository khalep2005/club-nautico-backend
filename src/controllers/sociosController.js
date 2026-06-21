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

// Función para BUSCAR un socio por tipo y número de documento (usado en Registrar Servicio)
const buscarSocioPorDocumento = async (req, res) => {
    const { tipo_doc, numero } = req.query;
 
    if (!tipo_doc || !numero) {
        return res.status(400).json({ mensaje: 'El tipo y número de documento son obligatorios.' });
    }
 
    try {
        const query = `
            SELECT 
                soc.id_socio, 
                soc.nombres, 
                soc.apellidos, 
                soc.dni, 
                soc.clasificacion, 
                soc.estado_membresia,
                td.siglas AS tipo_doc_siglas
            FROM socios soc
            LEFT JOIN tipos_documento td ON soc.id_tipo_doc = td.id_tipo_doc
            WHERE td.siglas = $1 AND soc.dni = $2
        `;
        const resultado = await pool.query(query, [tipo_doc, numero]);
 
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No se encontró un socio con ese documento.' });
        }
 
        const socio = resultado.rows[0];
 
        if (socio.estado_membresia === 'Pendiente' || socio.estado_membresia === 'Rechazado') {
            return res.status(403).json({ mensaje: 'Este documento no corresponde a un socio activo del Club.' });
        }
 
        res.status(200).json(socio);
    } catch (error) {
        console.error('Error al buscar socio:', error);
        res.status(500).json({ mensaje: 'Error al buscar el socio.' });
    }
};
 
module.exports = {
    obtenerSocios,
    buscarSocioPorDocumento
};
 