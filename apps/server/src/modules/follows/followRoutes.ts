import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  acceptFollow,
  getFollowers,
  getFollowing,
  getPendingRequests,
  rejectFollow,
  revokeFollow,
  toggleFollow,
} from './followController.js';

const router = Router();

router.use(apiLimiter);

router.get('/:username/followers', getFollowers);
router.get('/:username/following', getFollowing);

router.use(authenticate);

router.get('/requests', getPendingRequests);
router.patch('/requests/:requestId/accept', acceptFollow);
router.patch('/requests/:requestId/reject', rejectFollow);
router.patch('/requests/:requestId/revoke', revokeFollow);

router.post('/:username', toggleFollow);

export { router as followRouter };
