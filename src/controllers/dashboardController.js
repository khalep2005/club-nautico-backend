const pool = require('../config/db');

// ------------------------------------------------------------------
// 1. Dashboard de Secretaría
// ------------------------------------------------------------------
const obtenerMetricasSecretaria = async (req, res) => {
    try {
        const queryEspera = "SELECT COUNT(*) FROM solicitudes WHERE estado = 'Pendiente'";
        const resEspera = await pool.query(queryEspera);

        const queryActivos = "SELECT COUNT(*) FROM socios WHERE estado_membresia != 'Pendiente' AND estado_membresia != 'Rechazado'";
        const resActivos = await pool.query(queryActivos);

        const queryAlertas = "SELECT COUNT(*) FROM socios WHERE estado_membresia = 'Moroso'";
        const resAlertas = await pool.query(queryAlertas);

        res.status(200).json({
            solicitudesEnEspera: parseInt(resEspera.rows[0].count),
            sociosActivos: parseInt(resActivos.rows[0].count),
            alertas: parseInt(resAlertas.rows[0].count)
        });
    } catch (error) {
        console.error('Error al obtener métricas:', error);
        res.status(500).json({ mensaje: 'Error al cargar las métricas del dashboard.' });
    }
};

// ------------------------------------------------------------------
// 2. Dashboard de Gestión de Flota (Naviero)
// ------------------------------------------------------------------
const obtenerDashboardNaviero = async (req, res) => {
    try {
        const [totalEmbarcaciones, totalZarpes, pendientesValidacion, ultimosZarpes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM embarcaciones'),
            pool.query('SELECT COUNT(*) FROM zarpes'),
            pool.query("SELECT COUNT(*) FROM embarcaciones WHERE estado_capitania = 'Pendiente'"),
            pool.query(`
                SELECT 
                    z.id_zarpe, e.nombre_nave as embarcacion, 
                    s.nombres, s.apellidos,
                    z.destino, z.fecha_salida, z.hora_salida, z.hora_retorno, z.estado
                FROM zarpes z
                INNER JOIN embarcaciones e ON z.id_embarcacion = e.id_embarcacion
                INNER JOIN socios s ON z.id_socio = s.id_socio
                ORDER BY z.fecha_salida DESC, z.hora_salida DESC
                LIMIT 5
            `)
        ]);

        res.status(200).json({
            kpis: {
                embarcaciones: parseInt(totalEmbarcaciones.rows[0].count),
                zarpes: parseInt(totalZarpes.rows[0].count),
                validaciones_pendientes: parseInt(pendientesValidacion.rows[0].count)
            },
            ultimosZarpes: ultimosZarpes.rows.map(z => ({
                ...z,
                socio: `${z.nombres} ${z.apellidos}`
            }))
        });
    } catch (error) {
        console.error('Error al cargar el dashboard naviero:', error);
        res.status(500).json({ mensaje: 'Error al cargar los datos del dashboard.' });
    }
};

// Exportamos ambas funciones
module.exports = {
    obtenerMetricasSecretaria,
    obtenerDashboardNaviero
};