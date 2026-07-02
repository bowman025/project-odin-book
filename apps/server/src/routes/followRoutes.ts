import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import {
  acceptFollow,
  rejectFollow,
  toggleFollow,
} from '../controllers/followController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(apiLimiter);
router.use(authenticate);

router.post('/:username', toggleFollow);
router.patch('/requests/:requestId/accept', acceptFollow);
router.patch('/requests/:requestId/reject', rejectFollow);

export { router as followRouter };
