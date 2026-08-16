import { Router } from 'express';
import { authLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  changePassword,
  deleteAccount,
  getAuthDetails,
  githubOAuthCallback,
  guestLogin,
  login,
  logout,
  refresh,
  register,
} from './authController.js';

const router = Router();

router.use(authLimiter);

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/guest', guestLogin);
router.post('/github', githubOAuthCallback);
router.patch('/change-password', authenticate, changePassword);
router.delete('/delete-account', authenticate, deleteAccount);
router.get('/me/details', authenticate, getAuthDetails);

export { router as authRouter };
