import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import { toggleLike } from '../controllers/likeController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router({ mergeParams: true });

router.use(apiLimiter);

router.post('/', authenticate, toggleLike);

export { router as likeRouter };
