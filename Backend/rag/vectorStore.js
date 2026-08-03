/**
 * Vector Store using ChromaDB with in-memory fallback
 * 
 * This module provides a unified interface for storing and querying
 * text embeddings. It uses ChromaDB if available, with an in-memory
 * fallback using simple cosine similarity.
 */
import { ChromaClient } from 'chromadb';
import logger from '../utils/logger.js';

let chromaClient = null;
const inMemoryStore = new Map(); // courseId -> [{content, embedding, metadata}]

/**
 * Initialize ChromaDB client
 */
const getChromaClient = async () => {
  if (chromaClient) return chromaClient;
  try {
    chromaClient = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
    await chromaClient.heartbeat();
    logger.info('✅ ChromaDB connected');
    return chromaClient;
  } catch (error) {
    logger.warn(`ChromaDB unavailable, using in-memory store: ${error.message}`);
    return null;
  }
};

/**
 * Get or create a ChromaDB collection
 */
const getCollection = async (collectionName) => {
  const client = await getChromaClient();
  if (!client) return null;

  try {
    return await client.getOrCreateCollection({
      name: collectionName,
      metadata: { 'hnsw:space': 'cosine' },
    });
  } catch (error) {
    logger.error(`Collection error: ${error.message}`);
    return null;
  }
};

/**
 * Add documents to vector store
 * @param {string} collectionName - Collection identifier (e.g., courseId)
 * @param {Array} documents - [{pageContent, metadata}]
 * @param {Array} embeddings - Corresponding embedding vectors
 */
export const addDocuments = async (collectionName, documents, embeddings) => {
  const collection = await getCollection(collectionName);

  if (collection) {
    // Use ChromaDB
    try {
      const ids = documents.map((_, i) => `${collectionName}_chunk_${i}_${Date.now()}`);
      await collection.add({
        ids,
        embeddings,
        documents: documents.map(d => d.pageContent),
        metadatas: documents.map(d => d.metadata || {}),
      });
      logger.info(`Added ${documents.length} documents to ChromaDB collection: ${collectionName}`);
    } catch (error) {
      logger.error(`ChromaDB add error: ${error.message}`);
      // Fallback to in-memory
      storeInMemory(collectionName, documents, embeddings);
    }
  } else {
    // Use in-memory store
    storeInMemory(collectionName, documents, embeddings);
  }
};

const storeInMemory = (collectionName, documents, embeddings) => {
  const existing = inMemoryStore.get(collectionName) || [];
  const newDocs = documents.map((doc, i) => ({
    content: doc.pageContent,
    embedding: embeddings[i],
    metadata: doc.metadata || {},
  }));
  inMemoryStore.set(collectionName, [...existing, ...newDocs]);
  logger.info(`Stored ${documents.length} documents in memory for: ${collectionName}`);
};

/**
 * Query vector store for similar documents
 * @param {string} collectionName
 * @param {number[]} queryEmbedding
 * @param {number} topK - Number of results
 * @returns {Promise<string[]>} Array of matching document contents
 */
export const queryDocuments = async (collectionName, queryEmbedding, topK = 5) => {
  const collection = await getCollection(collectionName);

  if (collection) {
    try {
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      });
      return results.documents[0] || [];
    } catch (error) {
      logger.error(`ChromaDB query error: ${error.message}`);
      return queryInMemory(collectionName, queryEmbedding, topK);
    }
  } else {
    return queryInMemory(collectionName, queryEmbedding, topK);
  }
};

const queryInMemory = (collectionName, queryEmbedding, topK) => {
  const docs = inMemoryStore.get(collectionName) || [];
  if (docs.length === 0) return [];

  // Compute cosine similarity
  const scored = docs.map(doc => ({
    content: doc.content,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(d => d.content);
};

/**
 * Delete a collection
 */
export const deleteCollection = async (collectionName) => {
  const client = await getChromaClient();
  if (client) {
    try {
      await client.deleteCollection({ name: collectionName });
      logger.info(`Deleted ChromaDB collection: ${collectionName}`);
    } catch (error) {
      logger.warn(`Could not delete ChromaDB collection: ${error.message}`);
    }
  }
  inMemoryStore.delete(collectionName);
};

/**
 * Cosine similarity between two vectors
 */
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
};
