const pool = require('../config/db');

// Función para LISTAR los consumos pendientes de facturación, agrupados por socio.
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

// Función para GENERAR la facturación mensual (Finanzas).
const generarFacturacionMensual = async (req, res) => {
    const id_usuario_emisor = req.usuario.id_usuario;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Traer consumos pendientes agrupados por socio
        const consumosQuery = `
            SELECT id_consumo, id_socio, monto
            FROM consumos
            WHERE estado = 'Pendiente de Facturación'
        `;
        const resConsumos = await client.query(consumosQuery);

        if (resConsumos.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(200).json({ mensaje: 'No hay consumos pendientes para facturar.', facturas_generadas: 0 });
        }

        // 2. Agrupar montos por socio
        const totalesPorSocio = {};
        const idsConsumosPorSocio = {};
        for (const fila of resConsumos.rows) {
            const key = fila.id_socio;
            totalesPorSocio[key] = (totalesPorSocio[key] || 0) + Number(fila.monto);
            if (!idsConsumosPorSocio[key]) idsConsumosPorSocio[key] = [];
            idsConsumosPorSocio[key].push(fila.id_consumo);
        }

        // 3. Calcular fecha de vencimiento: 15 días desde hoy
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);

        let facturasGeneradas = 0;
        for (const id_socio of Object.keys(totalesPorSocio)) {
            const montoTotal = Number(totalesPorSocio[id_socio].toFixed(2));

            // 4. Insertar una factura por cada socio (Nota: id_factura_padre es null por defecto)
            const insertFacturaQuery = `
                INSERT INTO facturacion (id_socio, concepto, monto_base, monto_total, fecha_emision, fecha_vencimiento, estado_pago, id_usuario_emisor)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id_factura
            `;
            const facturaResult = await client.query(insertFacturaQuery, [
                id_socio,
                'Consumos del mes',
                montoTotal,
                montoTotal,
                new Date().toISOString().split('T')[0],
                fechaVencimiento.toISOString().split('T')[0],
                'Pendiente', // Estado inicial
                id_usuario_emisor,
            ]);

            const idNuevaFactura = facturaResult.rows[0].id_factura;

            // 5. Marcar consumos como "Facturado" Y ASIGNARLES EL ID DE FACTURA
            const idsConsumos = idsConsumosPorSocio[id_socio];
            await client.query(
                `UPDATE consumos SET estado = 'Facturado', id_factura = $2 WHERE id_consumo = ANY($1::int[])`,
                [idsConsumos, idNuevaFactura]
            );

            facturasGeneradas++;
        }

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: `Facturación mensual generada con éxito.`,
            facturas_generadas: facturasGeneradas,
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al generar facturación mensual:', error);
        res.status(500).json({ mensaje: 'Error interno al generar la facturación mensual.' });
    } finally {
        client.release();
    }
};

// Función para LISTAR socios morosos (facturas vencidas y no pagadas).
// Usado por el panel de Cobranzas (Gestionar Morosidad).
const obtenerFacturasMorosas = async (req, res) => {
    try {
        const query = `
            SELECT 
                f.id_factura,
                f.id_socio,
                f.concepto,
                f.monto_base,
                f.monto_total,
                f.fecha_emision,
                f.fecha_vencimiento,
                f.estado_pago,
                soc.dni,
                soc.nombres,
                soc.apellidos,
                td.siglas AS tipo_doc_siglas
            FROM facturacion f
            INNER JOIN socios soc ON f.id_socio = soc.id_socio
            LEFT JOIN tipos_documento td ON soc.id_tipo_doc = td.id_tipo_doc
            WHERE f.estado_pago NOT IN ('Pagada', 'Fraccionada') 
              AND f.fecha_vencimiento < CURRENT_DATE
              AND f.id_factura_padre IS NULL /* <--- ESTA ES LA MAGIA */
            ORDER BY f.fecha_vencimiento ASC
        `;
        const resultado = await pool.query(query);

        const facturas = resultado.rows.map((f) => {
            const diasMora = Math.max(
                0,
                Math.floor((new Date() - new Date(f.fecha_vencimiento)) / (1000 * 60 * 60 * 24))
            );
            return {
                ...f,
                monto_base: Number(f.monto_base),
                monto_total: Number(f.monto_total),
                dias_mora: diasMora,
            };
        });

        res.status(200).json(facturas);
    } catch (error) {
        console.error('Error al obtener facturas morosas:', error);
        res.status(500).json({ mensaje: 'Error al cargar las facturas morosas.' });
    }
};  

