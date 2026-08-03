import api from '../lib/axios.js';

export const chatAPI = {
  sendMessage: (courseId, message) =>
    api.post(`/chat/${courseId}`, { message }),
  getHistory: (courseId) => api.get(`/chat/${courseId}/history`),
  getAllChats: () => api.get('/chat'),
  clearChat: (chatId) => api.delete(`/chat/${chatId}`),
};
