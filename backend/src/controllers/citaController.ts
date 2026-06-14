import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCitas = async (req: Request, res: Response) => {
  try {
    const citas = await prisma.cita.findMany({
      include: { doctor: true, paciente: true, consultorio: true },
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

export const createCita = async (req: Request, res: Response) => {
  try {
    const nuevaCita = await prisma.cita.create({
      data: req.body,
    });
    res.status(201).json(nuevaCita);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cita' });
  }
};

export const getCitaById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const cita = await prisma.cita.findUnique({
      where: { id_cita: id },
      include: { doctor: true, paciente: true, consultorio: true },
    });
    res.json(cita);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cita' });
  }
};

export const updateCita = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const citaActualizada = await prisma.cita.update({
      where: { id_cita: id },
      data: req.body,
    });
    res.json(citaActualizada);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
};
