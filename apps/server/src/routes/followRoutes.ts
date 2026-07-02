import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import {
  acceptFollow,
  getFollowers,
  getFollowing,
  getPendingRequests,
  rejectFollow,
  toggleFollow,
} from '../controllers/followController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(apiLimiter);

router.get('/:username/followers', getFollowers);
router.get('/:username/following', getFollowing);

router.use(authenticate);

router.get('/requests', getPendingRequests);
router.patch('/requests/:requestId/accept', acceptFollow);
router.patch('/requests/:requestId/reject', rejectFollow);

router.post('/:username', toggleFollow);

export { router as followRouter };
