import { Router } from 'express';
import { login, me, register, requestPatientRegistration, verifyPatientRegistration, forgotPassword, showResetForm, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, me);

router.post('/register', register);
router.post('/register-request', requestPatientRegistration);
router.post('/register-verify', verifyPatientRegistration);
router.post('/forgot', forgotPassword);
router.get('/reset', showResetForm);
router.post('/reset', resetPassword);

export default router;
