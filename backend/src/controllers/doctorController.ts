import { Request, Response } from 'express';

import prisma from '../config/database';

export const getDoctores = async (req: Request, res: Response) => {
  try {
    const doctores = await prisma.doctor.findMany({
      include: { 
        especialidad: true, 
        empleado: { include: { persona: true } } 
      },
    });
    res.json(doctores);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener doctores' });
  }
};

export const createDoctor = async (req: Request, res: Response) => {
  try {
    const nuevoDoctor = await prisma.doctor.create({
      data: req.body,
    });
    res.status(201).json(nuevoDoctor);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear doctor' });
  }
};

export const getDoctorById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const doctor = await prisma.doctor.findUnique({
      where: { id_persona: id },
      include: { 
        especialidad: true, 
        empleado: { include: { persona: true } } 
      },
    });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener doctor' });
  }
};
