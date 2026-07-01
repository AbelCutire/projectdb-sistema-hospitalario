import prisma from '../config/database';

export const logAction = async (
  id_usuario: number | null | undefined,
  accion_realizada: string,
  tabla_afectada: string = 'N/A',
  descripcion_cambio: string | null = null
) => {
  if (!id_usuario) return;
  try {
    if (!id_usuario) return; // Auditoria requiere un usuario en la BD

    await prisma.auditoria.create({
      data: {
<<<<<<< HEAD
        id_usuario: id_usuario,
        accion_realizada: accion,
        tabla_afectada: tabla_afectada || 'General',
        descripcion_cambio: detalles
=======
        id_usuario,
        accion_realizada,
        tabla_afectada,
        descripcion_cambio,
        fecha_hora: new Date()
>>>>>>> eb19a4ba20c73359629be2c04abebb6dfcee5cf3
      }
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
};
