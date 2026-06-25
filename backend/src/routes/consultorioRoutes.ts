import { Router } from 'express';
import { getConsultorios } from '../controllers/consultorioController';

const router = Router();

router.get('/', getConsultorios);

export default router;
