import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import {
  createPost,
  deletePost,
  getPost,
  getTimeline,
  updatePost,
} from '../controllers/postController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(apiLimiter);

router.get('/', getTimeline);
router.post('/', authenticate, createPost);
router.get('/:id', getPost);
router.patch('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);

export { router as postRouter };
