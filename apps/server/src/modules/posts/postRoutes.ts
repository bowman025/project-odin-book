import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import {
  authenticate,
  optionalAuthenticate,
} from '../../shared/middleware/authenticate.js';
import { commentRouter } from '../comments/commentRoutes.js';
import { likeRouter } from '../likes/likeRoutes.js';
import {
  createPost,
  deletePost,
  getGeneralTimeline,
  getPersonalTimeline,
  getPost,
  updatePost,
} from './postController.js';

const router = Router();

router.use(apiLimiter);

router.get('/', optionalAuthenticate, getGeneralTimeline);
router.get('/following', authenticate, getPersonalTimeline);

router.use('/:postId/comments', commentRouter);
router.use('/:postId/likes', likeRouter);

router.post('/', authenticate, createPost);

router
  .route('/:postId')
  .get(optionalAuthenticate, getPost)
  .patch(authenticate, updatePost)
  .delete(authenticate, deletePost);

export { router as postRouter };
