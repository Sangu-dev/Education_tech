import api from '../lib/axios.js';

export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
  uploadAvatar: (formData) =>
    api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (data) => api.patch('/profile/password', data),
  deleteAccount: () => api.delete('/profile'),
};
