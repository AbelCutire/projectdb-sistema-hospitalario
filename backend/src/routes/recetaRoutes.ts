import { Router } from 'express';
import { getRecetas, createReceta, getRecetasByTratamiento } from '../controllers/recetaController';

const router = Router();

router.get('/', getRecetas);
router.post('/', createReceta);
router.get('/tratamiento/:id_tratamiento', getRecetasByTratamiento);

export default router;
