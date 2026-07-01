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
        id_usuario,
        accion_realizada,
        tabla_afectada,
        descripcion_cambio,
        fecha_hora: new Date()
      }
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
};
