import { Request, Response } from 'express';
import prisma from '../config/database';

export const updateContrato = async (req: Request, res: Response) => {
  const { id_persona } = req.params;
  const { salario, fecha_inicio, fecha_fin, estado } = req.body;

  try {
    const empleado = await prisma.empleado.findUnique({
      where: { id_persona: Number(id_persona) },
      include: { contrato: true }
    });

    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado.' });
    }

    if (!empleado.contrato) {
      // Create new contract if it doesn't exist
      await prisma.contrato.create({
        data: {
          salario: Number(salario) || 0,
          fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : new Date(),
          fecha_fin: fecha_fin ? new Date(fecha_fin) : new Date(),
          estado: estado || 'Activo',
          id_empleado: Number(id_persona)
        }
      });
    } else {
      // Update existing contract
      await prisma.contrato.update({
        where: { id_empleado: Number(id_persona) },
        data: {
          salario: salario !== undefined ? Number(salario) : undefined,
          fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : undefined,
          fecha_fin: fecha_fin ? new Date(fecha_fin) : undefined,
          estado: estado || undefined
        }
      });
    }

    // Also update empleado status if state changes
    if (estado) {
      await prisma.empleado.update({
        where: { id_persona: Number(id_persona) },
        data: { estado_laboral: estado }
      });
    }

    res.json({ message: 'Contrato actualizado exitosamente.' });
  } catch (error) {
    console.error('Error al actualizar contrato:', error);
    res.status(500).json({ error: 'Error interno al actualizar el contrato laboral.' });
  }
};
