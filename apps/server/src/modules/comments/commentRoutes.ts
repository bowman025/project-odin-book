import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from './commentController.js';

const router = Router({ mergeParams: true });

router.use(apiLimiter);

router.route('/').get(getComments).post(authenticate, createComment);

router
  .route('/:commentId')
  .patch(authenticate, updateComment)
  .delete(authenticate, deleteComment);

export { router as commentRouter };
