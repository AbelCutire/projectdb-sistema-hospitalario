import { Router } from 'express';
import { getDiagnosticos, createDiagnostico, getDiagnosticoById } from '../controllers/diagnosticoController';

const router = Router();

router.get('/', getDiagnosticos);
router.post('/', createDiagnostico);
router.get('/:id', getDiagnosticoById);

export default router;
