"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFarmacoById = exports.createFarmaco = exports.getFarmacos = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getFarmacos = async (req, res) => {
    try {
        const farmacos = await prisma.farmacia.findMany({
            include: { items_stock: true },
        });
        res.json(farmacos);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener fármacos' });
    }
};
exports.getFarmacos = getFarmacos;
const createFarmaco = async (req, res) => {
    try {
        const nuevoFarmaco = await prisma.farmacia.create({
            data: req.body,
        });
        res.status(201).json(nuevoFarmaco);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al crear fármaco' });
    }
};
exports.createFarmaco = createFarmaco;
const getFarmacoById = async (req, res) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = rawId ? parseInt(rawId, 10) : NaN;
        const farmaco = await prisma.farmacia.findUnique({
            where: { id_farmacia: id },
            include: { items_stock: true },
        });
        res.json(farmaco);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener fármaco' });
    }
};
exports.getFarmacoById = getFarmacoById;
