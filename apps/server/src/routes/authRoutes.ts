import { Router } from 'express';
import { authLimiter } from '../config/rateLimiter.js';
import {
  login,
  logout,
  refresh,
  register,
} from '../controllers/authController.js';

const router = Router();

router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export { router as authRouter };
