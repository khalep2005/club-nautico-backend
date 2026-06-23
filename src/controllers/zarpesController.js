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
    const { 
        id_socio, 
        id_embarcacion, 
        id_tripulante, 
        fecha_salida, 
        hora_salida, 
        fecha_retorno, 
        hora_retorno, 
        destino, 
        pasajeros // Viene como un Array de objetos: [{nombre: '...', documento: '...'}, ...]
    } = req.body;

    try {
        // REGLA DE NEGOCIO: Verificar que el socio esté registrado y no sea Moroso
        const checkSocio = await pool.query("SELECT estado_membresia FROM socios WHERE id_socio = $1", [id_socio]);
        if (checkSocio.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Socio no encontrado.' });
        }
        if (checkSocio.rows[0].estado_membresia === 'Moroso') {
            return res.status(403).json({ mensaje: 'Zarpe Bloqueado: El socio mantiene deudas de membresía o facturas vencidas pendientes de pago.' });
        }

        // REGLA DE NEGOCIO: Verificar que la embarcación esté validada por Capitanía
        const checkEmb = await pool.query("SELECT estado_capitania FROM embarcaciones WHERE id_embarcacion = $1", [id_embarcacion]);
        if (checkEmb.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Embarcación no encontrada.' });
        }
        if (checkEmb.rows[0].estado_capitania !== 'Validado') {
            return res.status(400).json({ mensaje: 'Zarpe Bloqueado: La embarcación seleccionada no tiene validación vigente de Capitanía de Puerto.' });
        }

        // REGLA DE NEGOCIO: Verificar que la tripulación esté registrada y autorizada
        const checkTrip = await pool.query("SELECT estado FROM tripulantes WHERE id_tripulante = $1", [id_tripulante]);
        if (checkTrip.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Tripulante no encontrado.' });
        }
        if (checkTrip.rows[0].estado !== 'Autorizado') {
            return res.status(400).json({ mensaje: 'Zarpe Bloqueado: La tripulación seleccionada no cuenta con autorización marítima vigente.' });
        }

        const query = `
            INSERT INTO zarpes (id_socio, id_embarcacion, id_tripulante, fecha_salida, hora_salida, fecha_retorno, hora_retorno, destino, pasajeros, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pendiente')
            RETURNING *
        `;
        
        const pasajerosJSON = JSON.stringify(pasajeros || []);

        const values = [
            id_socio, 
            id_embarcacion, 
            id_tripulante, 
            fecha_salida, 
            hora_salida, 
            fecha_retorno, 
            hora_retorno, 
            destino, 
            pasajerosJSON // Insertamos el string JSON estructurado
        ];
        
        const resultado = await pool.query(query, values);

        res.status(201).json({ 
            mensaje: 'Solicitud de zarpe registrada con éxito.', 
            zarpe: resultado.rows[0] 
        });
    } catch (error) {
        console.error('Error al registrar zarpe:', error);
        res.status(500).json({ mensaje: 'Error interno al registrar el permiso de salida.' });
    }
};

// 3. Aprobar el Zarpe (Cambiar estado)
const aprobarZarpe = async (req, res) => {
    const { id } = req.params;

    try {
        // Consultar el zarpe primero para validar socio, embarcación y tripulación al aprobar
        const checkZarpeQuery = await pool.query("SELECT id_socio, id_embarcacion, id_tripulante FROM zarpes WHERE id_zarpe = $1", [id]);
        if (checkZarpeQuery.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Zarpe no encontrado.' });
        }

        const { id_socio, id_embarcacion, id_tripulante } = checkZarpeQuery.rows[0];

        // Validar socio
        const checkSocio = await pool.query("SELECT estado_membresia FROM socios WHERE id_socio = $1", [id_socio]);
        if (checkSocio.rows[0].estado_membresia === 'Moroso') {
            return res.status(403).json({ mensaje: 'Aprobación Denegada: El socio mantiene deudas de membresía o facturas vencidas.' });
        }

        // Validar embarcación
        const checkEmb = await pool.query("SELECT estado_capitania FROM embarcaciones WHERE id_embarcacion = $1", [id_embarcacion]);
        if (checkEmb.rows[0].estado_capitania !== 'Validado') {
            return res.status(400).json({ mensaje: 'Aprobación Denegada: La embarcación no cuenta con validación vigente de Capitanía.' });
        }

        // Validar tripulación
        const checkTrip = await pool.query("SELECT estado FROM tripulantes WHERE id_tripulante = $1", [id_tripulante]);
        if (checkTrip.rows[0].estado !== 'Autorizado') {
            return res.status(400).json({ mensaje: 'Aprobación Denegada: La tripulación no cuenta con autorización marítima vigente.' });
        }

        const query = `
            UPDATE zarpes 
            SET estado = 'Aprobado' 
            WHERE id_zarpe = $1 
            RETURNING *
        `;
        const resultado = await pool.query(query, [id]);
        
        res.status(200).json({ mensaje: 'Permiso de zarpe aprobado por la Autoridad Marítima.' });
    } catch (error) {
        console.error('Error al aprobar zarpe:', error);
        res.status(500).json({ mensaje: 'Error interno al aprobar el zarpe.' });
    }
};

// 4. Obtener el detalle completo de un Zarpe para impresión
const obtenerZarpePorId = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                z.id_zarpe, z.fecha_salida, z.hora_salida, z.fecha_retorno, z.hora_retorno, z.destino, z.pasajeros, z.estado,
                s.nombres AS socio_nombres, s.apellidos AS socio_apellidos,
                e.nombre_nave, e.matricula, e.tipo, e.eslora,
                t.nombres AS tripulante_nombres, t.apellidos AS tripulante_apellidos, t.licencia, t.rol
            FROM zarpes z
            INNER JOIN socios s ON z.id_socio = s.id_socio
            INNER JOIN embarcaciones e ON z.id_embarcacion = e.id_embarcacion
            INNER JOIN tripulantes t ON z.id_tripulante = t.id_tripulante
            WHERE z.id_zarpe = $1
        `;
        const resultado = await pool.query(query, [id]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Zarpe no encontrado.' });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al obtener detalle del zarpe:', error);
        res.status(500).json({ mensaje: 'Error al generar los datos del documento.' });
    }
};

module.exports = { obtenerZarpes, crearZarpe, aprobarZarpe, obtenerZarpePorId };