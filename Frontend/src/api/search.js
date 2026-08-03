import api from '../lib/axios.js';

export const searchAPI = {
  search: (q, params) => api.get('/search', { params: { q, ...params } }),
};
