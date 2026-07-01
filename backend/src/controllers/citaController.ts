import { Request, Response } from 'express';

import prisma from '../config/database';
import { logAction } from '../utils/auditService';
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

export const cancelarCita = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    
    // Asumimos que si no hay 'req.user', el usuario es un paciente u otro rol
    const userRole = (req as any).user?.rol || 'Paciente';
    const userId = (req as any).user?.id_usuario || null;

    const cita = await prisma.cita.findUnique({
      where: { id_cita: id }
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }

    if (cita.estado === 'Cancelada') {
      return res.status(400).json({ error: 'La cita ya se encuentra cancelada.' });
    }

    // Regla de negocio de 24 horas (excepción para Administrador)
    if (userRole !== 'Administrador') {
      // cita.fecha y cita.hora son objetos Date en Prisma
      const citaFecha = new Date(cita.fecha);
      const citaHora = new Date(cita.hora);
      
      // Construir la fecha exacta de la cita combinando año/mes/día de fecha y horas/minutos de hora
      const citaDateTime = new Date(
        citaFecha.getUTCFullYear(),
        citaFecha.getUTCMonth(),
        citaFecha.getUTCDate(),
        citaHora.getUTCHours(),
        citaHora.getUTCMinutes(),
        citaHora.getUTCSeconds()
      );
      
      const now = new Date();
      
      const timeDiff = citaDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      if (hoursDiff < 24 && hoursDiff > 0) {
        return res.status(400).json({ error: 'No se puede cancelar una cita con menos de 24 horas de anticipación.' });
      }
      
      if (hoursDiff <= 0) {
        return res.status(400).json({ error: 'La cita ya ha pasado.' });
      }
    }

    const citaCancelada = await prisma.cita.update({
      where: { id_cita: id },
      data: { estado: 'Cancelada' }
    });

    // Registrar en auditoría
<<<<<<< HEAD
    const { logAction } = await import('../utils/auditService.js');
=======
>>>>>>> eb19a4ba20c73359629be2c04abebb6dfcee5cf3
    await logAction(userId, 'CANCELAR_CITA', 'cita', `Se canceló la cita ID: ${id}`);

    res.json(citaCancelada);
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar la cita.' });
  }
};
