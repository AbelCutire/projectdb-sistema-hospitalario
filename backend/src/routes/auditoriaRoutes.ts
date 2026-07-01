import { Router } from 'express';
import { getAuditoria } from '../controllers/auditoriaController';

const router = Router();

router.get('/', getAuditoria);

export default router;
