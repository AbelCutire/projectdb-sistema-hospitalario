import { Router } from 'express';
import {
  getTratamientosByDiagnostico,
  createTratamiento,
  getTratamientoById
} from '../controllers/tratamientoController';

const router = Router();

router.get('/diagnostico/:id_diagnostico', getTratamientosByDiagnostico);
router.post('/', createTratamiento);
router.get('/:id', getTratamientoById);

export default router;
