import { Router } from 'express';
import { authLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  changePassword,
  deleteAccount,
  login,
  logout,
  refresh,
  register,
} from './authController.js';

const router = Router();

router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.patch('/change-password', authenticate, changePassword);
router.delete('/delete-account', authenticate, deleteAccount);

export { router as authRouter };
