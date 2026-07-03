import { Router } from 'express';
import { apiLimiter } from '../config/rateLimiter.js';
import {
  createMessage,
  deleteMessage,
  getConversations,
  getMessageHistory,
  startConversation,
  updateMessage,
} from '../controllers/conversationController.js';
import { authenticate } from '../middleware/authenticate.js';

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
