import { Router } from 'express';
import { getPersonas, createPersona, getPersonaById, updatePersona, updateRolPersona, getRoles, getPersonaDetalles, deletePersona } from '../controllers/personaController.js';

const router = Router();

router.get('/roles',    getRoles);
router.get('/',         getPersonas);
router.post('/',        createPersona);
router.get('/:id/detalles', getPersonaDetalles);
router.get('/:id',      getPersonaById);
router.put('/:id',      updatePersona);
router.put('/:id/rol',  updateRolPersona);
router.delete('/:id',   deletePersona);

export default router;
