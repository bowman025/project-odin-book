import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import { createPost, getTimeline } from '../controllers/postController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(apiLimiter);

router.get('/', getTimeline);
router.post('/', authenticate, createPost);

export { router as postRouter };
