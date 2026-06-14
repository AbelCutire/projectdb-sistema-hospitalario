import { Router } from 'express';
import { getCitas, createCita, getCitaById, updateCita } from '../controllers/citaController';

const router = Router();

router.get('/', getCitas);
router.post('/', createCita);
router.get('/:id', getCitaById);
router.put('/:id', updateCita);

export default router;
