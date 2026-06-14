"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const doctorController_1 = require("../controllers/doctorController");
const router = (0, express_1.Router)();
router.get('/', doctorController_1.getDoctores);
router.post('/', doctorController_1.createDoctor);
router.get('/:id', doctorController_1.getDoctorById);
exports.default = router;
