

const { generarPDFRechazo, registrarRechazo } = require('../pdfRechazoGenerator');


// CF-CN-MEM-02 Rechazo de membresía con motivo y generación de PDF

describe('CF-CN-MEM-02 — Rechazo de membresía con motivo y generación de PDF', () => {

  // Test 1 — Verificar que el sistema registre estado "Rechazado" y guarde el motivo
  test('debe crear un registro con estado Rechazado y guardar el motivo ingresado', () => {
    const datos = {
      idSolicitud: 42,
      motivo: 'El postulante presenta antecedentes de morosidad en otros clubes.',
    };

    const resultado = registrarRechazo(datos);

    expect(resultado.estado).toBe('Rechazado');
    expect(resultado.idSolicitud).toBe(42);
    expect(resultado.motivo).toBe('El postulante presenta antecedentes de morosidad en otros clubes.');
  });

  // Test 1B (Negativo) — No debe registrar rechazo sin motivo
  test('debe lanzar error si el motivo está vacío', () => {
    const datos = { idSolicitud: 42, motivo: '' };
    expect(() => registrarRechazo(datos)).toThrow(
      'El ID de solicitud y el motivo de rechazo son obligatorios.'
    );
  });

  // Test 2 — Validar que el PDF retorne un buffer válido no vacío
  test('debe retornar un buffer de PDF válido y no vacío', async () => {
    const datos = {
      nombreSocio: 'Juan Pérez',
      motivo: 'El postulante presenta antecedentes de morosidad en otros clubes.',
      fecha: '28/06/2026',
    };

    const buffer = await generarPDFRechazo(datos);

    // Verificar que es un Buffer
    expect(Buffer.isBuffer(buffer)).toBe(true);

    // Verificar que no está vacío
    expect(buffer.length).toBeGreaterThan(0);

    // Verificar que empieza con la firma de un PDF (%PDF)
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  
  test('debe lanzar error si faltan nombre o motivo para el PDF', async () => {
    const datos = { nombreSocio: '', motivo: '' };
    await expect(generarPDFRechazo(datos)).rejects.toThrow(
      'El nombre del socio y el motivo de rechazo son obligatorios.'
    );
  });

});
