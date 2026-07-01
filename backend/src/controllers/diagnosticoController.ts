import { Request, Response } from 'express';

import prisma from '../config/database';
import { logAction } from '../utils/auditService';
// GET /diagnostico
export const getDiagnosticos = async (req: Request, res: Response) => {
  try {
    const diagnosticos = await prisma.diagnostico.findMany({
      include: {
        paciente: { include: { persona: true } },
        cita: true,
        tratamiento: { include: { receta: { include: { detalle_receta: { include: { farmacia: true } } } } } }
      }
    });
    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener diagnósticos' });
  }
};

// GET /diagnostico/cita/:id_cita
export const getDiagnosticosByCita = async (req: Request, res: Response) => {
  try {
    const rawIdCita = Array.isArray(req.params.id_cita) ? req.params.id_cita[0] : req.params.id_cita;
    const id_cita = parseInt(rawIdCita as string, 10);
    const diagnosticos = await prisma.diagnostico.findMany({
      where: { id_cita },
      include: {
        paciente: { include: { persona: true } },
        tratamiento: { include: { receta: { include: { detalle_receta: { include: { farmacia: true } } } } } }
      }
    });
    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener diagnósticos de la cita' });
  }
};

// POST /diagnostico
// Body: { descripcion, fecha, id_paciente, id_cita }
// Auto-crea historial_clinico si no existe y marca la cita como Completada
export const createDiagnostico = async (req: Request, res: Response) => {
  const { descripcion, fecha, id_paciente, id_cita } = req.body;

  if (!descripcion || !fecha || !id_paciente || !id_cita) {
    return res.status(400).json({ error: 'Faltan campos requeridos: descripcion, fecha, id_paciente, id_cita' });
  }

  try {
    // 1. Verificar o crear historial_clinico del paciente
    let historial = await prisma.historial_clinico.findUnique({
      where: { id_paciente: Number(id_paciente) }
    });

    if (!historial) {
      historial = await prisma.historial_clinico.create({
        data: {
          fecha_creacion: new Date(),
          observaciones: 'Historial creado automáticamente al registrar el primer diagnóstico.',
          id_paciente: Number(id_paciente)
        }
      });
    }

    // 2. Crear el diagnóstico
    const nuevoDiagnostico = await prisma.diagnostico.create({
      data: {
        descripcion,
        fecha: new Date(fecha),
        id_paciente: Number(id_paciente),
        id_cita: Number(id_cita),
        id_historiaclinica: historial.id_historiaclinica
      },
      include: {
        paciente: { include: { persona: true } },
        tratamiento: true
      }
    });

    // 3. Marcar la cita como Completada
    await prisma.cita.update({
      where: { id_cita: Number(id_cita) },
      data: { estado: 'Completada' }
    });

    // Registrar en auditoría
    const userId = (req as any).user?.id_usuario || null;
    await logAction(userId, 'CREAR_DIAGNOSTICO', 'diagnostico', `Se creó el diagnóstico ID: ${nuevoDiagnostico.id_diagnostico}`);

    res.status(201).json(nuevoDiagnostico);
  } catch (error) {
    console.error('Error en createDiagnostico:', error);
    res.status(500).json({ error: 'Error al crear diagnóstico' });
  }
};

// GET /diagnostico/:id
export const getDiagnosticoById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId as string, 10);
    const diagnostico = await prisma.diagnostico.findUnique({
      where: { id_diagnostico: id },
      include: {
        paciente: { include: { persona: true } },
        cita: true,
        tratamiento: { include: { receta: { include: { detalle_receta: { include: { farmacia: true } } } } } }
      }
    });
    if (!diagnostico) return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    res.json(diagnostico);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener diagnóstico' });
  }
};
