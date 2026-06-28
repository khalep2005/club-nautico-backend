

jest.mock('../../config/db', () => ({ query: jest.fn() }));

const { crearConsumo } = require('../consumoController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};


// CF-CN-CONS-02 | Evitar monto vacío o negativo

describe('CF-CN-CONS-02 — Validar que el monto de consumo no sea negativo ni cero', () => {

  beforeEach(() => jest.clearAllMocks());

  // Test 1 — monto negativo -50.00
  test('debe retornar 400 cuando el monto es -50.00', async () => {
    const req = {
      body: { tipo_doc: 'DNI', dni_socio: '12345678', servicio: 'Cafetería', monto: -50.00 },
      usuario: { id_usuario: 1 }
    };
    const res = mockRes();

    await crearConsumo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'El monto debe ser un número válido mayor a cero.',
    });
  });

  // Test 2 — monto cero
  test('debe retornar 400 cuando el monto es 0', async () => {
    const req = {
      body: { tipo_doc: 'DNI', dni_socio: '12345678', servicio: 'Limpieza', monto: 0 },
      usuario: { id_usuario: 1 }
    };
    const res = mockRes();

    await crearConsumo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'El monto debe ser un número válido mayor a cero.',
    });
  });

  // Test 3 (Negativo) — monto vacío
  test('debe retornar 400 cuando el monto está vacío', async () => {
    const req = {
      body: { tipo_doc: 'DNI', dni_socio: '12345678', servicio: 'Cafetería', monto: null },
      usuario: { id_usuario: 1 }
    };
    const res = mockRes();

    await crearConsumo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      mensaje: 'El tipo de documento, número, servicio y monto son obligatorios.',
    });
  });

});
