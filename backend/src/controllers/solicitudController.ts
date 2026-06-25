import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /solicitud — Admin: ver todas las solicitudes
export const getSolicitudes = async (req: Request, res: Response) => {
  try {
    const solicitudes = await prisma.solicitud_acceso.findMany({
      include: {
        doctor:   { include: { persona: true } },
        admin:    { include: { persona: true } },
        paciente: { include: { persona: true } }
      },
      orderBy: { fecha_sol: 'desc' }
    });
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// GET /solicitud/doctor/:id_usuario — Doctor: sus solicitudes enviadas
export const getSolicitudesByDoctor = async (req: Request, res: Response) => {
  try {
    const id_doctor = parseInt(req.params.id_usuario, 10);
    const solicitudes = await prisma.solicitud_acceso.findMany({
      where: { id_doctor },
      include: {
        paciente: { include: { persona: true } }
      },
      orderBy: { fecha_sol: 'desc' }
    });
    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes del doctor' });
  }
};

// POST /solicitud — Doctor: crear solicitud de acceso
// Body: { id_doctor (id_usuario), id_paciente, motivo }
export const createSolicitud = async (req: Request, res: Response) => {
  const { id_doctor, id_paciente, motivo } = req.body;
  if (!id_doctor || !id_paciente || !motivo) {
    return res.status(400).json({ error: 'Faltan campos: id_doctor, id_paciente, motivo' });
  }
  try {
    // Verificar que no exista una solicitud pendiente del mismo doctor para el mismo paciente
    const existente = await prisma.solicitud_acceso.findFirst({
      where: {
        id_doctor:   Number(id_doctor),
        id_paciente: Number(id_paciente),
        estado:      'Pendiente'
      }
    });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una solicitud pendiente para este paciente.' });
    }

    const solicitud = await prisma.solicitud_acceso.create({
      data: {
        id_doctor:   Number(id_doctor),
        id_paciente: Number(id_paciente),
        motivo:      String(motivo),
        estado:      'Pendiente'
      },
      include: { paciente: { include: { persona: true } } }
    });
    res.status(201).json(solicitud);
  } catch (error) {
    console.error('Error en createSolicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

// PUT /solicitud/:id — Admin: aprobar o rechazar
// Body: { estado: 'Aprobada' | 'Rechazada', id_admin }
export const responderSolicitud = async (req: Request, res: Response) => {
  const id_solicitud = parseInt(req.params.id, 10);
  const { estado, id_admin } = req.body;

  if (!['Aprobada', 'Rechazada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado debe ser Aprobada o Rechazada' });
  }

  try {
    const solicitud = await prisma.solicitud_acceso.update({
      where: { id_solicitud },
      data: {
        estado,
        id_admin:   id_admin ? Number(id_admin) : undefined,
        fecha_resp: new Date()
      },
      include: {
        doctor:   { include: { persona: true } },
        paciente: { include: { persona: true } }
      }
    });
    res.json(solicitud);
  } catch (error) {
    res.status(500).json({ error: 'Error al responder solicitud' });
  }
};
