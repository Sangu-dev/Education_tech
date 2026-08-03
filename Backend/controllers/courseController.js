import {
  getUserCourses,
  getCourseById,
  getLessonById,
  deleteCourse,
} from '../services/courseService.js';
import { asyncHandler, sendSuccess, createError } from '../utils/responseHelper.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';

// @desc   Get all courses for user
// @route  GET /api/courses
// @access Private
export const getCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const result = await getUserCourses(req.user._id, {
    page: parseInt(page),
    limit: parseInt(limit),
    status,
  });
  res.json({ success: true, ...result });
});

// @desc   Get single course with full structure
// @route  GET /api/courses/:id
// @access Private
export const getCourse = asyncHandler(async (req, res) => {
  const course = await getCourseById(req.params.id, req.user._id);
  sendSuccess(res, { course }, 'Course fetched successfully');
});

// @desc   Get course status (for polling during generation)
// @route  GET /api/courses/:id/status
// @access Private
export const getCourseStatus = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, userId: req.user._id })
    .select('status processingError title totalLessons totalChapters');
  if (!course) throw createError('Course not found', 404);
  sendSuccess(res, { course }, 'Status fetched');
});

// @desc   Get chapters for a course
// @route  GET /api/courses/:id/chapters
// @access Private
export const getChapters = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, userId: req.user._id });
  if (!course) throw createError('Course not found', 404);

  const chapters = await Chapter.find({ courseId: req.params.id }).sort({ order: 1 });
  sendSuccess(res, { chapters }, 'Chapters fetched');
});

// @desc   Get topics for a chapter
// @route  GET /api/courses/chapters/:chapterId/topics
// @access Private
export const getTopics = asyncHandler(async (req, res) => {
  const topics = await Topic.find({ chapterId: req.params.chapterId }).sort({ order: 1 });
  sendSuccess(res, { topics }, 'Topics fetched');
});

// @desc   Get lessons for a topic
// @route  GET /api/courses/topics/:topicId/lessons
// @access Private
export const getLessons = asyncHandler(async (req, res) => {
  const lessons = await Lesson.find({ topicId: req.params.topicId })
    .sort({ order: 1 })
    .select('-content');
  sendSuccess(res, { lessons }, 'Lessons fetched');
});

// @desc   Get a single lesson
// @route  GET /api/courses/lessons/:lessonId
// @access Private
export const getLesson = asyncHandler(async (req, res) => {
  const data = await getLessonById(req.params.lessonId, req.user._id);
  sendSuccess(res, data, 'Lesson fetched');
});

// @desc   Delete a course
// @route  DELETE /api/courses/:id
// @access Private
export const deleteCourseCtrl = asyncHandler(async (req, res) => {
  await deleteCourse(req.params.id, req.user._id);
  sendSuccess(res, null, 'Course deleted successfully');
});
