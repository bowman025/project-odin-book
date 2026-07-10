import { Router } from 'express';
import { authLimiter } from '../config/rateLimiter.js';
import {
  changePassword,
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
router.post('/logout', logout);
router.patch('/change-password', authenticate, changePassword);

export { router as authRouter };
