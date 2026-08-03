import api from '../lib/axios.js';

export const quizAPI = {
  generate: (courseId, chapterId) =>
    api.post('/quiz/generate', { courseId, chapterId }),
  getByChapter: (chapterId) => api.get(`/quiz/chapter/${chapterId}`),
  getById: (quizId) => api.get(`/quiz/${quizId}`),
  submit: (quizId, answers, timeTaken) =>
    api.post(`/quiz/${quizId}/submit`, { answers, timeTaken }),
  getAttempts: (courseId) => api.get(`/quiz/attempts/${courseId}`),
};
