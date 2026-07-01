import { Request, Response } from 'express';

import prisma from '../config/database';

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

export const getMetadataFormulario = async (req: Request, res: Response) => {
  try {
    const [acciones, monodrogas, laboratorios, presentaciones, farmacias] = await Promise.all([
      prisma.accion_terapeutica.findMany({ orderBy: { tipo: 'asc' } }),
      prisma.monodroga.findMany({ orderBy: { descripcion: 'asc' } }),
      prisma.laboratorio_produccion.findMany({ orderBy: { descripcion: 'asc' } }),
      prisma.presentacion.findMany({ orderBy: { descripcion: 'asc' } }),
      prisma.farmacia.findMany({ orderBy: { nombre: 'asc' } })
    ]);

    res.json({
      acciones,
      monodrogas,
      laboratorios,
      presentaciones,
      farmacias
    });
  } catch (error) {
    console.error('Error al obtener metadatos de medicamento:', error);
    res.status(500).json({ error: 'Error interno al obtener metadatos.' });
  }
};

export const createMedicamento = async (req: Request, res: Response) => {
  const { 
    nombre, 
    descripcion, 
    id_accion_terapeutica, 
    id_monodroga, 
    codigo_laboratorio,
    stock // opcional: { id_farmacia, codigo_presentacion, cantidad }
  } = req.body;

  try {
    const nuevoMedicamento = await prisma.$transaction(async (tx) => {
      // 1. Crear el medicamento en el catálogo
      const med = await tx.medicamento.create({
        data: {
          nombre,
          descripcion,
          id_accion_terapeutica: Number(id_accion_terapeutica),
          id_monodroga: Number(id_monodroga),
          codigo_laboratorio: Number(codigo_laboratorio)
        }
      });

      // 2. Si se proporcionó stock inicial, crearlo asociado al nuevo medicamento
      if (stock && stock.id_farmacia && stock.codigo_presentacion && stock.cantidad) {
        await tx.stock.create({
          data: {
            id_farmacia: Number(stock.id_farmacia),
            codigo_medicamento: med.codigo,
            codigo_presentacion: Number(stock.codigo_presentacion),
            cantidad: Number(stock.cantidad)
          }
        });
      }

      return med;
    });

    res.status(201).json(nuevoMedicamento);
  } catch (error) {
    console.error('Error al crear medicamento:', error);
    res.status(500).json({ error: 'Error interno al crear medicamento.' });
  }
};
