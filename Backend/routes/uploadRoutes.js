import express from 'express';
import { uploadPDF } from '../controllers/uploadController.js';
import { protect } from '../middlewares/auth.js';
import { uploadPDF as multerPDF, handleMulterError } from '../middlewares/upload.js';
import { uploadLimiter } from '../config/rateLimiter.js';

const router = express.Router();

router.post(
  '/',
  protect,
  uploadLimiter,
  handleMulterError(multerPDF),
  uploadPDF
);

export default router;
