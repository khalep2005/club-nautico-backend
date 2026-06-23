const pool = require('../config/db'); 

// Función para CREAR solicitud e inscribir socio (Transacción)
const crearSolicitud = async (req, res) => {
    // 1. Ahora recibimos la clasificación y el tipo de documento desde el Frontend
    const { id_tipo_doc, dni, nombres, apellidos, telefono, correo, tipo_solicitud, clasificacion } = req.body;

    // Validación más precisa: requerimos id_tipo_doc y el número (dni)
    if (!id_tipo_doc || !dni || !nombres || !apellidos || !clasificacion) {
        return res.status(400).json({ mensaje: 'El tipo y número de documento, nombres, apellidos y clasificación son obligatorios.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // REGLA DE NEGOCIO: La política es aceptar solo a socios del tipo "pagador"
        const clasifNormalizada = clasificacion ? clasificacion.trim().toLowerCase() : '';
        if (!clasifNormalizada.includes('pagador')) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                mensaje: 'Rechazado por política de riesgo: El club solo acepta socios con clasificación de tipo Pagador.' 
            });
        }

        // 2. REGLA DE NEGOCIO: Evitar doble inscripción verificando el número de documento
        const checkDuplicado = await client.query('SELECT id_socio, estado_membresia FROM socios WHERE dni = $1', [dni]);
        
        let nuevoIdSocio;
        if (checkDuplicado.rows.length > 0) {
            const socioExistente = checkDuplicado.rows[0];
            
            // Si el socio existente está en estado 'Rechazado', permitimos que vuelva a enviar su solicitud (subsanar)
            if (socioExistente.estado_membresia === 'Rechazado') {
                const updateSocioQuery = `
                    UPDATE socios 
                    SET id_tipo_doc = $1, nombres = $2, apellidos = $3, telefono = $4, correo = $5, estado_membresia = 'Pendiente', clasificacion = $6
                    WHERE id_socio = $7
                `;
                await client.query(updateSocioQuery, [id_tipo_doc || 1, nombres, apellidos, telefono || '', correo || '', clasificacion, socioExistente.id_socio]);
                nuevoIdSocio = socioExistente.id_socio;
            } else {
                await client.query('ROLLBACK'); // Cancelamos la operación
                return res.status(400).json({ 
                    mensaje: 'Rechazado: El número de documento ingresado ya tiene una inscripción activa o pendiente registrada en el Club.' 
                });
            }
        } else {
            // 3. Insertar en la tabla SOCIOS incluyendo la CLASIFICACIÓN
            const insertSocioQuery = `
                INSERT INTO socios (id_tipo_doc, dni, nombres, apellidos, telefono, correo, estado_membresia, clasificacion) 
                VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7) 
                RETURNING id_socio
            `;
            const valoresSocio = [id_tipo_doc || 1, dni, nombres, apellidos, telefono || '', correo || '', clasificacion];
            const resSocio = await client.query(insertSocioQuery, valoresSocio);
            nuevoIdSocio = resSocio.rows[0].id_socio;
        }

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

// Función para LISTAR solicitudes
const obtenerSolicitudes = async (req, res) => {
    try {
        const query = `
            SELECT 
                sol.id_solicitud, 
                sol.tipo_solicitud, 
                sol.estado, 
                sol.fecha_creacion,
                sol.observacion,
                soc.dni, 
                soc.nombres, 
                soc.apellidos,
                soc.clasificacion,
                td.siglas AS tipo_doc_siglas
            FROM solicitudes sol
            INNER JOIN socios soc ON sol.id_socio = soc.id_socio
            LEFT JOIN tipos_documento td ON soc.id_tipo_doc = td.id_tipo_doc
            ORDER BY sol.fecha_creacion DESC
        `;
        const resultado = await pool.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ mensaje: 'Error al cargar la lista de solicitudes.' });
    }
};

// Función para EVALUAR una solicitud (Aprobar o Rechazar)
const evaluarSolicitud = async (req, res) => {
    const { id } = req.params; // ID de la solicitud
    const { estado_nuevo, observacion } = req.body; 
    
    const id_revisor = req.usuario.id_usuario; 

    if (estado_nuevo !== 'Aprobado' && estado_nuevo !== 'Rechazado') {
        return res.status(400).json({ mensaje: 'El estado debe ser Aprobado o Rechazado.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Obtener la solicitud para verificar su tipo e id_socio
        const solQuery = await client.query("SELECT id_socio, tipo_solicitud FROM solicitudes WHERE id_solicitud = $1", [id]);
        if (solQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Solicitud no encontrada.' });
        }
        
        const { id_socio, tipo_solicitud } = solQuery.rows[0];

        // REGLA DE NEGOCIO: Si es una solicitud de Retiro y se aprueba, generar liquidación administrativa y validar deudas
        if (estado_nuevo === 'Aprobado' && tipo_solicitud === 'Retiro') {
            const deudasQuery = await client.query(
                "SELECT COALESCE(SUM(monto_total), 0) AS total_pendiente FROM facturacion WHERE id_socio = $1 AND estado_pago != 'Pagada'",
                [id_socio]
            );
            const totalDeuda = parseFloat(deudasQuery.rows[0].total_pendiente);
            if (totalDeuda > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    mensaje: `No se puede aprobar el retiro. El socio mantiene una Liquidación Administrativa pendiente de S/ ${totalDeuda.toFixed(2)}. Debe cancelar todos sus saldos antes de proceder con la baja.` 
                });
            }
        }

        // 2. Actualizar la tabla SOLICITUDES
        const updateSolicitudQuery = `
            UPDATE solicitudes 
            SET estado = $1, observacion = $2, id_usuario_revisor = $3, fecha_resolucion = NOW()
            WHERE id_solicitud = $4
        `;
        await client.query(updateSolicitudQuery, [estado_nuevo, observacion || null, id_revisor, id]);

        // 3. Actualizar la tabla SOCIOS
        // Si aprueba una inscripción, el socio pasa a estar 'Al día'. Si se aprueba un retiro, pasa a 'Retirado'.
        // Si se rechaza, pasa a 'Rechazado'.
        let estadoSocio = 'Rechazado';
        if (estado_nuevo === 'Aprobado') {
            estadoSocio = tipo_solicitud === 'Retiro' ? 'Retirado' : 'Al día';
        }
        
        const updateSocioQuery = `
            UPDATE socios 
            SET estado_membresia = $1
            WHERE id_socio = $2
        `;
        await client.query(updateSocioQuery, [estadoSocio, id_socio]);

        await client.query('COMMIT');

        res.status(200).json({ mensaje: `Solicitud ${estado_nuevo.toLowerCase()} con éxito.` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al evaluar solicitud:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar la evaluación.' });
    } finally {
        client.release();
    }
};

module.exports = {
    crearSolicitud,
    obtenerSolicitudes,
    evaluarSolicitud
};