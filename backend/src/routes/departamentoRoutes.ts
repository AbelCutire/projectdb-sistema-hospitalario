import { Router } from 'express';
import { getDepartamentos, createDepartamento, getDepartamentoById } from '../controllers/departamentoController';

const router = Router();

router.get('/', getDepartamentos);
router.post('/', createDepartamento);
router.get('/:id', getDepartamentoById);

export default router;
