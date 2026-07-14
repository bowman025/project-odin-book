import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { toggleLike } from './likeController.js';

const router = Router({ mergeParams: true });

router.use(apiLimiter);

router.post('/', authenticate, toggleLike);

export { router as likeRouter };
