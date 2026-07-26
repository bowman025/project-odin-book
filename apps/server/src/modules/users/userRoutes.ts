import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import {
  authenticate,
  optionalAuthenticate,
} from '../../shared/middleware/authenticate.js';
import { getUserPosts } from '../posts/postController.js';
import {
  getProfile,
  getUserDirectory,
  updateProfile,
} from './userController.js';

const router = Router();

router.use(apiLimiter);

router.get('/', authenticate, getUserDirectory);
router.get('/:username/posts', optionalAuthenticate, getUserPosts);
router.get('/:username', optionalAuthenticate, getProfile);
router.patch('/me', authenticate, updateProfile);

export { router as userRouter };
