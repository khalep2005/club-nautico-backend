

/**
 * Calcula el resultado de aplicar un abono sobre una deuda.
 * CF-CN-PAGO-02 / CF-CN-PAGO-03
 * @param {number} deudaInicial  — monto total adeudado
 * @param {number} montoAbono    — monto que el socio paga
 * @returns {{ saldoRestante: number, estado: string, saldoAFavor: number }}
 */
function calcularAbono(deudaInicial, montoAbono) {
  if (deudaInicial <= 0) {
    throw new Error('La deuda inicial debe ser mayor a cero.');
  }
  if (montoAbono <= 0) {
    throw new Error('El monto del abono debe ser mayor a cero.');
  }
  if (montoAbono > deudaInicial) {
    throw new Error(
      `El monto del abono (S/ ${montoAbono}) excede la deuda (S/ ${deudaInicial}). No se permiten sobrepagos.`
    );
  }

  const saldoRestante = Number((deudaInicial - montoAbono).toFixed(2));
  const estado = saldoRestante === 0 ? 'Pagada' : 'Pendiente';

  return { saldoRestante, estado, saldoAFavor: 0 };
}

module.exports = { calcularAbono };
