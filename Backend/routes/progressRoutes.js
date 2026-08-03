import express from 'express';
import {
  completeLesson, getCourseProgressCtrl,
  getUserProgressCtrl, getCompletedLessonsCtrl,
} from '../controllers/progressController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getUserProgressCtrl);
router.post('/complete', completeLesson);
router.get('/:courseId', getCourseProgressCtrl);
router.get('/:courseId/lessons', getCompletedLessonsCtrl);

export default router;
