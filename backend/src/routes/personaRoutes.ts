import { Router } from 'express';
import { getPersonas, createPersona, getPersonaById, updatePersona, updateRolPersona, getRoles } from '../controllers/personaController';

const router = Router();

router.get('/roles',    getRoles);
router.get('/',         getPersonas);
router.post('/',        createPersona);
router.get('/:id',      getPersonaById);
router.put('/:id',      updatePersona);
router.put('/:id/rol',  updateRolPersona);

export default router;
