import { Router } from 'express';
import { getPersonas, createPersona, getPersonaById } from '../controllers/personaController';

const router = Router();

router.get('/', getPersonas);
router.post('/', createPersona);
router.get('/:id', getPersonaById);

export default router;
