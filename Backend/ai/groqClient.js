import 'dotenv/config';
import Groq from 'groq-sdk';
import logger from '../utils/logger.js';
import { geminiComplete, geminiStream, isGeminiConfigured } from './geminiClient.js';
export { isGeminiConfigured };

// Default and Fast Groq Models available on GroqCloud
export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
export const FAST_GROQ_MODEL = 'openai/gpt-oss-20b';

// Priority order of fallback models on Groq if requested model is unavailable (404/decommissioned)
const GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'groq/compound',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
];

/**
 * Check if Groq (groq.com) API key is configured
 */
export const isGroqConfigured = () => {
  const key = process.env.GROQ_API_KEY;
  return Boolean(
    key &&
    key.trim() !== '' &&
    !key.includes('your_groq_api') &&
    key !== 'your_key_here' &&
    !key.startsWith('xai-')
  );
};

/**
 * Check if xAI Grok (x.ai) API key is configured
 */
export const isGrokConfigured = () => {
  const key = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  return Boolean(
    key &&
    key.trim() !== '' &&
    !key.includes('your_grok_api') &&
    !key.includes('your_xai_api') &&
    key !== 'your_key_here'
  );
};

/**
 * Get active Groq client instance dynamically
 */
export const getGroqClient = () => {
  const key = process.env.GROQ_API_KEY;
  if (!isGroqConfigured()) {
    throw new Error(
      'GROQ_API_KEY is missing or set to placeholder in Backend/.env. ' +
      'Please configure your Groq API key from https://console.groq.com/keys'
    );
  }
  return new Groq({ apiKey: key.trim() });
};

/**
 * Determine active AI provider: "groq" (default), "grok", or "gemini"
 */
export const getActiveProvider = () => {
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();

  if (provider === 'gemini' && isGeminiConfigured()) return 'gemini';
  if (provider === 'grok' && isGrokConfigured()) return 'grok';
  if (provider === 'groq' && isGroqConfigured()) return 'groq';

  // Auto detection priority: Grok (x.ai) -> Groq (groq.com) -> Gemini (Google)
  if (isGrokConfigured()) return 'grok';
  if (isGroqConfigured()) return 'groq';
  if (isGeminiConfigured()) return 'gemini';

  return 'none';
};

const isModelError = (err) => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.status === 404 ||
    (err.status === 400 && (msg.includes('decommissioned') || msg.includes('model') || msg.includes('does not exist'))) ||
    msg.includes('model_not_found') ||
    msg.includes('model_decommissioned') ||
    msg.includes('does not exist') ||
    msg.includes('not found') ||
    msg.includes('access to it')
  );
};

/**
 * Send a completion request to the active AI provider (GroqCloud by default)
 * @param {Array} messages - Array of message objects [{role, content}]
 * @param {object} options - Options { model, temperature, maxTokens, jsonMode }
 * @param {number} retries - Number of retry attempts on rate limit
 * @returns {Promise<string>} AI response text
 */
