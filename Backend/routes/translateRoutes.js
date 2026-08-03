import express from 'express';
import { translateText, getSupportedLanguages, proxyTTS } from '../controllers/translateController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect); // All translation routes require auth

router.get('/languages', getSupportedLanguages);
router.get('/tts', proxyTTS);         // NEW: Google TTS audio proxy
router.post('/', translateText);

export default router;
