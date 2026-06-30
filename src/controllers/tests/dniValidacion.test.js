
const { validarDNI } = require('../dniValidator');


// CP-CN-REG-01  Validación de formato de DNI

describe('CP-CN-REG-01 — Validar formato de DNI del postulante', () => {

  
  test('debe devolver error para DNI con letras "1234567A"', () => {
    const resultado = validarDNI('1234567A');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('El DNI debe contener exactamente 8 dígitos numéricos.');
  });

  
  test('debe devolver error para DNI de longitud errónea "12345"', () => {
    const resultado = validarDNI('12345');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('El DNI debe contener exactamente 8 dígitos numéricos.');
  });

  
  test('debe devolver error para DNI de 9 dígitos "123456789"', () => {
    const resultado = validarDNI('123456789');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('El DNI debe contener exactamente 8 dígitos numéricos.');
  });

 
  test('debe devolver error para DNI vacío', () => {
    const resultado = validarDNI('');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('El DNI es obligatorio.');
  });

  
  test('debe retornar valido:true para DNI correcto "12345678"', () => {
    const resultado = validarDNI('12345678');
    expect(resultado.valido).toBe(true);
    expect(resultado.error).toBeNull();
  });

  
  test('debe retornar valido:true para DNI correcto "87654321"', () => {
    const resultado = validarDNI('87654321');
    expect(resultado.valido).toBe(true);
    expect(resultado.error).toBeNull();
  });

});
