import { Router } from 'express';
import { getUploadSignature } from './cloudinaryController.js';
import { uploadLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.use(uploadLimiter);

router.get('/signature', getUploadSignature);

export { router as cloudinaryRouter };
