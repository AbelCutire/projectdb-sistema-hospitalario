import { Router } from 'express';
import {
  getDiagnosticos,
  createDiagnostico,
  getDiagnosticoById,
  getDiagnosticosByCita
} from '../controllers/diagnosticoController';

const router = Router();

router.get('/', getDiagnosticos);
router.post('/', createDiagnostico);
router.get('/cita/:id_cita', getDiagnosticosByCita);
router.get('/:id', getDiagnosticoById);

export default router;
