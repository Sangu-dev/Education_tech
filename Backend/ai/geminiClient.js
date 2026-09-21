import 'dotenv/config';
import logger from '../utils/logger.js';

// Supported Gemini / Gemma models on Google AI Studio
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const GEMINI_FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

const isGeminiModelUnavailable = (status, errMsg = '') => {
  const msg = (errMsg || '').toLowerCase();
  return (
    status === 404 ||
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('decommissioned') ||
    msg.includes('is not supported')
  );
};

/**
 * Get active Gemini / Gemma API key
 */
export const getGeminiApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.GEMMA_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key || key.includes('your_gemini_api') || key.includes('your_key_here')) {
    return null;
  }
  return key;
};

export const isGeminiConfigured = () => {
  return Boolean(getGeminiApiKey());
};

/**
 * Convert OpenAI-style messages array to Gemini REST API format
 */
function convertMessagesToGeminiFormat(messages = []) {
  let systemInstruction = null;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = {
        parts: [{ text: msg.content || '' }],
      };
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || '' }],
      });
    }
  }

  // Gemini requires at least one content entry
  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: '' }],
    });
  }

  return { systemInstruction, contents };
}

/**
 * Send a completion request to Google Gemini / Gemma API via native fetch
 * @param {Array} messages - Array of message objects [{role, content}]
 * @param {object} options - Options { model, temperature, maxTokens, jsonMode }
 * @param {number} retries - Number of retry attempts on rate limit
 * @returns {Promise<string>} AI response text
 */
export const geminiComplete = async (messages, options = {}, retries = 3) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GEMMA_API_KEY is not configured in Backend/.env');
  }

  const {
    model = DEFAULT_GEMINI_MODEL,
    temperature = 0.7,
    maxTokens = 8000,
    jsonMode = false,
  } = options;

  const { systemInstruction, contents } = convertMessagesToGeminiFormat(messages);

  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode && { responseMimeType: 'application/json' }),
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = {};
      try { parsedErr = JSON.parse(errText); } catch { /* ignore */ }
      const errMsg = parsedErr.error?.message || errText;

      // Automatically try fallback models if requested model is 404 or decommissioned
      if (isGeminiModelUnavailable(res.status, errMsg) && !options.__isFallback) {
        for (const fallbackModel of GEMINI_FALLBACK_MODELS) {
          if (fallbackModel !== model) {
            logger.warn(`Gemini model '${model}' unavailable (${errMsg}). Retrying with fallback model: ${fallbackModel}`);
            try {
              return await geminiComplete(messages, { ...options, model: fallbackModel, __isFallback: true }, retries);
            } catch (_fbErr) {
              continue;
            }
          }
        }
      }

      // Check for rate limit (429)
      if (res.status === 429 && retries > 0) {
        const waitMs = (4 - retries) * 5000;
        logger.warn(`Gemini rate limit hit (429). Retrying in ${waitMs / 1000}s... (${retries} retries left)`);
        await new Promise((r) => setTimeout(r, waitMs));
        return geminiComplete(messages, options, retries - 1);
      }

      throw new Error(`Gemini API error (${res.status}): ${errMsg}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response received from Gemini API');
    }

    logger.info(`Gemini completion: model=${model}`);
    return text;
  } catch (error) {
    logger.error(`Gemini complete error: ${error.message}`);
    throw error;
  }
};

/**
 * Stream a completion from Google Gemini (formatted to match Groq stream chunks)
 */
export async function* geminiStream(messages, options = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GEMMA_API_KEY is not configured in Backend/.env');
  }

  const {
    model = DEFAULT_GEMINI_MODEL,
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  const { systemInstruction, contents } = convertMessagesToGeminiFormat(messages);

  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini stream error (${res.status}): ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const data = JSON.parse(jsonStr);
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (content) {
              // Yield chunk format compatible with Groq/OpenAI response format
              yield {
                choices: [
                  {
                    delta: { content },
                  },
                ],
              };
            }
          } catch (_err) {
            /* ignore partial chunk */
          }
        }
      }
    }
  }
}
