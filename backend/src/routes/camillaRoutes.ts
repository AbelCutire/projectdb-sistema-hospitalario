import { Router } from 'express';
import { getCamillas, updateCamilla } from '../controllers/camillaController';

const router = Router();

router.get('/', getCamillas);
router.put('/:id', updateCamilla);

export default router;
