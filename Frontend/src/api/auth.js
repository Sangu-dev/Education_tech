import api from '../lib/axios.js';

export const authAPI = {
  register: (data) => api.post('/auth/register', data, { skipToast: true }),
  login: (data) => api.post('/auth/login', data, { skipToast: true }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password, confirmPassword) =>
    api.post(`/auth/reset-password/${token}`, { password, confirmPassword }),
};
