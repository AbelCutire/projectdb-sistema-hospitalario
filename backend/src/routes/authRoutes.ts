import { Router } from 'express';
import { login, me, register, forgotPassword, showResetForm, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, me);

router.post('/register', register);
router.post('/forgot', forgotPassword);
router.get('/reset', showResetForm);
router.post('/reset', resetPassword);

export default router;
