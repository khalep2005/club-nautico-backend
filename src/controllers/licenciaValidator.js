

/**
 * Valida que la licencia de navegación del tripulante esté vigente.
 * CF-CN-TRIP-01
 * @param {string} fechaVencimiento — fecha en formato 'YYYY-MM-DD'
 * @returns {{ vigente: boolean, error: string|null }}
 */
function validarLicencia(fechaVencimiento) {
  if (!fechaVencimiento) {
    return { vigente: false, error: 'La fecha de vencimiento de la licencia es obligatoria.' };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaVenc = new Date(fechaVencimiento);

  if (isNaN(fechaVenc.getTime())) {
    return { vigente: false, error: 'El formato de fecha de licencia no es válido.' };
  }

  if (fechaVenc < hoy) {
    return { vigente: false, error: 'La licencia del tripulante está vencida. No puede ser registrado.' };
  }

  return { vigente: true, error: null };
}

module.exports = { validarLicencia };
