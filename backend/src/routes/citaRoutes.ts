import { Router } from 'express';
import { getCitas, getCitaById, createCita, updateCita, cancelarCita } from '../controllers/citaController';

const router = Router();

router.get('/', getCitas);
router.get('/:id', getCitaById);
router.post('/', createCita);
router.put('/:id', updateCita);
router.put('/:id/cancelar', cancelarCita);

export default router;
