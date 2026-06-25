import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCitas = async (req: Request, res: Response) => {
  try {
    const citas = await prisma.cita.findMany({
      include: { 
        consultorio: true,
        paciente: { include: { persona: true } },
        doctor: { include: { especialidad: true, empleado: { include: { persona: true } } } }
      },
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

export const createCita = async (req: Request, res: Response) => {
  try {
    const { id_paciente, id_doctor, id_consultorio, fecha, hora, estado } = req.body;

    // Auto-crear paciente si no existe para evitar error de foreign key
    const pacienteExistente = await prisma.paciente.findUnique({ where: { id_persona: Number(id_paciente) } });
    if (!pacienteExistente) {
      await prisma.paciente.create({
        data: {
          id_persona: Number(id_paciente),
          grupo_sanguineo: 'Por definir',
          alergias: 'Ninguna',
          peso: 0,
          altura: 0,
          contacto_emergencia: 'Por definir',
          antecedentes_medicos: 'Ninguno',
          estado_paciente: 'Estable'
        }
      });
    }

    const nuevaCita = await prisma.cita.create({
      data: {
        id_paciente: Number(id_paciente),
        id_doctor: Number(id_doctor),
        id_consultorio: Number(id_consultorio),
        fecha,
        hora,
        estado
      },
    });
    res.status(201).json(nuevaCita);
  } catch (error) {
    console.error("Error en createCita:", error);
    res.status(500).json({ error: 'Error al crear cita' });
  }
};

export const getCitaById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const cita = await prisma.cita.findUnique({
      where: { id_cita: id },
      include: { 
        consultorio: true,
        paciente: { include: { persona: true } },
        doctor: { include: { especialidad: true, empleado: { include: { persona: true } } } }
      },
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
