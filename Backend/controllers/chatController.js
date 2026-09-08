import {
  sendMessage,
  getChatHistory,
  clearChat,
  getUserChats,
} from '../services/chatService.js';
import { asyncHandler, sendSuccess } from '../utils/responseHelper.js';

// @desc   Send message to AI chatbot
// @route  POST /api/chat/:courseId
// @access Private
export const chat = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { message, stream = false } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  if (stream) {
    // Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    const { stream: groqStream, chat } = await sendMessage(
      req.user._id,
      courseId,
      message,
      true
    );

    let fullContent = '';

    for await (const chunk of groqStream) {
      if (clientDisconnected) break;
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        res.write(`data: ${JSON.stringify({ content, chatId: chat._id })}\n\n`);
      }
    }

    if (!clientDisconnected) {
      // Save final message
      chat.messages.push({ role: 'assistant', content: fullContent });
      chat.totalMessages = chat.messages.length;
      await chat.save();

      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    const result = await sendMessage(req.user._id, courseId, message, false);
    sendSuccess(res, result, 'Message sent');
  }
});

// @desc   Get chat history for a course
// @route  GET /api/chat/:courseId/history
// @access Private
export const getChatHistoryCtrl = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const chats = await getChatHistory(req.user._id, courseId);
  sendSuccess(res, { chats }, 'Chat history fetched');
});

// @desc   Get all chats for user
// @route  GET /api/chat
// @access Private
export const getAllChats = asyncHandler(async (req, res) => {
  const chats = await getUserChats(req.user._id);
  sendSuccess(res, { chats }, 'Chats fetched');
});

// @desc   Clear chat history
// @route  DELETE /api/chat/:chatId
// @access Private
export const clearChatCtrl = asyncHandler(async (req, res) => {
  const chat = await clearChat(req.user._id, req.params.chatId);
  sendSuccess(res, { chat }, 'Chat cleared');
});
