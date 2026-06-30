import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMedicamentos = async (req: Request, res: Response) => {
  try {
    const medicamentos = await prisma.medicamento.findMany({
      include: {
        accion_terapeutica: true,
        laboratorio_produccion: true,
        monodroga: true,
        stock: {
          include: {
            farmacia: true,
            presentacion: true,
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    res.json(medicamentos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener medicamentos' });
  }
};

export const getMedicamentoById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const codigo = parseInt(rawId as string, 10);

    const medicamento = await prisma.medicamento.findUnique({
      where: { codigo },
      include: {
        accion_terapeutica: true,
        laboratorio_produccion: true,
        monodroga: true,
        stock: {
          include: {
            farmacia: true,
            presentacion: true,
          }
        }
      }
    });

    if (!medicamento) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json(medicamento);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener medicamento' });
  }
};

export const getFarmacias = async (req: Request, res: Response) => {
  try {
    const farmacias = await prisma.farmacia.findMany({
      include: {
        items_stock: {
          include: {
            medicamento: {
              include: {
                accion_terapeutica: true,
                laboratorio_produccion: true,
                monodroga: true,
              }
            },
            presentacion: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
    res.json(farmacias);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener farmacias' });
  }
};
