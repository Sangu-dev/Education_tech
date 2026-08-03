import { processPDFAndGenerateCourse } from '../services/pdfService.js';
import { asyncHandler, sendCreated, createError } from '../utils/responseHelper.js';

// @desc   Upload PDF and start course generation
// @route  POST /api/upload
// @access Private
export const uploadPDF = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createError('No PDF file uploaded', 400);
  }

  const course = await processPDFAndGenerateCourse(req.user._id, req.file);

  sendCreated(res, { course }, 'PDF uploaded successfully. Course generation started.');
});
