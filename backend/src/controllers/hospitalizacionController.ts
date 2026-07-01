import { Request, Response } from 'express';
import prisma from '../config/database';

export const getHospitalizaciones = async (req: Request, res: Response) => {
  try {
    const ingresos = await prisma.ingreso_hospitalizacion.findMany({
      include: {
        paciente: {
          include: { persona: true }
        },
        camilla: {
          include: { sala: true }
        }
      },
      orderBy: { fecha_ingreso: 'desc' }
    });
    res.json(ingresos);
  } catch (error) {
    console.error('Error al obtener hospitalizaciones:', error);
    res.status(500).json({ error: 'Error interno al obtener hospitalizaciones.' });
  }
};

export const registrarIngreso = async (req: Request, res: Response) => {
  const { id_paciente, id_camilla, fecha_ingreso } = req.body;

  try {
    // Verify camilla is available
    const camilla = await prisma.camilla.findUnique({ where: { id_camilla: Number(id_camilla) } });
    if (!camilla) return res.status(404).json({ error: 'Camilla no encontrada.' });
    if (camilla.estado !== 'Disponible') return res.status(400).json({ error: 'La camilla seleccionada no está disponible.' });

    // Update camilla status
    await prisma.camilla.update({
      where: { id_camilla: Number(id_camilla) },
      data: { estado: 'Ocupada' }
    });

    // Create admission
    // Note: fecha_alta is required in schema, so we set a default future date or the same date until it's discharged.
    // Let's set it to exactly 1 year in the future as a placeholder, or just today if the schema forces it.
    // Let's use today's date for both, when discharge happens, we update fecha_alta.
    const ingreso = await prisma.ingreso_hospitalizacion.create({
      data: {
        id_paciente: Number(id_paciente),
        id_camilla: Number(id_camilla),
        fecha_ingreso: fecha_ingreso ? new Date(fecha_ingreso) : new Date(),
        fecha_alta: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // placeholder for active
      }
    });

    res.status(201).json(ingreso);
  } catch (error) {
    console.error('Error al registrar ingreso:', error);
    res.status(500).json({ error: 'Error interno al registrar el ingreso.' });
  }
};

export const darAlta = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fecha_alta } = req.body;

  try {
    const ingreso = await prisma.ingreso_hospitalizacion.findUnique({
      where: { id_ingreso_hospitalizacion: Number(id) }
    });

    if (!ingreso) return res.status(404).json({ error: 'Ingreso no encontrado.' });

    // Update ingreso
    await prisma.ingreso_hospitalizacion.update({
      where: { id_ingreso_hospitalizacion: Number(id) },
      data: { fecha_alta: fecha_alta ? new Date(fecha_alta) : new Date() }
    });

    // Free the bed
    await prisma.camilla.update({
      where: { id_camilla: ingreso.id_camilla },
      data: { estado: 'Disponible' }
    });

    res.json({ message: 'Paciente dado de alta exitosamente.' });
  } catch (error) {
    console.error('Error al dar de alta:', error);
    res.status(500).json({ error: 'Error interno al dar de alta.' });
  }
};

export const getSalasYCamillas = async (req: Request, res: Response) => {
  try {
    const salas = await prisma.sala.findMany({
      include: {
        camilla: true
      }
    });
    res.json(salas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener salas y camillas.' });
  }
};
