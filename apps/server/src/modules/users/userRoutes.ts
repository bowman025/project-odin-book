import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  getProfile,
  getUserDirectory,
  updateProfile,
} from './userController.js';

const router = Router();

router.use(apiLimiter);

router.get('/', authenticate, getUserDirectory);
router.get('/:username', getProfile);
router.patch('/me', authenticate, updateProfile);

export { router as userRouter };
