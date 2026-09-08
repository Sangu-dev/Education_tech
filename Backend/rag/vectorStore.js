import logger from '../utils/logger.js';

// In-memory vector store fallback
const inMemoryStore = new Map();

/**
 * Delete collection from vector store or memory
 */
export const deleteCollection = async (collectionId) => {
  try {
    const key = collectionId.toString();
    if (inMemoryStore.has(key)) {
      inMemoryStore.delete(key);
      logger.info(`Deleted in-memory vector collection: ${key}`);
    }

    if (process.env.CHROMA_URL) {
      try {
        const { ChromaClient } = await import('chromadb');
        const client = new ChromaClient({ path: process.env.CHROMA_URL });
        await client.deleteCollection({ name: `course_${key}` });
      } catch (err) {
        logger.warn(`ChromaDB deleteCollection failed/skipped: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error deleting collection ${collectionId}: ${error.message}`);
  }
};

/**
 * Store chunks in-memory
 */
export const storeChunksInMemory = (collectionId, chunks) => {
  const key = collectionId.toString();
  const docs = chunks.map((text, idx) => ({
    id: `chunk_${idx}`,
    text,
  }));
  inMemoryStore.set(key, docs);
  logger.info(`Stored ${docs.length} chunks in-memory for course: ${key}`);
};

/**
 * Retrieve chunks from in-memory store
 */
export const getChunksFromMemory = (collectionId) => {
  const key = collectionId.toString();
  return inMemoryStore.get(key) || [];
};
