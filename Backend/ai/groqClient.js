import Groq from 'groq-sdk';
import logger from '../utils/logger.js';

const apiKey = process.env.GROQ_API_KEY;

// Models - use env var or safe defaults
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const FAST_MODEL = 'llama-3.1-8b-instant';

// Initialize Groq client ONLY if key exists.
// This prevents the whole backend from crashing at import-time.
const groq = apiKey
  ? new Groq({ apiKey })
  : null;

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

  return groq.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });
};

/**
 * Parse JSON from AI response (with cleanup)
 */
export const parseAIJson = (text) => {
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (error) {
    // Try extracting a JSON object from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_) {
        // JSON is truncated — try to salvage complete questions array
        const questionsMatch = text.match(/"questions"\s*:\s*(\[[\s\S]*?\])\s*[},]?/)
          || text.match(/"questions"\s*:\s*(\[[\s\S]*)/);
        if (questionsMatch) {
          // Extract all complete question objects {…}
          const rawArr = questionsMatch[1];
          const completeQuestions = [];
          const qRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
          let match;
          while ((match = qRegex.exec(rawArr)) !== null) {
            try {
              completeQuestions.push(JSON.parse(match[0]));
            } catch (_) { /* skip malformed */ }
          }
          if (completeQuestions.length > 0) {
            logger.warn(`parseAIJson: truncated JSON salvaged ${completeQuestions.length} questions`);
            return { questions: completeQuestions };
          }
        }
      }
    }
    throw new Error('Failed to parse AI JSON response');
  }
};

export { DEFAULT_MODEL, FAST_MODEL };
export default groq;

