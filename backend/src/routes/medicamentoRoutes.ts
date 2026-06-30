import { Router } from 'express';
import { getMedicamentos, getMedicamentoById, getFarmacias } from '../controllers/medicamentoController';

const router = Router();

router.get('/', getMedicamentos);
router.get('/farmacias', getFarmacias);
router.get('/:id', getMedicamentoById);

export default router;
