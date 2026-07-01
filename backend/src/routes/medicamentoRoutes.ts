import { Router } from 'express';
import { 
  getMedicamentos, 
  getMedicamentoById, 
  getFarmacias, 
  getMetadataFormulario, 
  createMedicamento,
  updateMedicamento,
  deleteMedicamento
} from '../controllers/medicamentoController';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

router.get('/metadata', getMetadataFormulario);
router.get('/', getMedicamentos);
router.get('/farmacias', getFarmacias);
router.get('/:id', getMedicamentoById);

router.post('/', roleMiddleware('Administrador', 'Farmacéutico'), createMedicamento);
router.put('/:id', roleMiddleware('Administrador', 'Farmacéutico'), updateMedicamento);
router.delete('/:id', roleMiddleware('Administrador', 'Farmacéutico'), deleteMedicamento);

export default router;
