import { Request, Response } from 'express';

import prisma from '../config/database';

export const getFarmacos = async (req: Request, res: Response) => {
  try {
    const farmacos = await prisma.farmacia.findMany({
      include: { items_stock: true },
    });
    res.json(farmacos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener fármacos' });
  }
};

export const createFarmaco = async (req: Request, res: Response) => {
  try {
    const nuevoFarmaco = await prisma.farmacia.create({
      data: req.body,
    });
    res.status(201).json(nuevoFarmaco);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear fármaco' });
  }
};

export const getFarmacoById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const farmaco = await prisma.farmacia.findUnique({
      where: { id_farmacia: id },
      include: { items_stock: true },
    });
    res.json(farmaco);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener fármaco' });
  }
};
