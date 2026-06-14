"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const personaController_1 = require("../controllers/personaController");
const router = (0, express_1.Router)();
router.get('/', personaController_1.getPersonas);
router.post('/', personaController_1.createPersona);
router.get('/:id', personaController_1.getPersonaById);
exports.default = router;
