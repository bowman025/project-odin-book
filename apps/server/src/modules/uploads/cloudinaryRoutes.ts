import { Router } from 'express';
import { uploadLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { getUploadSignature } from './cloudinaryController.js';

const router = Router();

router.use(authenticate);
router.use(uploadLimiter);

router.get('/signature', getUploadSignature);

export { router as cloudinaryRouter };
