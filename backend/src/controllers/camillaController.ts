import { Request, Response } from 'express';

import prisma from '../config/database';

export const getCamillas = async (req: Request, res: Response) => {
  try {
    const camillas = await prisma.camilla.findMany({
      include: { sala: true }
    });
    res.json(camillas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener camillas' });
  }
};

export const updateCamilla = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId as string, 10);
    const { estado } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const camillaActualizada = await prisma.camilla.update({
      where: { id_camilla: id },
      data: { estado }
    });
    res.json(camillaActualizada);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar camilla' });
  }
};
