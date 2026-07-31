import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { getTagSuggestions } from './tagController.js';

const router = Router();

router.use(apiLimiter);

router.get('/suggestions', authenticate, getTagSuggestions);

export { router as tagRouter };
