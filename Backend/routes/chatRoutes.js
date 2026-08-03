import express from 'express';
import {
  chat, getChatHistoryCtrl, getAllChats, clearChatCtrl,
} from '../controllers/chatController.js';
import { protect } from '../middlewares/auth.js';
import { chatLimiter } from '../config/rateLimiter.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllChats);
router.post('/:courseId', chatLimiter, chat);
router.get('/:courseId/history', getChatHistoryCtrl);
router.delete('/:chatId', clearChatCtrl);

export default router;
