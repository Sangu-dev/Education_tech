import express from 'express';
import {
  generateVideoForLesson,
  getVideoStatus,
  regenerateScene,
  downloadVideo,
} from '../controllers/videoController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Download route can be accessed directly or with auth
router.get('/download/:lessonId', downloadVideo);

// Protected routes
router.use(protect);
router.post('/generate/:lessonId', generateVideoForLesson);
router.get('/status/:lessonId', getVideoStatus);
router.post('/regenerate-scene/:lessonId/:sceneId', regenerateScene);

export default router;
