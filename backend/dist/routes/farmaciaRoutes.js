"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const farmaciaController_1 = require("../controllers/farmaciaController");
const router = (0, express_1.Router)();
router.get('/', farmaciaController_1.getFarmacos);
router.post('/', farmaciaController_1.createFarmaco);
router.get('/:id', farmaciaController_1.getFarmacoById);
exports.default = router;
