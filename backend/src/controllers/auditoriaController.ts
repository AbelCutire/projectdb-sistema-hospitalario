import { Request, Response } from 'express';
import prisma from '../config/database';

export const getAuditoria = async (req: Request, res: Response) => {
  try {
    const auditoria = await prisma.auditoria.findMany({
      include: {
        usuario: {
          include: {
            persona: true
          }
        }
      },
      orderBy: {
        fecha_hora: 'desc'
      },
      take: 100 // Últimos 100 registros
    });

    res.status(200).json(auditoria);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los registros de auditoría' });
  }
};
