"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departamentoController_1 = require("../controllers/departamentoController");
const router = (0, express_1.Router)();
router.get('/', departamentoController_1.getDepartamentos);
router.post('/', departamentoController_1.createDepartamento);
router.get('/:id', departamentoController_1.getDepartamentoById);
exports.default = router;
