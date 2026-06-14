"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const diagnosticoController_1 = require("../controllers/diagnosticoController");
const router = (0, express_1.Router)();
router.get('/', diagnosticoController_1.getDiagnosticos);
router.post('/', diagnosticoController_1.createDiagnostico);
router.get('/:id', diagnosticoController_1.getDiagnosticoById);
exports.default = router;
