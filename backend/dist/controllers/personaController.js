"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonaById = exports.createPersona = exports.getPersonas = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getPersonas = async (req, res) => {
    try {
        const rawSearch = req.query.search;
        const search = typeof rawSearch === 'string' ? rawSearch.trim() : '';
        const personas = await prisma.persona.findMany({
            where: search
                ? {
                    OR: [
                        { nombre: { contains: search, mode: 'insensitive' } },
                        { apellido: { contains: search, mode: 'insensitive' } },
                        { dni: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : undefined,
            orderBy: { id_persona: 'asc' },
        });
        res.json(personas);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener personas' });
    }
};
exports.getPersonas = getPersonas;
const createPersona = async (req, res) => {
    try {
        const nuevaPersona = await prisma.persona.create({
            data: req.body,
        });
        res.status(201).json(nuevaPersona);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear persona' });
    }
};
exports.createPersona = createPersona;
const getPersonaById = async (req, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = rawId ? parseInt(rawId, 10) : NaN;
        const persona = await prisma.persona.findUnique({
            where: { id_persona: id },
        });
        res.json(persona);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener persona' });
    }
};
exports.getPersonaById = getPersonaById;
