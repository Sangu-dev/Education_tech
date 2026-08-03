import api from '../lib/axios.js';

export const uploadAPI = {
  uploadPDF: (formData, onUploadProgress) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 120000, // 2 min for large PDFs
    }),
};
