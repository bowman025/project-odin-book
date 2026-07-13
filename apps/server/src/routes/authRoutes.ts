import { Router } from 'express';
import { authLimiter } from '../config/rateLimiter.js';
import {
  changePassword,
  deleteAccount,
  login,
  logout,
  refresh,
  register,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.patch('/change-password', authenticate, changePassword);
router.delete('/delete-account', authenticate, deleteAccount);

export { router as authRouter };
