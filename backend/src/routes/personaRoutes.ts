import { Router } from 'express';
import { getPersonas, createPersona, getPersonaById, updatePersona, updateRolPersona, getRoles, getPersonaDetalles, deletePersona, getEspecialidades } from '../controllers/personaController';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const adminOnly = roleMiddleware('Administrador');
const adminOrDoctor = roleMiddleware('Administrador', 'Médico Especialista');

router.get('/roles',    authMiddleware, getRoles);
router.get('/especialidades', authMiddleware, getEspecialidades);
router.get('/',         adminOnly, getPersonas);
router.post('/',        adminOnly, createPersona);
router.get('/:id/detalles', adminOrDoctor, getPersonaDetalles);
router.get('/:id',      adminOnly, getPersonaById);
router.put('/:id',      updatePersona);
router.put('/:id/rol',  adminOnly, updateRolPersona);
router.delete('/:id',   adminOnly, deletePersona);

export default router;
