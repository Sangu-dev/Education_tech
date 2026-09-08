import api from '../lib/axios.js';

export const translateAPI = {
  /**
   * Translate English text to an Indian language
   * @param {string} text - English text to translate
   * @param {string} targetLanguage - Language code: 'hi' | 'kn' | 'te' | 'ta' | 'ml'
   */
  translate: (text, targetLanguage) =>
    api.post('/translate', { text, targetLanguage }),

  /**
   * Get list of all supported Indian languages
   */
  getSupportedLanguages: () =>
    api.get('/translate/languages'),

  /**
   * Get the backend TTS proxy URL for a given text + language
   * Returns a URL string (audio/mpeg) that can be used directly in an <audio> element
   * @param {string} text - Text to speak (max 200 chars)
   * @param {string} lang - Language code: 'hi' | 'kn' | 'te' | 'ta' | 'ml'
   */
  getTTSUrl: (text, lang) => {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('accessToken');
    return `${baseURL}/translate/tts?text=${encodeURIComponent(text.slice(0, 200))}&lang=${lang}&token=${token}`;
  },
};

export default translateAPI;
