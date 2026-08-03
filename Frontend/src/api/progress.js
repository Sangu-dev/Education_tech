import api from '../lib/axios.js';

export const progressAPI = {
  getAll: () => api.get('/progress'),
  getCourse: (courseId) => api.get(`/progress/${courseId}`),
  getCompleted: (courseId) => api.get(`/progress/${courseId}/lessons`),
  complete: (lessonId, timeSpent) =>
    api.post('/progress/complete', { lessonId, timeSpent }),
};
