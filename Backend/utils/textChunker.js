/**
 * Split text into overlapping chunks for RAG
 */

const DEFAULT_CHUNK_SIZE = 1000;   // characters
const DEFAULT_CHUNK_OVERLAP = 200; // characters

/**
 * Split text into chunks with overlap
 * @param {string} text - The text to split
 * @param {number} chunkSize - Max characters per chunk
 * @param {number} chunkOverlap - Overlap between consecutive chunks
 * @returns {string[]} Array of text chunks
 */
export const splitTextIntoChunks = (
  text,
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP
) => {
  if (!text || text.trim().length === 0) return [];

  // Try to split on paragraph boundaries first
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 2 <= chunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      // If paragraph itself is too long, split by sentences
      if (trimmed.length > chunkSize) {
        const subChunks = splitBySentences(trimmed, chunkSize);
        // Add all but last with overlap for next
        for (let i = 0; i < subChunks.length - 1; i++) {
          chunks.push(subChunks[i]);
        }
        currentChunk = subChunks[subChunks.length - 1] || '';
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Apply overlap: for each chunk (except last), append the first
  // chunkOverlap chars of the next chunk
  return addOverlap(chunks, chunkOverlap);
};

/**
 * Split a long paragraph by sentences
 */
const splitBySentences = (text, chunkSize) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length <= chunkSize) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

/**
 * Add overlap between chunks
 */
const addOverlap = (chunks, overlap) => {
  if (overlap === 0 || chunks.length <= 1) return chunks;

  const result = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      result.push(chunks[i]);
    } else {
      // Prepend end of previous chunk
      const prev = chunks[i - 1];
      const overlapText = prev.slice(-overlap);
      result.push(overlapText + ' ' + chunks[i]);
    }
  }
  return result;
};

/**
 * Create metadata-enriched chunk documents
 */
export const createChunkDocuments = (chunks, metadata = {}) => {
  return chunks.map((content, index) => ({
    pageContent: content,
    metadata: {
      ...metadata,
      chunkIndex: index,
      chunkTotal: chunks.length,
    },
  }));
};
