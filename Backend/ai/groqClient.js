import Groq from 'groq-sdk';
import logger from '../utils/logger.js';

const apiKey = process.env.GROQ_API_KEY;

// Models - use env var or verified working defaults
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'groq/compound';
const FAST_MODEL = 'groq/compound-mini';

// Initialize Groq client ONLY if key exists.
// This prevents the whole backend from crashing at import-time.
const groq = apiKey
  ? new Groq({ apiKey })
  : null;

const isModelError = (err) => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.status === 404 ||
    (err.status === 400 && (msg.includes('decommissioned') || msg.includes('model'))) ||
    msg.includes('model_not_found') ||
    msg.includes('model_decommissioned') ||
    msg.includes('does not exist') ||
    msg.includes('decommissioned')
  );
};

/**
 * Send a completion request to Groq
 * @param {Array} messages - Array of message objects
 * @param {object} options - Optional overrides
 * @returns {Promise<string>} The AI response text
 */
export const groqComplete = async (messages, options = {}, retries = 3) => {
  if (!groq) {
    throw new Error('GROQ_API_KEY is missing or empty. Add it to Backend/.env to enable AI features.');
  }

  try {
    const {
      model = DEFAULT_MODEL,
      temperature = 0.7,
      maxTokens = 8000,
      jsonMode = false,
    } = options;

    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq');

    logger.info(`Groq completion: model=${model}, tokens=${completion.usage?.total_tokens}`);
    return content;
  } catch (error) {
    if (isModelError(error)) {
      const FALLBACK_MODELS = [
        'groq/compound',
        'groq/compound-mini',
        'qwen/qwen3.6-27b',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b'
      ];
      const requestedModel = options.model || DEFAULT_MODEL;
      for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackModel !== requestedModel) {
          logger.warn(`Model '${requestedModel}' unavailable (${error.message}). Retrying with fallback model: ${fallbackModel}`);
          try {
            return await groqComplete(messages, { ...options, model: fallbackModel }, retries);
          } catch (fbErr) {
            if (isModelError(fbErr)) continue;
            throw fbErr;
          }
        }
      }
    }

    // Retry on rate-limit (429) or request-too-large (413) errors
    const isRateLimit = error.status === 429 || error.status === 413 ||
      error.message?.includes('rate_limit') || error.message?.includes('Request too large');

    if (isRateLimit && retries > 0) {
      const waitMs = (4 - retries) * 10000; // 10s, 20s, 30s
      logger.warn(`Groq rate limit hit. Retrying in ${waitMs / 1000}s... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, waitMs));
      return groqComplete(messages, options, retries - 1);
    }

    logger.error(`Groq API error: ${error.message}`);
    throw new Error(`AI service error: ${error.message}`);
  }
};

/**
 * Stream a completion from Groq (for chat)
 */
export const groqStream = async (messages, options = {}) => {
  if (!groq) {
    throw new Error('GROQ_API_KEY is missing or empty. Add it to Backend/.env to enable AI features.');
  }

  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  try {
    return await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });
  } catch (error) {
    if (isModelError(error)) {
      logger.warn(`Model '${model}' unavailable for streaming. Falling back to groq/compound.`);
      return groq.chat.completions.create({
        model: 'groq/compound',
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });
    }
    throw error;
  }
};

/**
 * Parse JSON from AI response (with auto-repair for truncated output)
 */
export const parseAIJson = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('parseAIJson received invalid or empty input');
  }

  // 1. First attempt: standard cleanup and direct parse
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_err) {
    // Continue to repair attempts
  }

  // 2. Second attempt: auto-repair unclosed strings, delimiters, and truncated arrays/objects
  try {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
      const candidate = cleaned.slice(firstBrace);
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

      const parsed = JSON.parse(repaired);
      logger.info('parseAIJson: successfully auto-repaired truncated JSON response');
      return parsed;
    }
  } catch (_err) {
    // Continue to salvage regexes
  }

  // 3. Third attempt: salvage questions array if present
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
        } catch { /* skip malformed */ }
      }
      if (completeQuestions.length > 0) {
        logger.warn(`parseAIJson: truncated JSON salvaged ${completeQuestions.length} questions`);
        return { questions: completeQuestions };
      }
    }
  } catch (_err) {
    // Fall through to final error
  }

  throw new Error('Failed to parse AI JSON response');
};

export { DEFAULT_MODEL, FAST_MODEL };
export default groq;

