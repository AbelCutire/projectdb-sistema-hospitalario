"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pacienteController_1 = require("../controllers/pacienteController");
const router = (0, express_1.Router)();
router.get('/', pacienteController_1.getPacientes);
router.post('/', pacienteController_1.createPaciente);
exports.default = router;