// Función para FRACCIONAR una deuda en múltiples cuotas.
// Toma una factura pendiente, la marca como "Fraccionada", y crea N nuevas facturas hijas.
const fraccionarDeuda = async (req, res) => {
    const { id_factura, cuotas } = req.body;
    const id_usuario_emisor = req.usuario.id_usuario;
    
    if (!id_factura || !cuotas || cuotas < 2 || cuotas > 6) {
        return res.status(400).json({ mensaje: 'Se requiere un ID de factura válido y un número de cuotas entre 2 y 6.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Obtener la factura original
        const facturaQuery = `SELECT * FROM facturacion WHERE id_factura = $1 AND estado_pago != 'Pagada' AND estado_pago != 'Fraccionada'`;
        const resultFactura = await client.query(facturaQuery, [id_factura]);

        if (resultFactura.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Factura no encontrada o ya procesada.' });
        }

        const facturaOriginal = resultFactura.rows[0];
        const montoPorCuota = Number((facturaOriginal.monto_total / cuotas).toFixed(2));

        // 2. Marcar la original como Fraccionada
        await client.query(`UPDATE facturacion SET estado_pago = 'Fraccionada' WHERE id_factura = $1`, [id_factura]);

        // 3. Generar las N cuotas hijas
        const insertCuotaQuery = `
            INSERT INTO facturacion (id_socio, concepto, monto_base, monto_total, fecha_emision, fecha_vencimiento, estado_pago, id_usuario_emisor, id_factura_padre, numero_cuota)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        for (let i = 1; i <= cuotas; i++) {
            // Cada cuota vence un mes después de la anterior
            const fechaVencimiento = new Date(facturaOriginal.fecha_emision);
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);

            await client.query(insertCuotaQuery, [
                facturaOriginal.id_socio,
                `Fraccionamiento - Cuota ${i}/${cuotas}`,
                montoPorCuota,
                montoPorCuota,
                new Date().toISOString().split('T')[0],
                fechaVencimiento.toISOString().split('T')[0],
                'Pendiente',
                id_usuario_emisor,
                id_factura, // Referencia recursiva
                i // Número de cuota
            ]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: `Deuda fraccionada exitosamente en ${cuotas} cuotas.`,
            cuotas_generadas: cuotas,
            monto_por_cuota: montoPorCuota
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al fraccionar deuda:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar el fraccionamiento.' });
    } finally {
        client.release();
    }
};

const obtenerEstadosCuentaGeneral = async (req, res) => {
    try {
        const query = `
            SELECT 
                s.id_socio,
                s.nombres,
                s.apellidos,
                COALESCE(SUM(f.monto_total), 0) AS total_deuda,
                COALESCE(SUM(CASE WHEN f.fecha_vencimiento < CURRENT_DATE THEN 1 ELSE 0 END), 0) AS facturas_vencidas,
                COALESCE(SUM(CASE WHEN f.id_factura_padre IS NOT NULL THEN 1 ELSE 0 END), 0) AS cuotas_fraccionadas
            FROM socios s
            LEFT JOIN facturacion f ON s.id_socio = f.id_socio AND f.estado_pago NOT IN ('Pagada', 'Fraccionada')
            GROUP BY s.id_socio, s.nombres, s.apellidos
            ORDER BY total_deuda DESC;
        `;
        const resultado = await pool.query(query);

        const estados = resultado.rows.map(row => {
            let estadoFinanciero = 'Al día';
            
            if (row.total_deuda > 0) {
                if (row.facturas_vencidas > 0) {
                    estadoFinanciero = 'Moroso'; // El castigo máximo gana si hay alguna vencida
                } else if (row.cuotas_fraccionadas > 0) {
                    estadoFinanciero = 'Fraccionado'; // Si no debe atrasos y tiene cuotas
                } else {
                    estadoFinanciero = 'Pendiente'; // Factura normal a tiempo
                }
            }

            return {
                id_socio: row.id_socio,
                socio: `${row.nombres} ${row.apellidos}`,
                total_deuda: Number(row.total_deuda),
                estado: estadoFinanciero
            };
        });

        res.status(200).json(estados);
    } catch (error) {
        console.error('Error al obtener estados de cuenta:', error);
        res.status(500).json({ mensaje: 'Error al cargar los estados de cuenta.' });
    }
};
const obtenerDashboardFinanzas = async (req, res) => {
    try {
        // 1. KPI: Lo que falta facturar (Consumos de Secretaría)
        const kpiPendiente = await pool.query(`
            SELECT COALESCE(SUM(monto), 0) AS valor 
            FROM consumos WHERE estado = 'Pendiente de Facturación'
        `);

        // 2. KPI: Lo que ya se facturó y está a tiempo (o fraccionado vigente)
        const kpiPorCobrar = await pool.query(`
            SELECT COALESCE(SUM(monto_total), 0) AS valor 
            FROM facturacion 
            WHERE estado_pago != 'Pagada' AND fecha_vencimiento >= CURRENT_DATE
        `);

        // 3. KPI: Morosidad dura (Vencido y no fraccionado)
        const kpiMorosidad = await pool.query(`
            SELECT COALESCE(SUM(monto_total), 0) AS valor 
            FROM facturacion 
            WHERE estado_pago NOT IN ('Pagada', 'Fraccionada') 
              AND fecha_vencimiento < CURRENT_DATE
        `);

        // Datos para Gráfica de Torta (Se mantiene igual)
        const distribucionQuery = `
            SELECT 
                CASE 
                    WHEN estado_pago = 'Pendiente' AND fecha_vencimiento >= CURRENT_DATE THEN 'Por Cobrar (A tiempo)'
                    WHEN estado_pago = 'Pendiente' AND fecha_vencimiento < CURRENT_DATE THEN 'Morosidad'
                    WHEN estado_pago = 'Fraccionada' THEN 'Deuda Fraccionada'
                END as nombre,
                COALESCE(SUM(monto_total), 0) as valor
            FROM facturacion
            WHERE estado_pago != 'Pagada'
            GROUP BY nombre
            HAVING COALESCE(SUM(monto_total), 0) > 0;
        `;
        const distribucionResult = await pool.query(distribucionQuery);

        res.status(200).json({
            kpis: {
                pendiente_facturar: Number(kpiPendiente.rows[0].valor),
                facturado_por_cobrar: Number(kpiPorCobrar.rows[0].valor),
                morosidad_total: Number(kpiMorosidad.rows[0].valor)
            },
            graficaDistribucion: distribucionResult.rows.map(r => ({
                nombre: r.nombre,
                valor: Number(r.valor)
            }))
        });

    } catch (error) {
        console.error('Error al obtener datos del dashboard:', error);
        res.status(500).json({ mensaje: 'Error al cargar el panel de finanzas.' });
    }
};

module.exports = {
    obtenerConsumosPendientes,
    generarFacturacionMensual,
    obtenerFacturasMorosas,
    fraccionarDeuda,
    obtenerEstadosCuentaGeneral,
    obtenerDashboardFinanzas
};