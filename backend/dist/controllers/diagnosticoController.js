"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiagnosticoById = exports.createDiagnostico = exports.getDiagnosticos = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDiagnosticos = async (req, res) => {
    try {
        const diagnosticos = await prisma.diagnostico.findMany({
            include: { paciente: true, cita: true },
        });
        res.json(diagnosticos);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener diagnósticos' });
    }
};
exports.getDiagnosticos = getDiagnosticos;
const createDiagnostico = async (req, res) => {
    try {
        const nuevoDiagnostico = await prisma.diagnostico.create({
            data: req.body,
        });
        res.status(201).json(nuevoDiagnostico);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear diagnóstico' });
    }
};
exports.createDiagnostico = createDiagnostico;
const getDiagnosticoById = async (req, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = rawId ? parseInt(rawId, 10) : NaN;
        const diagnostico = await prisma.diagnostico.findUnique({
            where: { id_diagnostico: id },
            include: { paciente: true, cita: true },
        });
        res.json(diagnostico);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener diagnóstico' });
    }
};
exports.getDiagnosticoById = getDiagnosticoById;
