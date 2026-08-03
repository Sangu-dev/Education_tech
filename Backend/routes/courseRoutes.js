import express from 'express';
import {
  getCourses, getCourse, getCourseStatus, getChapters,
  getTopics, getLessons, getLesson, deleteCourseCtrl,
} from '../controllers/courseController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect); // All course routes require auth

router.get('/', getCourses);
router.get('/:id', getCourse);
router.get('/:id/status', getCourseStatus);
router.get('/:id/chapters', getChapters);
router.delete('/:id', deleteCourseCtrl);

router.get('/chapters/:chapterId/topics', getTopics);
router.get('/topics/:topicId/lessons', getLessons);
router.get('/lessons/:lessonId', getLesson);

export default router;
