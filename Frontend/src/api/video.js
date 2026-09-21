import api from '../lib/axios.js';

export const videoAPI = {
  generate: (lessonId, data = {}) => api.post(`/video/generate/${lessonId}`, data),
  getStatus: (lessonId) => api.get(`/video/status/${lessonId}`),
  regenerateScene: (lessonId, sceneId, data = {}) =>
    api.post(`/video/regenerate-scene/${lessonId}/${sceneId}`, data),
  getDownloadUrl: (lessonId) => {
    const base = import.meta.env.VITE_API_URL || '/api';
    return `${base}/video/download/${lessonId}`;
  },
};
