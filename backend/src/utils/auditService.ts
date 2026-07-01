import prisma from '../config/database';

export const logAction = async (
  id_usuario: number | null,
  accion: string,
  tabla_afectada: string | null = null,
  detalles: string | null = null
) => {
  try {
    await prisma.auditoria.create({
      data: {
        id_usuario: id_usuario || null,
        accion,
        tabla_afectada,
        detalles,
        fecha: new Date()
      }
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
};
