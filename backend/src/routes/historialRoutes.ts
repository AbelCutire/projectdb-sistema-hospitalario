import { Router } from 'express';
import { getHistorialByPaciente, getAllHistoriales } from '../controllers/historialController';

const router = Router();

router.get('/', getAllHistoriales);
router.get('/:id_paciente', getHistorialByPaciente);

export default router;
