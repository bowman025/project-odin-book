import { Router } from 'express';
import { apiLimiter } from '../../shared/config/rateLimiter.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  createMessage,
  deleteMessage,
  getConversations,
  getMessageHistory,
  startConversation,
  updateMessage,
} from './conversationController.js';

const router = Router();

router.use(apiLimiter);
router.use(authenticate);

router.get('/', getConversations);

router.post('/:username', startConversation);

router
  .route('/:conversationId/messages')
  .get(getMessageHistory)
  .post(createMessage);

router
  .route('/:conversationId/messages/:messageId')
  .patch(updateMessage)
  .delete(deleteMessage);

export { router as conversationRouter };
