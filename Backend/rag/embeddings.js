/**
 * Text embeddings using Groq-compatible approach
 * 
 * Since Groq doesn't have a dedicated embedding API, we use a TF-IDF
 * inspired approach with hashing for local embeddings.
 * For production, replace with OpenAI embeddings, Cohere, or a local model.
 */
import logger from '../utils/logger.js';

const EMBEDDING_DIM = 384; // Standard sentence-transformer dimension

/**
 * Simple but effective hash-based embedding
 * Works without external API calls
 */
const hashString = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit int
  }
  return hash;
};

/**
 * Generate a pseudo-embedding for a text chunk
 * Uses multiple hash functions to create a dense vector
 */
const generateLocalEmbedding = (text) => {
  const normalizedText = text.toLowerCase().trim();
  const words = normalizedText.split(/\s+/).filter(w => w.length > 2);
  
  const embedding = new Array(EMBEDDING_DIM).fill(0);
  
  // Word-level features
  words.forEach((word, i) => {
    const h1 = Math.abs(hashString(word)) % EMBEDDING_DIM;
    const h2 = Math.abs(hashString(word + '_2')) % EMBEDDING_DIM;
    const h3 = Math.abs(hashString(word + '_3')) % EMBEDDING_DIM;
    embedding[h1] += 1;
    embedding[h2] += 0.5;
    embedding[h3] += 0.25;
  });

  // Bigram features
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + '_' + words[i + 1];
    const h = Math.abs(hashString(bigram)) % EMBEDDING_DIM;
    embedding[h] += 1.5;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
};

/**
 * Generate embedding for a single text
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export const generateEmbedding = async (text) => {
  try {
    return generateLocalEmbedding(text);
  } catch (error) {
    logger.error(`Embedding generation error: ${error.message}`);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

/**
 * Generate embeddings for multiple texts
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export const generateEmbeddings = async (texts) => {
  try {
    logger.info(`Generating embeddings for ${texts.length} chunks`);
    const embeddings = texts.map(text => generateLocalEmbedding(text));
    logger.info(`Generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    logger.error(`Batch embedding error: ${error.message}`);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
};
