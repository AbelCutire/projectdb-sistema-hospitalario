"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDoctorById = exports.createDoctor = exports.getDoctores = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDoctores = async (req, res) => {
    try {
        const doctores = await prisma.doctor.findMany({
            include: { empleado: true },
        });
        res.json(doctores);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener doctores' });
    }
};
exports.getDoctores = getDoctores;
const createDoctor = async (req, res) => {
    try {
        const nuevoDoctor = await prisma.doctor.create({
            data: req.body,
        });
        res.status(201).json(nuevoDoctor);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear doctor' });
    }
};
exports.createDoctor = createDoctor;
const getDoctorById = async (req, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = rawId ? parseInt(rawId, 10) : NaN;
        const doctor = await prisma.doctor.findUnique({
            where: { id_persona: id },
            include: { empleado: true },
        });
        res.json(doctor);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener doctor' });
    }
};
exports.getDoctorById = getDoctorById;
