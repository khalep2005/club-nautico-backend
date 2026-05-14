const pool = require('../config/db'); 

// Función para CREAR solicitud e inscribir socio (Transacción)
const crearSolicitud = async (req, res) => {
    // 1. Ahora recibimos la clasificación desde el Frontend
    const { id_tipo_doc, dni, nombres, apellidos, telefono, tipo_solicitud, clasificacion } = req.body;

    if (!dni || !nombres || !apellidos || !clasificacion) {
        return res.status(400).json({ mensaje: 'DNI, nombres, apellidos y clasificación son obligatorios.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 2. REGLA DE NEGOCIO: Evitar doble inscripción verificando el DNI
        const checkDuplicado = await client.query('SELECT id_socio FROM socios WHERE dni = $1', [dni]);
        
        if (checkDuplicado.rows.length > 0) {
            await client.query('ROLLBACK'); // Cancelamos la operación
            return res.status(400).json({ mensaje: 'Rechazado: Este postulante (DNI) ya tiene una inscripción registrada en el Club.' });
        }

        // 3. Insertar en la tabla SOCIOS incluyendo la CLASIFICACIÓN
        const insertSocioQuery = `
            INSERT INTO socios (id_tipo_doc, dni, nombres, apellidos, telefono, estado_membresia, clasificacion) 
            VALUES ($1, $2, $3, $4, $5, 'Pendiente', $6) 
            RETURNING id_socio
        `;
        const valoresSocio = [id_tipo_doc || 1, dni, nombres, apellidos, telefono || '', clasificacion];
        const resSocio = await client.query(insertSocioQuery, valoresSocio);
        
        const nuevoIdSocio = resSocio.rows[0].id_socio;

        // 4. Insertar en la tabla SOLICITUDES
        const insertSolicitudQuery = `
            INSERT INTO solicitudes (id_socio, tipo_solicitud, estado) 
            VALUES ($1, $2, 'Pendiente') 
            RETURNING *
        `;
        const valoresSolicitud = [nuevoIdSocio, tipo_solicitud || 'Inscripción'];
        const resSolicitud = await client.query(insertSolicitudQuery, valoresSolicitud);

        await client.query('COMMIT'); 

        res.status(201).json({ 
            mensaje: 'Solicitud creada con éxito y enviada a Jefatura.',
            solicitud: resSolicitud.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error('Error en la transacción:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar la inscripción.' });
    } finally {
        client.release(); 
    }
};

// Función para LISTAR solicitudes (Con INNER JOIN a la tabla socios)
const obtenerSolicitudes = async (req, res) => {
    try {
        const query = `
            SELECT 
                sol.id_solicitud, 
                sol.tipo_solicitud, 
                sol.estado, 
                sol.fecha_creacion,
                soc.dni, 
                soc.nombres, 
                soc.apellidos
            FROM solicitudes sol
            INNER JOIN socios soc ON sol.id_socio = soc.id_socio
            ORDER BY sol.fecha_creacion DESC
        `;
        const resultado = await pool.query(query);
        
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ mensaje: 'Error al cargar la lista de solicitudes.' });
    }
};

module.exports = {
    crearSolicitud,
    obtenerSolicitudes
};