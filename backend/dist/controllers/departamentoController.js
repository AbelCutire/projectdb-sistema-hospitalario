"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartamentoById = exports.createDepartamento = exports.getDepartamentos = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDepartamentos = async (req, res) => {
    try {
        const departamentos = await prisma.departamento.findMany({
            include: { consultorio: true, sala: true },
        });
        res.json(departamentos);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener departamentos' });
    }
};
exports.getDepartamentos = getDepartamentos;
const createDepartamento = async (req, res) => {
    try {
        const nuevoDepartamento = await prisma.departamento.create({
            data: req.body,
        });
        res.status(201).json(nuevoDepartamento);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear departamento' });
    }
};
exports.createDepartamento = createDepartamento;
const getDepartamentoById = async (req, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = rawId ? parseInt(rawId, 10) : NaN;
        const departamento = await prisma.departamento.findUnique({
            where: { id_departamento: id },
            include: { consultorio: true, sala: true },
        });
        res.json(departamento);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener departamento' });
    }
};
exports.getDepartamentoById = getDepartamentoById;
