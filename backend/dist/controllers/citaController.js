"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCita = exports.getCitaById = exports.createCita = exports.getCitas = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getCitas = async (req, res) => {
    try {
        const citas = await prisma.cita.findMany({
            include: { doctor: true, paciente: true, consultorio: true },
        });
        res.json(citas);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener citas' });
    }
};
exports.getCitas = getCitas;
const createCita = async (req, res) => {
    try {
        const nuevaCita = await prisma.cita.create({
            data: req.body,
        });
        res.status(201).json(nuevaCita);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear cita' });
    }
};
exports.createCita = createCita;
const getCitaById = async (req, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = rawId ? parseInt(rawId, 10) : NaN;
        const cita = await prisma.cita.findUnique({
            where: { id_cita: id },
            include: { doctor: true, paciente: true, consultorio: true },
        });
        res.json(cita);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener cita' });
    }
};
exports.getCitaById = getCitaById;
const updateCita = async (req, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = rawId ? parseInt(rawId, 10) : NaN;
        const citaActualizada = await prisma.cita.update({
            where: { id_cita: id },
            data: req.body,
        });
        res.json(citaActualizada);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al actualizar cita' });
    }
};
exports.updateCita = updateCita;
