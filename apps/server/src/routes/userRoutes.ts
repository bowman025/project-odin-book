import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import {
  getProfile,
  getUserDirectory,
  updateProfile,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(apiLimiter);

router.get('/', authenticate, getUserDirectory);
router.get('/:username', getProfile);
router.patch('/me', authenticate, updateProfile);

export { router as userRouter };
