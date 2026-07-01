import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router({ mergeParams: true });

router.use(apiLimiter);

router.get('/', getComments);
router.post('/', authenticate, createComment);
router.patch('/:id', authenticate, updateComment);
router.delete('/:id', authenticate, deleteComment);

export { router as commentRouter };
