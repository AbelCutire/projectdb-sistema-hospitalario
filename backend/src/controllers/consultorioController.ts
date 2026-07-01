import { Request, Response } from 'express';

import prisma from '../config/database';

// GET /consultorio
export const getConsultorios = async (req: Request, res: Response) => {
  try {
    const consultorios = await prisma.consultorio.findMany({
      include: { departamento: true },
      orderBy: { id_consultorio: 'asc' }
    });
    res.json(consultorios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener consultorios' });
  }
};
