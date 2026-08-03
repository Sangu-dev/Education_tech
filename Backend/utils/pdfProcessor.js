import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';
import logger from './logger.js';

/**
 * Extract text from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{text: string, numPages: number, info: object}>}
 */
export const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    logger.info(`PDF extracted: ${data.numpages} pages, ~${data.text.length} characters`);

    return {
      text: cleanText(data.text),
      numPages: data.numpages,
      info: data.info || {},
      metadata: data.metadata || {},
    };
  } catch (error) {
    logger.error(`PDF extraction error: ${error.message}`);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Clean extracted text
 */
const cleanText = (text) => {
  return text
    .replace(/\r\n/g, '\n')     // Normalize line endings
    .replace(/\r/g, '\n')       // Normalize carriage returns
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/[ \t]+/g, ' ')    // Normalize whitespace
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim();
};

/**
 * Get PDF metadata
 */
export const getPDFMetadata = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer, { max: 1 }); // Only parse first page for metadata
    return {
      numPages: data.numpages,
      info: data.info || {},
    };
  } catch (error) {
    logger.error(`PDF metadata error: ${error.message}`);
    return { numPages: 0, info: {} };
  }
};
