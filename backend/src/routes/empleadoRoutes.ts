import { Router } from 'express';
import { updateContrato } from '../controllers/empleadoController';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
const adminOnly = roleMiddleware('Administrador');

router.put('/:id_persona/contrato', adminOnly, updateContrato);

export default router;
