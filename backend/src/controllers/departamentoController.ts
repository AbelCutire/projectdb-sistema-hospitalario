import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDepartamentos = async (req: Request, res: Response) => {
  try {
    const departamentos = await prisma.departamento.findMany({
      include: { consultorio: true, sala: true },
    });
    res.json(departamentos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
};

export const createDepartamento = async (req: Request, res: Response) => {
  try {
    const nuevoDepartamento = await prisma.departamento.create({
      data: req.body,
    });
    res.status(201).json(nuevoDepartamento);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear departamento' });
  }
};

export const getDepartamentoById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const departamento = await prisma.departamento.findUnique({
      where: { id_departamento: id },
      include: { consultorio: true, sala: true },
    });
    res.json(departamento);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener departamento' });
  }
};
