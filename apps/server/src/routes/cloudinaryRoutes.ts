import { Router } from 'express';
import { uploadLimiter } from '../config/rateLimiter.js';
import { getUploadSignature } from '../controllers/cloudinaryController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.use(uploadLimiter);

router.get('/signature', getUploadSignature);

export { router as cloudinaryRouter };
