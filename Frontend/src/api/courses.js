import api from '../lib/axios.js';

export const coursesAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  getStatus: (id) => api.get(`/courses/${id}/status`),
  getChapters: (id) => api.get(`/courses/${id}/chapters`),
  delete: (id) => api.delete(`/courses/${id}`),
  getTopics: (chapterId) => api.get(`/courses/chapters/${chapterId}/topics`),
  getLessons: (topicId) => api.get(`/courses/topics/${topicId}/lessons`),
  getLesson: (lessonId) => api.get(`/courses/lessons/${lessonId}`),
};
