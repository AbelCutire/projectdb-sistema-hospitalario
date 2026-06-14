import { Router } from 'express';
import { getDoctores, createDoctor, getDoctorById } from '../controllers/doctorController';

const router = Router();

router.get('/', getDoctores);
router.post('/', createDoctor);
router.get('/:id', getDoctorById);

export default router;
