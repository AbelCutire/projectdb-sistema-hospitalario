import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDiagnosticos = async (req: Request, res: Response) => {
  try {
    const diagnosticos = await prisma.diagnostico.findMany({
      include: { paciente: true, cita: true },
    });
    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener diagnósticos' });
  }
};

export const createDiagnostico = async (req: Request, res: Response) => {
  try {
    const nuevoDiagnostico = await prisma.diagnostico.create({
      data: req.body,
    });
    res.status(201).json(nuevoDiagnostico);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear diagnóstico' });
  }
};

export const getDiagnosticoById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const diagnostico = await prisma.diagnostico.findUnique({
      where: { id_diagnostico: id },
      include: { paciente: true, cita: true },
    });
    res.json(diagnostico);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener diagnóstico' });
  }
};
