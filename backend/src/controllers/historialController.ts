import { Request, Response } from 'express';

import prisma from '../config/database';

// GET /historial/:id_paciente
// Devuelve el historial clínico completo con todos los diagnósticos, tratamientos y recetas
export const getHistorialByPaciente = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id_paciente) ? req.params.id_paciente[0] : req.params.id_paciente;
    const id_paciente = parseInt(rawId as string, 10);

    const historial = await prisma.historial_clinico.findUnique({
      where: { id_paciente },
      include: {
        paciente: {
          include: {
            persona: true
          }
        },
        diagnostico: {
          orderBy: { fecha: 'desc' },
          include: {
            cita: {
              include: {
                doctor: {
                  include: {
                    especialidad: true,
                    empleado: { include: { persona: true } }
                  }
                }
              }
            },
            tratamiento: {
              include: {
                receta: {
                  include: {
                    detalle_receta: { include: { farmacia: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!historial) {
      return res.status(404).json({ error: 'No se encontró historial clínico para este paciente' });
    }

    res.json(historial);
  } catch (error) {
    console.error('Error en getHistorialByPaciente:', error);
    res.status(500).json({ error: 'Error al obtener historial clínico' });
  }
};

// GET /historial
// Para admin/médico: lista todos los historiales con datos básicos
export const getAllHistoriales = async (req: Request, res: Response) => {
  try {
    const historiales = await prisma.historial_clinico.findMany({
      include: {
        paciente: { include: { persona: true } },
        diagnostico: true
      },
      orderBy: { fecha_creacion: 'desc' }
    });
    res.json(historiales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historiales' });
  }
};
