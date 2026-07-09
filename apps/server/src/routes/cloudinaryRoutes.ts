import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import { getUploadSignature } from '../controllers/cloudinaryController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(apiLimiter);
router.use(authenticate);

router.get('/signature', getUploadSignature);

export { router as cloudinaryRouter };
