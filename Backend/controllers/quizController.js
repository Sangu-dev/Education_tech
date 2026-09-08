import {
  generateAndSaveQuiz,
  submitQuizAttempt,
  getUserQuizAttempts,
} from '../services/quizService.js';
import Quiz from '../models/Quiz.js';
import Course from '../models/Course.js';
import { asyncHandler, sendSuccess, sendCreated, createError } from '../utils/responseHelper.js';

// Helper to sanitize quiz questions so correct answers/explanations aren't leaked to client
export const sanitizeQuiz = (quizDoc) => {
  if (!quizDoc) return null;
  const quizObj = typeof quizDoc.toObject === 'function' ? quizDoc.toObject() : JSON.parse(JSON.stringify(quizDoc));
  if (Array.isArray(quizObj.questions)) {
    quizObj.questions = quizObj.questions.map(q => {
      const { correctAnswer: _ca, explanation: _exp, ...safeQ } = q;
      return safeQ;
    });
  }
  return quizObj;
};

// @desc   Generate quiz for a chapter
// @route  POST /api/quiz/generate
// @access Private
export const generateQuiz = asyncHandler(async (req, res) => {
  const { courseId, chapterId } = req.body;
  const course = await Course.findOne({ _id: courseId, userId: req.user._id });
  if (!course) throw createError('Course not found or access denied', 404);

  const quiz = await generateAndSaveQuiz(courseId, chapterId, req.user._id);
  sendCreated(res, { quiz: sanitizeQuiz(quiz) }, 'Quiz generated successfully');
});

// @desc   Get quiz for a chapter
// @route  GET /api/quiz/chapter/:chapterId
// @access Private
export const getQuizByChapter = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ chapterId: req.params.chapterId });
  if (!quiz) throw createError('Quiz not found. Generate one first.', 404);

  const course = await Course.findOne({ _id: quiz.courseId, userId: req.user._id });
  if (!course) throw createError('Course not found or access denied', 404);

  sendSuccess(res, { quiz: sanitizeQuiz(quiz) }, 'Quiz fetched');
});

// @desc   Get quiz by ID
// @route  GET /api/quiz/:quizId
// @access Private
export const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) throw createError('Quiz not found', 404);

  const course = await Course.findOne({ _id: quiz.courseId, userId: req.user._id });
  if (!course) throw createError('Course not found or access denied', 404);

  sendSuccess(res, { quiz: sanitizeQuiz(quiz) }, 'Quiz fetched');
});

// @desc   Submit quiz attempt
// @route  POST /api/quiz/:quizId/submit
// @access Private
export const submitQuiz = asyncHandler(async (req, res) => {
  const { answers, timeTaken } = req.body;
  if (!answers || !Array.isArray(answers)) {
    throw createError('Answers array is required', 400);
  }

  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) throw createError('Quiz not found', 404);

  const course = await Course.findOne({ _id: quiz.courseId, userId: req.user._id });
  if (!course) throw createError('Course not found or access denied', 404);

  const result = await submitQuizAttempt(
    req.user._id,
    req.params.quizId,
    answers,
    timeTaken
  );
  sendSuccess(res, result, 'Quiz submitted');
});

// @desc   Get user's quiz attempts
// @route  GET /api/quiz/attempts/:courseId
// @access Private
export const getAttempts = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, userId: req.user._id });
  if (!course) throw createError('Course not found or access denied', 404);

  const attempts = await getUserQuizAttempts(req.user._id, req.params.courseId);
  sendSuccess(res, { attempts }, 'Attempts fetched');
});
