/* eslint-disable no-control-regex */
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';
import logger from './logger.js';

/**
 * Custom page renderer that preserves page numbers and line spacing
 */
function renderPageWithStructure(pageData) {
  const renderOptions = {
    normalizeWhitespace: true,
    disableCombineTextItems: false,
  };

  return pageData.getTextContent(renderOptions).then((textContent) => {
    let lastY = null;
    let text = '';
    for (const item of textContent.items) {
      if (lastY === null || Math.abs(lastY - item.transform[5]) < 5) {
        text += (text.length > 0 && !text.endsWith(' ') ? ' ' : '') + item.str;
      } else {
        text += '\n' + item.str;
      }
      lastY = item.transform[5];
    }
    const pageNum = pageData.pageIndex + 1;
    return `\n\n--- [Page ${pageNum}] ---\n\n${text.trim()}`;
  });
}

/**
 * Sanitize and clean extracted text, neutralizing prompt injection attacks and control characters
 */
export const sanitizeNotesText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\u0000/g, '') // Null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control characters
    // Neutralize prompt injection tokens & fake delimiter enclosures
    .replace(/<\|im_start\|>/gi, '[start]')
    .replace(/<\|im_end\|>/gi, '[end]')
    .replace(/<system_prompt>|<\/system_prompt>/gi, '')
    .replace(/<student_notes>|<\/student_notes>/gi, '')
    .replace(/(?:^|\n)\s*(?:System|Assistant|User)\s*:\s*(?:Ignore previous instructions|You are now|Forget everything)/gi, '$1[Ignored instruction attempt]')
    .replace(/\r\n/g, '\n')     // Normalize line endings
    .replace(/\r/g, '\n')       // Normalize carriage returns
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/[ \t]+/g, ' ')    // Normalize whitespace
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim();
};

export const cleanText = sanitizeNotesText;

/**
 * Extract text from a PDF file with page structure preservation and defensive error handling
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{text: string, numPages: number, info: object, pages: Array}>}
 */
export const extractTextFromPDF = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('PDF file does not exist on disk');
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error('The uploaded PDF file is empty (0 bytes). Please upload a valid document.');
  }

  // Quick magic bytes check for PDF header (%PDF-)
  const fd = fs.openSync(filePath, 'r');
  const headerBuf = Buffer.alloc(5);
  try {
    fs.readSync(fd, headerBuf, 0, 5, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (headerBuf.toString('utf-8') !== '%PDF-') {
    throw new Error('The uploaded file does not have a valid PDF header (%PDF-). It may be corrupted or renamed.');
  }

  let dataBuffer = null;
  try {
    dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer, {
      pagerender: renderPageWithStructure,
    });

    // Clear buffer reference to allow GC
    dataBuffer = null;

    logger.info(`PDF extracted: ${data.numpages} pages, ~${data.text.length} characters`);

    return {
      text: sanitizeNotesText(data.text),
      numPages: data.numpages,
      info: data.info || {},
      metadata: data.metadata || {},
    };
  } catch (error) {
    dataBuffer = null;
    logger.error(`PDF extraction error: ${error.message}`);

    if (error.name === 'PasswordException' || /password/i.test(error.message)) {
      throw new Error('This PDF is password-protected. Please remove the password and upload it again.');
    }
    if (error.name === 'InvalidPDFException' || /invalid pdf|corrupted|xref|trailer/i.test(error.message)) {
      throw new Error('The PDF appears to be corrupted or invalid. Please ensure it opens properly in a PDF reader.');
    }

    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
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
