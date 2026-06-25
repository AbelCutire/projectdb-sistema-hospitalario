import { Router } from 'express';
import {
  getSolicitudes,
  getSolicitudesByDoctor,
  createSolicitud,
  responderSolicitud
} from '../controllers/solicitudController';

const router = Router();

router.get('/',                        getSolicitudes);
router.get('/doctor/:id_usuario',      getSolicitudesByDoctor);
router.post('/',                       createSolicitud);
router.put('/:id',                     responderSolicitud);

export default router;
