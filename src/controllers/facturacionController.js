const pool = require('../config/db');

// Función para LISTAR los consumos pendientes de facturación, agrupados por socio.
// Usado por el panel de Finanzas (Estados de Cuenta / Generar Facturación Mensual).
// Consolida todos los registros que Secretaría guardó en la tabla "consumos"
// con estado = 'Pendiente de Facturación', agrupados por socio.
const obtenerConsumosPendientes = async (req, res) => {
    try {
        // 1. Traer todos los consumos pendientes, con datos básicos del socio
        const query = `
            SELECT 
                c.id_consumo,
                c.servicio,
                c.monto,
                c.descripcion,
                c.fecha_consumo,
                soc.id_socio,
                soc.dni,
                soc.nombres,
                soc.apellidos,
                td.siglas AS tipo_doc_siglas
            FROM consumos c
            INNER JOIN socios soc ON c.id_socio = soc.id_socio
            LEFT JOIN tipos_documento td ON soc.id_tipo_doc = td.id_tipo_doc
            WHERE c.estado = 'Pendiente de Facturación'
            ORDER BY soc.apellidos ASC, c.fecha_consumo ASC
        `;
        const resultado = await pool.query(query);

        // 2. Agrupar en memoria por id_socio
        const agrupado = {};
        for (const fila of resultado.rows) {
            const key = fila.id_socio;
            if (!agrupado[key]) {
                agrupado[key] = {
                    id_socio: fila.id_socio,
                    dni: fila.dni,
                    tipo_doc_siglas: fila.tipo_doc_siglas,
                    nombres: fila.nombres,
                    apellidos: fila.apellidos,
                    total_consumos: 0,
                    consumos: [],
                };
            }
            agrupado[key].total_consumos += Number(fila.monto);
            agrupado[key].consumos.push({
                id_consumo: fila.id_consumo,
                servicio: fila.servicio,
                monto: Number(fila.monto),
                descripcion: fila.descripcion,
                fecha_consumo: fila.fecha_consumo,
            });
        }

        // 3. Redondear el total a 2 decimales y devolver como array
        const listaFinal = Object.values(agrupado).map((socio) => ({
            ...socio,
            total_consumos: Number(socio.total_consumos.toFixed(2)),
        }));

        res.status(200).json(listaFinal);
    } catch (error) {
        console.error('Error al obtener consumos pendientes:', error);
        res.status(500).json({ mensaje: 'Error al cargar los consumos pendientes de facturación.' });
    }
};

module.exports = {
    obtenerConsumosPendientes
};
