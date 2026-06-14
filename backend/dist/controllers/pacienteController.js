"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaciente = exports.getPacientes = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getPacientes = async (req, res) => {
    try {
        const pacientes = await prisma.paciente.findMany();
        res.json(pacientes);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener pacientes' });
    }
};
exports.getPacientes = getPacientes;
const createPaciente = async (req, res) => {
    try {
        const nuevoPaciente = await prisma.paciente.create({
            data: req.body,
        });
        res.status(201).json(nuevoPaciente);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear paciente' });
    }
};
exports.createPaciente = createPaciente;
