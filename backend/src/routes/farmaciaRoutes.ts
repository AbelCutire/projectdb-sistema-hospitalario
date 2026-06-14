import { Router } from 'express';
import { getFarmacos, createFarmaco, getFarmacoById } from '../controllers/farmaciaController';

const router = Router();

router.get('/', getFarmacos);
router.post('/', createFarmaco);
router.get('/:id', getFarmacoById);

export default router;
