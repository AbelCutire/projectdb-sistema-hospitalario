import { Request, Response } from 'express';

import prisma from '../config/database';

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

    // Registrar en auditoría
    const userId = (req as any).user?.id_usuario || null;
    const { logAction } = await import('../utils/auditService.js');
    await logAction(userId, 'ACTUALIZAR_ROL', 'usuario', `Se cambió el rol de persona ID: ${id_persona} a rol ID: ${id_rol}`);

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

// GET /persona/:id/detalles — Retorna absolutamente toda la información anidada de la persona
export const getPersonaDetalles = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const persona = await prisma.persona.findUnique({
      where: { id_persona: id },
      include: {
        usuario: { include: { rol: true } },
        paciente: {
          include: {
            historial_clinico: true,
            cita: { include: { doctor: { include: { especialidad: true, empleado: { include: { persona: true } } } }, consultorio: true }, orderBy: { fecha: 'desc' } },
            diagnostico: { include: { tratamiento: { include: { receta: { include: { detalle_receta: { include: { farmacia: true } } } } } } }, orderBy: { fecha: 'desc' } },
            ingreso_hospitalizacion: { include: { camilla: { include: { sala: true } } } },
            pago: true
          }
        },
        empleado: {
          include: {
            contrato: true,
            doctor: { include: { especialidad: true, cita: { include: { paciente: { include: { persona: true } } } } } },
            enfermera: { include: { turno: true } },
            personal_administrativo: true,
            personal_limpieza: { include: { turno: true } }
          }
        }
      }
    });

    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(persona);
  } catch (error) {
    console.error('Error al obtener detalles de la persona:', error);
    res.status(500).json({ error: 'Error al obtener detalles de la persona' });
  }
};

// DELETE /persona/:id — Eliminación en cascada manual de todos los datos
export const deletePersona = async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = rawId ? parseInt(rawId, 10) : NaN;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    await prisma.$transaction(async (tx) => {
      // Obtener el usuario asociado a esta persona (si existe)
      const user = await tx.usuario.findUnique({ where: { id_persona: id } });

      // 1. Si es paciente, borrar todo el rastro médico
      const paciente = await tx.paciente.findUnique({ where: { id_persona: id } });
      if (paciente) {
        await tx.pago.deleteMany({ where: { id_paciente: id } });
        
        const diags = await tx.diagnostico.findMany({ where: { id_paciente: id } });
        const diagIds = diags.map(d => d.id_diagnostico);
        if (diagIds.length > 0) {
          const trat = await tx.tratamiento.findMany({ where: { id_diagnostico: { in: diagIds } } });
          const tratIds = trat.map(t => t.id_tratamiento);
          if (tratIds.length > 0) {
            const rec = await tx.receta.findMany({ where: { id_tratamiento: { in: tratIds } } });
            const recIds = rec.map(r => r.id_receta);
            if (recIds.length > 0) {
              await tx.detalle_receta.deleteMany({ where: { id_receta: { in: recIds } } });
              await tx.receta.deleteMany({ where: { id_tratamiento: { in: tratIds } } });
            }
            await tx.tratamiento.deleteMany({ where: { id_diagnostico: { in: diagIds } } });
          }
          await tx.diagnostico.deleteMany({ where: { id_paciente: id } });
        }

        await tx.cita.deleteMany({ where: { id_paciente: id } });
        await tx.ingreso_hospitalizacion.deleteMany({ where: { id_paciente: id } });
        await tx.solicitud_acceso.deleteMany({ where: { id_paciente: id } });
        await tx.historial_clinico.deleteMany({ where: { id_paciente: id } });
        await tx.paciente.delete({ where: { id_persona: id } });
      }

      // 2. Si es doctor/empleado, borrar rastros
      const empleado = await tx.empleado.findUnique({ where: { id_persona: id } });
      if (empleado) {
        // Encontrar todas las citas de este doctor para borrar sus dependencias
        const doctorCitas = await tx.cita.findMany({ where: { id_doctor: id } });
        const citaIds = doctorCitas.map(c => c.id_cita);
        
        if (citaIds.length > 0) {
          const diags = await tx.diagnostico.findMany({ where: { id_cita: { in: citaIds } } });
          const diagIds = diags.map(d => d.id_diagnostico);
          if (diagIds.length > 0) {
            const trat = await tx.tratamiento.findMany({ where: { id_diagnostico: { in: diagIds } } });
            const tratIds = trat.map(t => t.id_tratamiento);
            if (tratIds.length > 0) {
              const rec = await tx.receta.findMany({ where: { id_tratamiento: { in: tratIds } } });
              const recIds = rec.map(r => r.id_receta);
              if (recIds.length > 0) {
                await tx.detalle_receta.deleteMany({ where: { id_receta: { in: recIds } } });
                await tx.receta.deleteMany({ where: { id_tratamiento: { in: tratIds } } });
              }
              await tx.tratamiento.deleteMany({ where: { id_diagnostico: { in: diagIds } } });
            }
            await tx.diagnostico.deleteMany({ where: { id_cita: { in: citaIds } } });
          }
          await tx.cita.deleteMany({ where: { id_doctor: id } });
        }

        await tx.doctor.deleteMany({ where: { id_persona: id } });
        await tx.enfermera.deleteMany({ where: { id_persona: id } });
        await tx.personal_administrativo.deleteMany({ where: { id_persona: id } });
        await tx.personal_limpieza.deleteMany({ where: { id_persona: id } });
        await tx.contrato.deleteMany({ where: { id_empleado: id } });
        await tx.empleado.delete({ where: { id_persona: id } });
      }

      // 3. Borrar rastro de usuario (y sus auditorías/solicitudes)
      if (user) {
        await tx.solicitud_acceso.deleteMany({ where: { OR: [{ id_doctor: user.id_usuario }, { id_admin: user.id_usuario }] } });
        await tx.auditoria.deleteMany({ where: { id_usuario: user.id_usuario } });
        await tx.usuario.delete({ where: { id_usuario: user.id_usuario } });
      }

      // 4. Finalmente, borrar la persona
      await tx.persona.delete({ where: { id_persona: id } });
    });

    const userId = (req as any).user?.id_usuario || null;
    const { logAction } = await import('../utils/auditService.js');
    await logAction(userId, 'ELIMINAR_PERSONA', 'persona', `Se eliminó en cascada a la persona con ID: ${id} y todos sus registros (citas canceladas, datos borrados)`);

    res.json({ message: 'Persona y todos sus datos eliminados correctamente' });
  } catch (error) {
    console.error('Error al eliminar persona:', error);
    res.status(500).json({ error: 'Error al eliminar la persona en cascada' });
  }
};
