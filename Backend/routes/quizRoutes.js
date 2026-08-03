import express from 'express';
import {
  generateQuiz, getQuizByChapter, getQuiz,
  submitQuiz, getAttempts,
} from '../controllers/quizController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generateQuiz);
router.get('/chapter/:chapterId', getQuizByChapter);
router.get('/attempts/:courseId', getAttempts);
router.get('/:quizId', getQuiz);
router.post('/:quizId/submit', submitQuiz);

export default router;