export const groqComplete = async (messages, options = {}, retries = 3) => {
  const activeProvider = getActiveProvider();

  // If Gemini provider is active
  if (activeProvider === 'gemini') {
    logger.info('Using Gemini provider for completion');
    return geminiComplete(messages, options, retries);
  }

  // If xAI Grok provider is active (when GROK_API_KEY is configured and Groq is not or grok is explicitly requested)
  if (activeProvider === 'grok') {
    return grokHttpComplete(messages, options, retries);
  }

  // If no provider key is configured
  if (!isGroqConfigured()) {
    throw new Error(
      'GROQ_API_KEY is missing or set to placeholder in Backend/.env. ' +
      'Please configure your Groq API key from https://console.groq.com/keys'
    );
  }

  // Use Groq SDK (Primary Provider)
  const client = getGroqClient();
  const {
    model = DEFAULT_GROQ_MODEL,
    temperature = 0.4,
    maxTokens = 8000,
    jsonMode = false,
  } = options;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response received from Groq API');
    }

    logger.info(`Groq completion successful: model=${model}, tokens=${completion.usage?.total_tokens || 'n/a'}`);
    return content;
  } catch (error) {
    // If the requested model is 404 or decommissioned, automatically try fallback models
    if (isModelError(error)) {
      const requestedModel = model;
      for (const fallbackModel of GROQ_FALLBACK_MODELS) {
        if (fallbackModel !== requestedModel) {
          logger.warn(`Groq model '${requestedModel}' unavailable (${error.message}). Retrying with fallback model '${fallbackModel}'...`);
          try {
            return await groqComplete(messages, { ...options, model: fallbackModel }, retries);
          } catch (fbErr) {
            if (isModelError(fbErr)) continue;
            throw fbErr;
          }
        }
      }
    }

    // Rate-limit retry handling (429 or 413)
    const isRateLimit = error.status === 429 || error.status === 413 ||
      error.message?.includes('rate_limit') || error.message?.includes('Request too large');

    if (isRateLimit && retries > 0) {
      const waitMs = (4 - retries) * 5000;
      logger.warn(`Groq rate limit hit. Retrying in ${waitMs / 1000}s... (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, waitMs));
      return groqComplete(messages, options, retries - 1);
    }

    logger.error(`Groq API error: ${error.message}`);
    throw error;
  }
};

/**
 * Stream a completion from the active AI provider (for real-time chat)
 */
export async function* groqStream(messages, options = {}) {
  const activeProvider = getActiveProvider();

  if (activeProvider === 'gemini') {
    yield* geminiStream(messages, options);
    return;
  }

  if (activeProvider === 'grok') {
    yield* grokHttpStream(messages, options);
    return;
  }

  if (!isGroqConfigured()) {
    throw new Error(
      'GROQ_API_KEY is missing in Backend/.env. Please configure your Groq API key from https://console.groq.com/keys'
    );
  }

  const client = getGroqClient();
  const {
    model = DEFAULT_GROQ_MODEL,
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  let stream;
  try {
    stream = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });
  } catch (error) {
    if (isModelError(error)) {
      const fallbackModel = GROQ_FALLBACK_MODELS.find(m => m !== model) || 'openai/gpt-oss-120b';
      logger.warn(`Model '${model}' unavailable for streaming. Retrying with fallback model '${fallbackModel}'...`);
      stream = await client.chat.completions.create({
        model: fallbackModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });
    } else {
      throw error;
    }
  }

  for await (const chunk of stream) {
    yield chunk;
  }
}

/**
/**
 * Resilient HTTP client for xAI Grok (https://api.x.ai/v1)
 */
async function grokHttpComplete(messages, options = {}, retries = 3) {
  const XAI_BASE_URL = process.env.GROK_BASE_URL || 'https://api.x.ai/v1';
  const apiKey = (process.env.GROK_API_KEY || process.env.XAI_API_KEY || '').trim();

  if (!apiKey) {
    if (isGroqConfigured()) {
      logger.warn('GROK_API_KEY is not configured. Automatically falling back to Groq Cloud API.');
      return groqComplete(messages, { ...options, __forceGroq: true }, retries);
    }
    if (isGeminiConfigured()) {
      logger.warn('GROK_API_KEY is not configured. Automatically falling back to Google Gemini API.');
      return geminiComplete(messages, options, retries);
    }
    throw new Error('xAI Grok API key is missing. Please set GROK_API_KEY in your Backend/.env file.');
  }

  const {
    model = process.env.GROK_MODEL || 'grok-2-1212',
    temperature = 0.4,
    maxTokens = 8000,
    jsonMode = false,
  } = options;

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  };

  try {
    const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });

    if (!response.ok) {
      const errText = await response.text();

      // Handle 429 Rate Limit with exponential backoff + jitter
      if (response.status === 429 && retries > 0) {
        const backoffMs = Math.min(30000, Math.pow(2, 4 - retries) * 1500 + Math.random() * 1000);
        logger.warn(`xAI Grok rate limit (429). Retrying in ${Math.round(backoffMs)}ms (${retries} retries remaining)...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        return grokHttpComplete(messages, options, retries - 1);
      }

      // If rate limited or quota exceeded and fallback is configured
      if (isGroqConfigured() && (response.status === 429 || response.status >= 500)) {
        logger.warn(`xAI Grok service unavailable (${response.status}). Falling back to Groq.`);
        return groqComplete(messages, { ...options, __forceGroq: true }, retries);
      }

      throw new Error(`xAI Grok API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response received from xAI Grok API');
    }
    return content;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      logger.warn('xAI Grok request timed out after 60s.');
      if (retries > 0) {
        return grokHttpComplete(messages, options, retries - 1);
      }
      if (isGroqConfigured()) {
        logger.warn('Falling back to Groq Cloud after xAI timeout.');
        return groqComplete(messages, { ...options, __forceGroq: true }, 2);
      }
    }
    throw error;
  }
}

async function* grokHttpStream(messages, options = {}) {
  const XAI_BASE_URL = process.env.GROK_BASE_URL || 'https://api.x.ai/v1';
  const apiKey = (process.env.GROK_API_KEY || process.env.XAI_API_KEY || '').trim();
  const {
    model = process.env.GROK_MODEL || 'grok-2-1212',
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: true }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`xAI Grok stream error (${response.status}): ${errText}`);
  }

  const reader = response.body.getReader();
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
        if (jsonStr === '[DONE]') return;
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr);
            yield data;
          } catch (_err) {
            /* ignore partial chunk */
          }
        }
      }
    }
  }
}

/**
 * Parse and repair JSON from AI response
 */
export const parseAIJson = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('parseAIJson received invalid or empty input');
  }

  // 1. Strip markdown codeblocks
  let cleaned = text
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .trim();

  const sanitize = (str) => {
    return str
      .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
      .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":') // quote unquoted keys
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"'); // convert single quotes
  };

  try {
    return JSON.parse(cleaned);
  } catch (_err) {
    try {
      return JSON.parse(sanitize(cleaned));
    } catch (_sErr) {
      // Attempt bracket stack repairs below
    }
  }

  // 2. Locate first JSON bracket/brace
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else {
    startIdx = firstBrace !== -1 ? firstBrace : firstBracket;
  }

  if (startIdx !== -1) {
    const candidate = cleaned.slice(startIdx);
    let inString = false;
    let isEscaped = false;
    const stack = [];

    for (let i = 0; i < candidate.length; i++) {
      const char = candidate[i];
      if (inString) {
        if (char === '\\') {
          isEscaped = !isEscaped;
        } else if (char === '"' && !isEscaped) {
          inString = false;
        } else {
          isEscaped = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{' || char === '[') {
          stack.push(char === '{' ? '}' : ']');
        } else if (char === '}' || char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === char) {
            stack.pop();
          }
        }
      }
    }

    let repaired = candidate;
    if (inString) repaired += '"';
    while (stack.length > 0) {
      const closing = stack.pop();
      repaired = repaired.replace(/,\s*$/, '') + closing;
    }

    try {
      const parsed = JSON.parse(repaired);
      logger.info('parseAIJson: successfully auto-repaired truncated JSON response');
      return parsed;
    } catch (_err) {
      try {
        const sanitizedRepaired = JSON.parse(sanitize(repaired));
        logger.info('parseAIJson: successfully auto-repaired and sanitized JSON response');
        return sanitizedRepaired;
      } catch (_err2) {
        /* ignore */
      }
    }
  }

  // 3. Fallback: salvage questions array if present
  try {
    const questionsMatch = text.match(/"questions"\s*:\s*(\[[\s\S]*?\])\s*[},]?/)
      || text.match(/"questions"\s*:\s*(\[[\s\S]*)/);
    if (questionsMatch) {
      const rawArr = questionsMatch[1];
      const completeQuestions = [];
      const qRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      let match;
      while ((match = qRegex.exec(rawArr)) !== null) {
        try {
          completeQuestions.push(JSON.parse(match[0]));
        } catch (_err) {
          /* skip malformed question */
        }
      }
      if (completeQuestions.length > 0) {
        logger.warn(`parseAIJson: truncated JSON salvaged ${completeQuestions.length} questions`);
        return { questions: completeQuestions };
      }
    }
  } catch (_err) {
    /* ignore fallback error */
  }

  throw new Error('Failed to parse AI JSON response');
};

// Full compatibility exports for both groq* and grok* naming
export const grokComplete = groqComplete;
export const grokStream = groqStream;
export const DEFAULT_MODEL = DEFAULT_GROQ_MODEL;
export const FAST_MODEL = FAST_GROQ_MODEL;

export default groqComplete;
