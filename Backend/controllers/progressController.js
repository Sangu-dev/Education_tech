import {
  markLessonComplete,
  getCourseProgress,
  getUserProgress,
  getCompletedLessons,
} from '../services/progressService.js';
import { asyncHandler, sendSuccess } from '../utils/responseHelper.js';

// @desc   Mark a lesson as complete
// @route  POST /api/progress/complete
// @access Private
export const completeLesson = asyncHandler(async (req, res) => {
  const { lessonId, timeSpent = 0 } = req.body;
  const progress = await markLessonComplete(req.user._id, lessonId, timeSpent);
  sendSuccess(res, { progress }, 'Lesson marked as complete');
});

// @desc   Get progress for a course
// @route  GET /api/progress/:courseId
// @access Private
export const getCourseProgressCtrl = asyncHandler(async (req, res) => {
  const progress = await getCourseProgress(req.user._id, req.params.courseId);
  sendSuccess(res, { progress }, 'Progress fetched');
});

// @desc   Get all progress for user (dashboard)
// @route  GET /api/progress
// @access Private
export const getUserProgressCtrl = asyncHandler(async (req, res) => {
  const progress = await getUserProgress(req.user._id);
  sendSuccess(res, { progress }, 'User progress fetched');
});

// @desc   Get completed lessons for a course
// @route  GET /api/progress/:courseId/lessons
// @access Private
export const getCompletedLessonsCtrl = asyncHandler(async (req, res) => {
  const completed = await getCompletedLessons(req.user._id, req.params.courseId);
  sendSuccess(res, { completed }, 'Completed lessons fetched');
});
