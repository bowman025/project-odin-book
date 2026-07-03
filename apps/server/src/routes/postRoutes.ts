import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import {
  createPost,
  deletePost,
  getGeneralTimeline,
  getPersonalTimeline,
  getPost,
  updatePost,
} from '../controllers/postController.js';
import { authenticate } from '../middleware/authenticate.js';
import { commentRouter } from './commentRoutes.js';
import { likeRouter } from './likeRoutes.js';

const router = Router();

router.use(apiLimiter);

router.get('/', getGeneralTimeline);
router.get('/following', authenticate, getPersonalTimeline);

router.use('/:postId/comments', commentRouter);
router.use('/:postId/likes', likeRouter);

router.post('/', authenticate, createPost);

router
  .route('/:postId')
  .get(getPost)
  .patch(authenticate, updatePost)
  .delete(authenticate, deletePost);

export { router as postRouter };
