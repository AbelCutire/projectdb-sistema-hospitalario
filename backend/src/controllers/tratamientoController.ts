import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /tratamiento/diagnostico/:id_diagnostico
export const getTratamientosByDiagnostico = async (req: Request, res: Response) => {
  try {
    const id_diagnostico = parseInt(req.params.id_diagnostico, 10);
    const tratamientos = await prisma.tratamiento.findMany({
      where: { id_diagnostico },
      include: {
        receta: {
          include: {
            detalle_receta: { include: { farmacia: true } }
          }
        }
      }
    });
    res.json(tratamientos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tratamientos' });
  }
};

// POST /tratamiento
// Body: { fecha_inicio, fecha_fin, id_diagnostico }
export const createTratamiento = async (req: Request, res: Response) => {
  const { fecha_inicio, fecha_fin, id_diagnostico } = req.body;

  if (!fecha_inicio || !fecha_fin || !id_diagnostico) {
    return res.status(400).json({ error: 'Faltan campos: fecha_inicio, fecha_fin, id_diagnostico' });
  }

  try {
    const tratamiento = await prisma.tratamiento.create({
      data: {
        fecha_inicio: new Date(fecha_inicio),
        fecha_fin:    new Date(fecha_fin),
        id_diagnostico: Number(id_diagnostico)
      },
      include: {
        receta: true
      }
    });
    res.status(201).json(tratamiento);
  } catch (error) {
    console.error('Error en createTratamiento:', error);
    res.status(500).json({ error: 'Error al crear tratamiento' });
  }
};

// GET /tratamiento/:id
export const getTratamientoById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tratamiento = await prisma.tratamiento.findUnique({
      where: { id_tratamiento: id },
      include: {
        receta: { include: { detalle_receta: { include: { farmacia: true } } } },
        diagnostico: { include: { paciente: { include: { persona: true } } } }
      }
    });
    if (!tratamiento) return res.status(404).json({ error: 'Tratamiento no encontrado' });
    res.json(tratamiento);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tratamiento' });
  }
};
