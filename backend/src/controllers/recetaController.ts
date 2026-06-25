import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /receta
export const getRecetas = async (req: Request, res: Response) => {
  try {
    const recetas = await prisma.receta.findMany({
      include: {
        detalle_receta: { include: { farmacia: true } },
        tratamiento: {
          include: {
            diagnostico: { include: { paciente: { include: { persona: true } } } }
          }
        }
      }
    });
    res.json(recetas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
};

// GET /receta/tratamiento/:id_tratamiento
export const getRecetasByTratamiento = async (req: Request, res: Response) => {
  try {
    const id_tratamiento = parseInt(req.params.id_tratamiento, 10);
    const recetas = await prisma.receta.findMany({
      where: { id_tratamiento },
      include: { detalle_receta: { include: { farmacia: true } } }
    });
    res.json(recetas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recetas del tratamiento' });
  }
};

// POST /receta
// Body: { fecha_emision, id_tratamiento, detalles: [{ id_farmacia, dosis, frecuencia, duracion }] }
export const createReceta = async (req: Request, res: Response) => {
  const { fecha_emision, id_tratamiento, detalles } = req.body;

  if (!fecha_emision || !id_tratamiento || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ error: 'Faltan campos: fecha_emision, id_tratamiento, detalles[]' });
  }

  try {
    const receta = await prisma.receta.create({
      data: {
        fecha_emision:  new Date(fecha_emision),
        id_tratamiento: Number(id_tratamiento),
        detalle_receta: {
          create: detalles.map((d: any) => ({
            id_farmacia: Number(d.id_farmacia),
            dosis:       String(d.dosis),
            frecuencia:  String(d.frecuencia),
            duracion:    String(d.duracion)
          }))
        }
      },
      include: {
        detalle_receta: { include: { farmacia: true } }
      }
    });
    res.status(201).json(receta);
  } catch (error) {
    console.error('Error en createReceta:', error);
    res.status(500).json({ error: 'Error al crear receta' });
  }
};
