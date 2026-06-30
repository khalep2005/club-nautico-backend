

const { calcularAbono } = require('../abonoCalculator');


// CF-CN-PAGO-02 / CF-CN-PAGO-03 | Abono de caja

describe('CF-CN-PAGO-02 — Pago parcial deja saldo pendiente', () => {

  // Test 1 (Pago parcial) — deuda 500, abona 300 → saldo 200 pendiente
  test('deuda S/500 con abono S/300 debe dejar saldo restante de S/200 en estado Pendiente', () => {
    const resultado = calcularAbono(500, 300);

    expect(resultado.saldoRestante).toBe(200);
    expect(resultado.estado).toBe('Pendiente');
  });

  // Test 2 — pago exacto → saldo 0 y estado Pagada
  test('deuda S/500 con abono S/500 debe dejar saldo S/0 en estado Pagada', () => {
    const resultado = calcularAbono(500, 500);

    expect(resultado.saldoRestante).toBe(0);
    expect(resultado.estado).toBe('Pagada');
  });

});

describe('CF-CN-PAGO-03 — Advertencia si el pago excede la deuda', () => {

  // Test 3 (Sobrepago) — deuda 500, abona 600 → error
  test('deuda S/500 con abono S/600 debe lanzar error de sobrepago', () => {
    expect(() => calcularAbono(500, 600)).toThrow(
      'El monto del abono (S/ 600) excede la deuda (S/ 500). No se permiten sobrepagos.'
    );
  });

  // Test 4 (Negativo) — abono cero → error
  test('debe lanzar error si el monto del abono es 0', () => {
    expect(() => calcularAbono(500, 0)).toThrow(
      'El monto del abono debe ser mayor a cero.'
    );
  });

});
