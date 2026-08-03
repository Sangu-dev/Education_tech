/**
 * RAG Retriever - finds relevant chunks for a user query
 */
import { generateEmbedding } from './embeddings.js';
import { queryDocuments } from './vectorStore.js';
import logger from '../utils/logger.js';

/**
 * Retrieve relevant context chunks for a query
 * @param {string} query - User's question
 * @param {string} collectionName - Collection ID (courseId)
 * @param {number} topK - Number of chunks to retrieve
 * @returns {Promise<string[]>} Relevant text chunks
 */
export const retrieveRelevantContext = async (query, collectionName, topK = 5) => {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Retrieve similar documents
    const results = await queryDocuments(collectionName, queryEmbedding, topK);

    logger.info(`Retrieved ${results.length} relevant chunks for query: "${query.substring(0, 50)}..."`);

    return results.filter(r => r && r.trim().length > 0);
  } catch (error) {
    logger.error(`Retrieval error: ${error.message}`);
    return []; // Return empty context rather than crashing
  }
};

/**
 * Index PDF content for a course
 * @param {string} courseId
 * @param {string[]} chunks - Text chunks from PDF
 * @returns {Promise<void>}
 */
export const indexCourseContent = async (courseId, chunks) => {
  try {
    const { generateEmbeddings } = await import('./embeddings.js');
    const { addDocuments } = await import('./vectorStore.js');

    logger.info(`Indexing ${chunks.length} chunks for course ${courseId}`);

    const documents = chunks.map((chunk, i) => ({
      pageContent: chunk,
      metadata: {
        courseId,
        chunkIndex: i,
        timestamp: new Date().toISOString(),
      },
    }));

    const embeddings = await generateEmbeddings(chunks);
    await addDocuments(courseId, documents, embeddings);

    logger.info(`✅ Indexed ${chunks.length} chunks for course ${courseId}`);
  } catch (error) {
    logger.error(`Indexing error for course ${courseId}: ${error.message}`);
    throw error;
  }
};
