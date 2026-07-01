import prisma from '../config/database';

export const logAction = async (
  id_usuario: number | null,
  accion: string,
  tabla_afectada: string | null = null,
  detalles: string | null = null
) => {
  try {
    if (!id_usuario) return; // Auditoria requiere un usuario en la BD

    await prisma.auditoria.create({
      data: {
        id_usuario: id_usuario,
        accion_realizada: accion,
        tabla_afectada: tabla_afectada || 'General',
        descripcion_cambio: detalles
      }
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
};
