import { grokComplete } from '../ai/grokClient.js';
import { asyncHandler, sendSuccess, createError } from '../utils/responseHelper.js';
import https from 'https';

// Supported Indian languages
const SUPPORTED_LANGUAGES = {
  hi: { name: 'Hindi',     nativeName: 'हिन्दी',    locale: 'hi-IN', gtts: 'hi' },
  kn: { name: 'Kannada',   nativeName: 'ಕನ್ನಡ',    locale: 'kn-IN', gtts: 'kn' },
  te: { name: 'Telugu',    nativeName: 'తెలుగు',    locale: 'te-IN', gtts: 'te' },
  ta: { name: 'Tamil',     nativeName: 'தமிழ்',     locale: 'ta-IN', gtts: 'ta' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം',   locale: 'ml-IN', gtts: 'ml' },
};

/**
 * @desc   Translate lesson text to an Indian language
 * @route  POST /api/translate
 * @access Private
 */
export const translateText = asyncHandler(async (req, res) => {
  const { text, targetLanguage } = req.body;

  // Validate inputs
  if (!text || typeof text !== 'string') {
    throw createError('text is required and must be a string', 400);
  }
  if (!targetLanguage || !SUPPORTED_LANGUAGES[targetLanguage]) {
    throw createError(
      `targetLanguage must be one of: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
      400
    );
  }

  const lang = SUPPORTED_LANGUAGES[targetLanguage];

  // Trim text to a reasonable size (TTS doesn't need more than ~1500 chars per slide)
  const trimmedText = text.slice(0, 1500);

  const messages = [
    {
      role: 'system',
      content: `You are an expert educational translator. Translate the given English text into ${lang.name} (${lang.nativeName}).

Rules:
- Translate ONLY the content — do not add any explanation, notes, or extra text.
- Keep technical terms (programming keywords, math symbols, scientific names) in English but pronounce them naturally within the ${lang.name} sentence.
- Make the translation sound natural and conversational, as if a teacher is explaining to a student.
- Preserve sentence structure and meaning accurately.
- Output ONLY the translated text, nothing else.`,
    },
    {
      role: 'user',
      content: trimmedText,
    },
  ];

  const translatedText = await grokComplete(messages, {
    temperature: 0.3,
    maxTokens: 2000,
  });

  sendSuccess(res, {
    translatedText: translatedText.trim(),
    targetLanguage,
    languageName: lang.name,
    locale: lang.locale,
  }, 'Translation successful');
});

/**
 * @desc   Proxy Google TTS audio for Indian languages
 * @route  GET /api/translate/tts?text=...&lang=hi
 * @access Private
 *
 * Google TTS is used because Web Speech API voices for kn/te/ta/ml
 * are not available on most Windows systems.
 */
export const proxyTTS = asyncHandler(async (req, res) => {
  const { text, lang } = req.query;

  if (!text) throw createError('text query param is required', 400);
  if (!lang || !SUPPORTED_LANGUAGES[lang]) {
    throw createError(`lang must be one of: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`, 400);
  }

  const gttsLang = SUPPORTED_LANGUAGES[lang].gtts;
  // Limit to 200 chars per request (Google TTS limit)
  const safeText = text.slice(0, 200);

  const encoded = encodeURIComponent(safeText);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${gttsLang}&client=tw-ob&ttsspeed=0.9`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/',
    },
  };

  const gttsReq = https.get(url, options, (gttsRes) => {
    if (gttsRes.statusCode !== 200) {
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: 'TTS service unavailable' });
      }
      return;
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    gttsRes.pipe(res);
  });

  gttsReq.setTimeout(10000, () => {
    gttsReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ success: false, message: 'TTS request timed out' });
    }
  });

  gttsReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'TTS proxy error: ' + err.message });
    }
  });

  req.on('close', () => {
    if (!gttsReq.destroyed) {
      gttsReq.destroy();
    }
  });
});

/**
 * @desc   Get list of supported Indian languages
 * @route  GET /api/translate/languages
 * @access Private
 */
export const getSupportedLanguages = asyncHandler(async (req, res) => {
  const languages = Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
    code,
    ...info,
  }));
  sendSuccess(res, { languages }, 'Supported languages fetched');
});
