import { Router } from 'express';
import { getHospitalizaciones, registrarIngreso, darAlta, getSalasYCamillas } from '../controllers/hospitalizacionController';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
const nurseOrAdmin = roleMiddleware('Administrador', 'Enfermería');

router.get('/', nurseOrAdmin, getHospitalizaciones);
router.post('/', nurseOrAdmin, registrarIngreso);
router.put('/:id/alta', nurseOrAdmin, darAlta);
router.get('/salas', nurseOrAdmin, getSalasYCamillas);

export default router;
