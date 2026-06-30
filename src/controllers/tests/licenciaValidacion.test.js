

const { validarLicencia } = require('../licenciaValidator');


// CF-CN-TRIP-01 | Validación de vigencia de licencia de navegación

describe('CF-CN-TRIP-01 — Validar vigencia de licencia del tripulante', () => {

  // Test 1 (Negativo) — licencia vencida el año pasado
  test('debe retornar error de licencia expirada para fecha del año pasado', () => {
    const resultado = validarLicencia('2024-01-01');

    expect(resultado.vigente).toBe(false);
    expect(resultado.error).toBe(
      'La licencia del tripulante está vencida. No puede ser registrado.'
    );
  });

  // Test 2 (Negativo) — licencia vencida ayer
  test('debe retornar error de licencia expirada para fecha de ayer', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().split('T')[0];

    const resultado = validarLicencia(fechaAyer);

    expect(resultado.vigente).toBe(false);
    expect(resultado.error).toBe(
      'La licencia del tripulante está vencida. No puede ser registrado.'
    );
  });

  // Test 3 (Negativo) — sin fecha
  test('debe retornar error cuando la fecha de licencia está vacía', () => {
    const resultado = validarLicencia('');

    expect(resultado.vigente).toBe(false);
    expect(resultado.error).toBe(
      'La fecha de vencimiento de la licencia es obligatoria.'
    );
  });

  // Test 4 (Positivo) — licencia vigente (año próximo)
  test('debe retornar vigente:true para licencia con fecha futura', () => {
    const resultado = validarLicencia('2027-12-31');

    expect(resultado.vigente).toBe(true);
    expect(resultado.error).toBeNull();
  });

});
