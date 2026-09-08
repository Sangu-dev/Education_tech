import logger from '../utils/logger.js';
import { storeChunksInMemory, getChunksFromMemory } from './vectorStore.js';

/**
 * Index course text chunks into vector store (with in-memory fallback)
 * @param {string} courseId 
 * @param {Array<string>} chunks 
 */
export const indexCourseContent = async (courseId, chunks) => {
  if (!chunks || chunks.length === 0) return;

  const key = courseId.toString();
  logger.info(`Indexing ${chunks.length} chunks for course ${key}`);

  // Store in in-memory store
  storeChunksInMemory(key, chunks);

  // If ChromaDB is configured, attempt storing in ChromaDB
  if (process.env.CHROMA_URL) {
    try {
      const { ChromaClient } = await import('chromadb');
      const client = new ChromaClient({ path: process.env.CHROMA_URL });
      const collection = await client.getOrCreateCollection({
        name: `course_${key}`,
      });

      const ids = chunks.map((_, i) => `chunk_${i}`);
      await collection.add({
        ids,
        documents: chunks,
      });
      logger.info(`Indexed chunks in ChromaDB for course ${key}`);
    } catch (err) {
      logger.warn(`ChromaDB indexing skipped/failed (using in-memory): ${err.message}`);
    }
  }
};

/**
 * Retrieve relevant text chunks for a query
 * @param {string} query 
 * @param {string} collectionName 
 * @param {number} topK 
 * @returns {Promise<Array<string>>}
 */
export const retrieveRelevantContext = async (query, collectionName, topK = 5) => {
  if (!query) return [];

  const key = collectionName.toString();

  // Try ChromaDB query if configured
  if (process.env.CHROMA_URL) {
    try {
      const { ChromaClient } = await import('chromadb');
      const client = new ChromaClient({ path: process.env.CHROMA_URL });
      const collection = await client.getCollection({ name: `course_${key}` });
      const results = await collection.query({
        queryTexts: [query],
        nResults: topK,
      });

      if (results && results.documents && results.documents[0]) {
        return results.documents[0];
      }
    } catch (err) {
      logger.warn(`ChromaDB query skipped/failed (using in-memory search): ${err.message}`);
    }
  }

  // Fallback: Term overlap matching on in-memory chunks (reconstructed from DB if server restarted)
  let memChunks = getChunksFromMemory(key);
  if (!memChunks || memChunks.length === 0) {
    try {
      const { default: Lesson } = await import('../models/Lesson.js');
      const lessons = await Lesson.find({ courseId: key }).select('title content summary').lean();
      if (lessons && lessons.length > 0) {
        const reconstructed = lessons.map(l => `${l.title}\n${l.summary || ''}\n${l.content || ''}`);
        storeChunksInMemory(key, reconstructed);
        memChunks = getChunksFromMemory(key);
      }
    } catch (dbErr) {
      logger.warn(`Failed to reconstruct chunks from MongoDB: ${dbErr.message}`);
    }
  }

  if (!memChunks || memChunks.length === 0) return [];

  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

  const scored = memChunks.map(chunk => {
    const textLower = chunk.text.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        score += 1;
      }
    }
    return { text: chunk.text, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(s => s.text);
};
