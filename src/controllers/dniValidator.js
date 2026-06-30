
/**
 * Valida que el DNI tenga exactamente 8 dígitos numéricos.
 * CP-CN-REG-01
 * @param {string} dni
 * @returns {{ valido: boolean, error: string|null }}
 */
function validarDNI(dni) {
  if (!dni || typeof dni !== 'string') {
    return { valido: false, error: 'El DNI es obligatorio.' };
  }

  const REGEX_DNI = /^\d{8}$/;

  if (!REGEX_DNI.test(dni.trim())) {
    return {
      valido: false,
      error: 'El DNI debe contener exactamente 8 dígitos numéricos.',
    };
  }

  return { valido: true, error: null };
}

module.exports = { validarDNI };
