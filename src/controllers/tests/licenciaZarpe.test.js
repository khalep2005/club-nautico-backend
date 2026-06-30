
jest.mock('../../config/db', () => ({ query: jest.fn() }));

const pool          = require('../../config/db');
const { crearZarpe } = require('../zarpesController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const reqBase = {
  body: {
    id_socio: 1, id_embarcacion: 1, id_tripulante: 1,
    fecha_salida: '2026-07-01', hora_salida: '08:00',
    fecha_retorno: '2026-07-02', hora_retorno: '18:00',
    destino: 'Isla San Lorenzo', pasajeros: [],
  }
};

describe('CF-CN-TRIP-02 — Bloqueo de zarpe por licencia marítima vencida', () => {

  beforeEach(() => jest.clearAllMocks());

  // Test 1 — Tripulante con licencia vencida → zarpe bloqueado
  test('debe retornar 400 cuando el tripulante no está Autorizado (licencia vencida)', async () => {
    // Socio al día
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ estado_membresia: 'Al día' }] })
      // Sin deudas vencidas
      .mockResolvedValueOnce({ rows: [{ deudas_vencidas: '0' }] })
      // Embarcación validada
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ estado_capitania: 'Validado' }] })
      // Tripulante NO autorizado (licencia vencida)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ estado: 'Bloqueado' }] });

    const req = { body: { ...reqBase.body } };
    const res = mockRes();

    await crearZarpe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'Zarpe Bloqueado: La tripulación seleccionada no cuenta con autorización marítima vigente.',
    });
  });

  // Test 2 — Tripulante autorizado → zarpe permitido
  test('debe permitir el zarpe cuando el tripulante está Autorizado', async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ estado_membresia: 'Al día' }] })
      .mockResolvedValueOnce({ rows: [{ deudas_vencidas: '0' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ estado_capitania: 'Validado' }] })
      // Tripulante SÍ autorizado
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ estado: 'Autorizado' }] })
      // INSERT zarpe
      .mockResolvedValueOnce({ rows: [{ id_zarpe: 99 }] });

    const req = { body: { ...reqBase.body } };
    const res = mockRes();

    await crearZarpe(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: 'Solicitud de zarpe registrada con éxito.' })
    );
  });

});
