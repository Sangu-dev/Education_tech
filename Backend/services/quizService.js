import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import { generateQuizForChapter } from './aiService.js';
import { createError } from '../utils/responseHelper.js';
import logger from '../utils/logger.js';

/**
 * Generate and save a quiz for a chapter
 */
export const generateAndSaveQuiz = async (courseId, chapterId, userId) => {
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) throw createError('Course not found', 404);

  const chapter = await Chapter.findOne({ _id: chapterId, courseId });
  if (!chapter) throw createError('Chapter not found', 404);

  // Check if quiz already exists and is complete (>= 8 questions)
  const existing = await Quiz.findOne({ courseId, chapterId });
  if (existing && existing.questions && existing.questions.length >= 8) {
    return existing;
  }

  if (existing) {
    logger.info(`Existing quiz for chapter ${chapter.title} has only ${existing.questions?.length} questions. Re-generating...`);
    await Quiz.deleteOne({ _id: existing._id });
  }

  // Get all lessons for this chapter
  const lessons = await Lesson.find({ chapterId }).select('title content');

  if (lessons.length === 0) throw createError('No lessons found for this chapter', 400);

  logger.info(`Generating full 10-question quiz for chapter: ${chapter.title}`);

  // Generate quiz with AI
  const quizData = await generateQuizForChapter(chapter.title, lessons, {
    numQuestions: 10,
    difficulty: course.difficulty?.toLowerCase() || 'medium',
  });

  const formattedQuestions = (quizData.questions || []).map(q => {
    let opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length === 0 && q.type === 'true_false') {
      opts = ['True', 'False'];
    }
    return {
      type: q.type || 'mcq',
      question: q.question,
      options: opts,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      points: q.points || 1,
    };
  });

  // Calculate totals
  const totalPoints = formattedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

  const quiz = await Quiz.create({
    courseId,
    chapterId,
    title: quizData.title || `${chapter.title} — Quiz`,
    description: quizData.description || `Test your understanding of ${chapter.title}`,
    questions: formattedQuestions,
    totalQuestions: formattedQuestions.length,
    totalPoints,
  });

  return quiz;
};

/**
 * Submit quiz attempt
 */
export const submitQuizAttempt = async (userId, quizId, userAnswers, timeTaken) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw createError('Quiz not found', 404);

  let score = 0;
  const gradedAnswers = quiz.questions.map((question, i) => {
    const userAnswer = userAnswers[i] || '';
    const isCorrect = checkAnswer(
      question.type,
      userAnswer,
      question.correctAnswer,
      question.options
    );
    const pointsEarned = isCorrect ? (question.points || 1) : 0;
    score += pointsEarned;

    return {
      questionId: question._id,
      userAnswer,
      isCorrect,
      pointsEarned,
    };
  });

  const percentage = quiz.totalPoints > 0
    ? Math.round((score / quiz.totalPoints) * 100)
    : 0;
  const passed = percentage >= quiz.passingScore;

  const attempt = await QuizAttempt.create({
    userId,
    quizId,
    courseId: quiz.courseId,
    answers: gradedAnswers,
    score,
    percentage,
    passed,
    timeTaken,
  });

  return {
    attempt,
    quiz: {
      title: quiz.title,
      totalPoints: quiz.totalPoints,
      passingScore: quiz.passingScore,
    },
    score,
    percentage,
    passed,
    correctAnswers: quiz.questions.map(q => ({
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
  };
};

/**
 * Get quiz attempts for a user
 */
export const getUserQuizAttempts = async (userId, courseId) => {
  return QuizAttempt.find({ userId, courseId })
    .populate('quizId', 'title chapterId')
    .sort({ completedAt: -1 });
};

/**
 * Check if answer is correct
 */
const checkAnswer = (type, userAnswer, correctAnswer, options = []) => {
  const normalize = str => String(str || '').toLowerCase().trim();

  const normUser = normalize(userAnswer);
  const normCorrect = normalize(correctAnswer);

  if (!normUser) return false;

  // Direct match
  if (normUser === normCorrect) return true;

  // Check if normUser matches index of correctAnswer in options
  if (Array.isArray(options)) {
    const correctIdx = options.findIndex(opt => normalize(opt) === normCorrect);
    if (correctIdx !== -1 && String(normUser) === String(correctIdx)) {
      return true;
    }
  }

  switch (type) {
    case 'mcq':
    case 'true_false':
      return normUser === normCorrect;
    case 'short_answer': {
      // For short answer, check if key words are present
      const keywords = normCorrect.split(/\s+/);
      return keywords.some(kw => kw.length > 3 && normUser.includes(kw));
    }
    default:
      return normUser === normCorrect;
  }
};

