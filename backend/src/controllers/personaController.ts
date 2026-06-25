import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /persona — incluye usuario+rol para que el admin vea el tipo de cada persona
export const getPersonas = async (req: Request, res: Response) => {
  try {
    const rawSearch = req.query.search;
    const search = typeof rawSearch === 'string' ? rawSearch.trim() : '';

    const personas = await prisma.persona.findMany({
      where: search
        ? {
            OR: [
              { nombre:   { contains: search, mode: 'insensitive' } },
              { apellido: { contains: search, mode: 'insensitive' } },
              { dni:      { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        usuario: {
          include: { rol: true }
        },
        empleado: {
          include: {
            doctor: { include: { especialidad: true } },
            enfermera: true,
            personal_administrativo: true
          }
        },
        paciente: true
      },
      orderBy: { id_persona: 'asc' },
    });

    res.json(personas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener personas' });
  }
};

export const createPersona = async (req: Request, res: Response) => {
  try {
    const nuevaPersona = await prisma.persona.create({
      data: req.body,
    });
    res.status(201).json(nuevaPersona);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear persona' });
  }
};

export const getPersonaById = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    const persona = await prisma.persona.findUnique({
      where: { id_persona: id },
      include: {
        usuario: { include: { rol: true } }
      }
    });
    res.json(persona);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener persona' });
  }
};

export const updatePersona = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { nombre, apellido, dni, telefono, direccion, sexo, fecha_nacimiento } = req.body;

    const personaActualizada = await prisma.persona.update({
      where: { id_persona: id },
      data: {
        nombre,
        apellido,
        dni,
        telefono,
        direccion,
        sexo,
        fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : undefined,
      },
    });

    res.json(personaActualizada);
  } catch (error) {
    console.error('updatePersona error:', error);
    res.status(500).json({ error: 'Error al actualizar persona' });
  }
};

// PUT /persona/:id/rol — Cambiar el rol del usuario asociado a esta persona
export const updateRolPersona = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id_persona = rawId ? parseInt(rawId, 10) : NaN;
    const { id_rol } = req.body;

    if (isNaN(id_persona) || !id_rol) {
      return res.status(400).json({ error: 'id_persona e id_rol son requeridos' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id_persona } });
    if (!usuario) {
      return res.status(404).json({ error: 'Esta persona no tiene una cuenta de usuario' });
    }

    const rolDestino = await prisma.rol.findUnique({ where: { id_rol: Number(id_rol) } });

    const actualizado = await prisma.usuario.update({
      where: { id_persona },
      data:  { id_rol: Number(id_rol) },
      include: { rol: true }
    });

    // Auto-completar tablas dependientes si el rol cambia y no existen
    if (rolDestino?.nombre_rol === 'Médico Especialista') {
      const emp = await prisma.empleado.findUnique({ where: { id_persona } });
      if (!emp) {
        await prisma.empleado.create({
          data: { id_persona, codigo_empleado: `EMP-DOC-${id_persona}`, fecha_ingreso: new Date(), estado_laboral: 'Activo' }
        });
      }
      const doc = await prisma.doctor.findUnique({ where: { id_persona } });
      if (!doc) {
        await prisma.doctor.create({
          data: { id_persona, numero_colegiatura: `CMP-${id_persona}00`, id_especialidad: 1 } // Especialidad por defecto
        });
      }
    } else if (rolDestino?.nombre_rol === 'Paciente') {
      const pac = await prisma.paciente.findUnique({ where: { id_persona } });
      if (!pac) {
        await prisma.paciente.create({
          data: { id_persona, grupo_sanguineo: 'Por definir', alergias: 'Ninguna', peso: 0, altura: 0, contacto_emergencia: 'Por definir', antecedentes_medicos: 'Ninguno', estado_paciente: 'Estable' }
        });
      }
    } else if (rolDestino?.nombre_rol === 'Enfermería') {
      const emp = await prisma.empleado.findUnique({ where: { id_persona } });
      if (!emp) {
        await prisma.empleado.create({
          data: { id_persona, codigo_empleado: `EMP-ENF-${id_persona}`, fecha_ingreso: new Date(), estado_laboral: 'Activo' }
        });
      }
      const enf = await prisma.enfermera.findUnique({ where: { id_persona } });
      if (!enf) {
        await prisma.enfermera.create({ data: { id_persona, id_turno: 1 } });
      }
    }

    res.json(actualizado);
  } catch (error) {
    console.error('updateRolPersona error:', error);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

// GET /persona/roles — lista de roles disponibles
export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.rol.findMany({ orderBy: { id_rol: 'asc' } });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};
