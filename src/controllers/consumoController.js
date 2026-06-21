const pool = require('../config/db');

// Función para LISTAR los precios preestablecidos de cada servicio
const obtenerPreciosServicios = async (req, res) => {
    try {
        const query = `
            SELECT servicio, monto 
            FROM tarifas_servicios 
            WHERE activo = true
            ORDER BY servicio ASC
        `;
        const resultado = await pool.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener precios de servicios:', error);
        res.status(500).json({ mensaje: 'Error al cargar las tarifas de servicios.' });
    }
};

// Función para REGISTRAR un consumo de servicio a un socio (Secretaría)
const crearConsumo = async (req, res) => {
    const { tipo_doc, dni_socio, servicio, monto, descripcion } = req.body;

    // Validación de campos obligatorios
    if (!tipo_doc || !dni_socio || !servicio || monto === undefined || monto === null) {
        return res.status(400).json({ mensaje: 'El tipo de documento, número, servicio y monto son obligatorios.' });
    }

    if (isNaN(monto) || Number(monto) <= 0) {
        return res.status(400).json({ mensaje: 'El monto debe ser un número válido mayor a cero.' });
    }

    const id_usuario_registro = req.usuario.id_usuario;

    try {
        // 1. Buscar al socio por tipo y número de documento (mismo patrón que sociosController)
        const buscarSocioQuery = `
            SELECT soc.id_socio, soc.estado_membresia
            FROM socios soc
            LEFT JOIN tipos_documento td ON soc.id_tipo_doc = td.id_tipo_doc
            WHERE td.siglas = $1 AND soc.dni = $2
        `;
        const resSocio = await pool.query(buscarSocioQuery, [tipo_doc, dni_socio]);

        if (resSocio.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No se encontró un socio con ese documento.' });
        }

        const socio = resSocio.rows[0];

        // 2. Validar que el socio esté activo (no Pendiente ni Rechazado)
        if (socio.estado_membresia === 'Pendiente' || socio.estado_membresia === 'Rechazado') {
            return res.status(403).json({ mensaje: 'Este documento no corresponde a un socio activo del Club.' });
        }

        // 3. Insertar el consumo con estado inicial "Pendiente de Facturación"
        const insertConsumoQuery = `
            INSERT INTO consumos (id_socio, servicio, monto, descripcion, id_usuario_registro)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const valores = [
            socio.id_socio,
            servicio,
            Number(monto),
            descripcion || `Cargo por servicio de ${servicio}`,
            id_usuario_registro
        ];
        const resConsumo = await pool.query(insertConsumoQuery, valores);

        res.status(201).json({
            mensaje: 'Servicio registrado con éxito. Queda pendiente de facturación.',
            consumo: resConsumo.rows[0]
        });

    } catch (error) {
        console.error('Error al registrar consumo:', error);
        res.status(500).json({ mensaje: 'Error interno al registrar el servicio.' });
    }
};

module.exports = {
    obtenerPreciosServicios,
    crearConsumo
};
