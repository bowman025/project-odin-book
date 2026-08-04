import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import {
  authenticate,
  optionalAuthenticate,
} from '../../shared/middleware/authenticate.js';
import { getUserPosts } from '../posts/postController.js';
import {
  getProfile,
  getUserComments,
  getUserDirectory,
  getUserLikes,
  updateProfile,
} from './userController.js';

const router = Router();

router.use(apiLimiter);

router.get('/', authenticate, getUserDirectory);
router.get('/:username/posts', optionalAuthenticate, getUserPosts);
router.get('/:username/comments', optionalAuthenticate, getUserComments);
router.get('/:username/likes', optionalAuthenticate, getUserLikes);

router.get('/:username', optionalAuthenticate, getProfile);
router.patch('/me', authenticate, updateProfile);

export { router as userRouter };
