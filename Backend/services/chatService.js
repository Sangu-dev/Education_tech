import Chat from '../models/Chat.js';
import Course from '../models/Course.js';
import { retrieveRelevantContext } from '../rag/retriever.js';
import { buildChatSystemPrompt, buildChatPrompt } from '../ai/prompts/chatPrompt.js';
import { grokComplete, grokStream } from '../ai/grokClient.js';
import { createError } from '../utils/responseHelper.js';

/**
 * Get or create a chat session for user+course
 */
export const getOrCreateChat = async (userId, courseId) => {
  let chat = await Chat.findOne({ userId, courseId, isActive: true })
    .sort({ createdAt: -1 });

  if (!chat) {
    const course = await Course.findById(courseId);
    if (!course) throw createError('Course not found', 404);

    chat = await Chat.create({
      userId,
      courseId,
      title: `Chat about ${course.title}`,
      messages: [],
    });
  }

  return chat;
};

/**
 * Send a message and get AI response
 */
export const sendMessage = async (userId, courseId, userMessage, streaming = false) => {
  // Get course info
  const course = await Course.findById(courseId);
  if (!course) throw createError('Course not found', 404);
  if (course.userId.toString() !== userId.toString()) {
    throw createError('Access denied', 403);
  }

  // Get or create chat
  const chat = await getOrCreateChat(userId, courseId);

  // Add user message
  chat.messages.push({
    role: 'user',
    content: userMessage,
  });

  // Retrieve relevant context from RAG
  const collectionName = course.vectorCollectionId || courseId.toString();
  const relevantChunks = await retrieveRelevantContext(userMessage, collectionName, 5);

  // Build messages for Groq
  const systemPrompt = buildChatSystemPrompt(course.title, course.difficulty);
  const historyMessages = chat.messages
    .slice(-10)
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...buildChatPrompt(userMessage, relevantChunks, historyMessages.slice(0, -1)),
  ];

  let assistantContent = '';

  if (streaming) {
    // Return stream for SSE
    const stream = await grokStream(chatMessages, { temperature: 0.7, maxTokens: 2000 });
    return { stream, chat };
  } else {
    // Non-streaming
    assistantContent = await grokComplete(chatMessages, { temperature: 0.7, maxTokens: 2000 });
  }

  // Save assistant message
  chat.messages.push({
    role: 'assistant',
    content: assistantContent,
    metadata: {
      retrievedChunks: relevantChunks.map(c => c.substring(0, 100)),
      model: process.env.GROQ_MODEL || process.env.GROK_MODEL || 'openai/gpt-oss-120b',
    },
  });

  chat.totalMessages = chat.messages.length;
  await chat.save();

  return {
    message: assistantContent,
    chatId: chat._id,
    retrievedContext: relevantChunks.length,
  };
};

/**
 * Get chat history for a user+course
 */
export const getChatHistory = async (userId, courseId) => {
  const chats = await Chat.find({ userId, courseId })
    .sort({ createdAt: -1 })
    .limit(10);
  return chats;
};

/**
 * Clear chat history
 */
export const clearChat = async (userId, chatId) => {
  const chat = await Chat.findOne({ _id: chatId, userId });
  if (!chat) throw createError('Chat not found', 404);

  chat.messages = [];
  chat.totalMessages = 0;
  await chat.save();
  return chat;
};

/**
 * Get all chats for a user
 */
export const getUserChats = async (userId) => {
  return Chat.find({ userId })
    .populate('courseId', 'title thumbnail')
    .sort({ updatedAt: -1 })
    .limit(20);
};
