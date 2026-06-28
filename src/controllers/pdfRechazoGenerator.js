

const PDFDocument = require('pdfkit');

/**
 * Genera un PDF con el motivo de rechazo de membresía.
 * CF-CN-MEM-02
 * @param {{ nombreSocio: string, motivo: string, fecha: string }} datos
 * @returns {Promise<Buffer>} 
 */
function generarPDFRechazo(datos) {
  return new Promise((resolve, reject) => {
    const { nombreSocio, motivo, fecha } = datos;

    if (!nombreSocio || !motivo) {
      return reject(new Error('El nombre del socio y el motivo de rechazo son obligatorios.'));
    }

    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    
    doc.fontSize(18).text('Club Náutico Poseidón', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Carta de Rechazo de Membresía', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha: ${fecha || new Date().toLocaleDateString('es-PE')}`);
    doc.moveDown();
    doc.text(`Estimado/a: ${nombreSocio}`);
    doc.moveDown();
    doc.text('Lamentamos informarle que su solicitud de membresía ha sido rechazada por el siguiente motivo:');
    doc.moveDown();
    doc.text(`Motivo: ${motivo}`);
    doc.moveDown();
    doc.text('Atentamente,');
    doc.text('Jefatura de Atención al Cliente');
    doc.text('Club Náutico Poseidón');

    doc.end();
  });
}

/**
 * Registra el rechazo de una solicitud con su motivo.
 * CF-CN-MEM-02
 * @param {{ idSolicitud: number, motivo: string }} datos
 * @returns {{ idSolicitud: number, estado: string, motivo: string }}
 */
function registrarRechazo(datos) {
  const { idSolicitud, motivo } = datos;

  if (!idSolicitud || !motivo || motivo.trim().length === 0) {
    throw new Error('El ID de solicitud y el motivo de rechazo son obligatorios.');
  }

  return {
    idSolicitud,
    estado: 'Rechazado',
    motivo: motivo.trim(),
  };
}

module.exports = { generarPDFRechazo, registrarRechazo };
