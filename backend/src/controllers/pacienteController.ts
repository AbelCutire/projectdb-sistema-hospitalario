import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPacientes = async (req: Request, res: Response) => {
  try {
    const pacientes = await prisma.paciente.findMany();
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
};

export const createPaciente = async (req: Request, res: Response) => {
  try {
    const nuevoPaciente = await prisma.paciente.create({
      data: req.body,
    });
    res.status(201).json(nuevoPaciente);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear paciente' });
  }
};
