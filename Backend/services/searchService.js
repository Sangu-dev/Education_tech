import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';

/**
 * Full-text search across courses, chapters, and lessons
 */
export const searchAll = async (userId, query, { page = 1, limit = 10 } = {}) => {
  if (!query || query.trim().length < 2) {
    return { courses: [], chapters: [], lessons: [], total: 0 };
  }

  const searchQuery = { $text: { $search: query } };
  const skip = (page - 1) * limit;

  // Search courses (user's own)
  const courses = await Course.find({
    userId,
    ...searchQuery,
    status: 'ready',
  })
    .select('title description difficulty thumbnail status')
    .limit(5);

  // Search chapters (from user's courses)
  const userCourseIds = await Course.find({ userId, status: 'ready' }).distinct('_id');

  const chapters = await Chapter.find({
    courseId: { $in: userCourseIds },
    ...searchQuery,
  })
    .select('title description courseId')
    .populate('courseId', 'title')
    .limit(5);

  const lessons = await Lesson.find({
    courseId: { $in: userCourseIds },
    ...searchQuery,
  })
    .select('title summary courseId chapterId')
    .populate('courseId', 'title')
    .populate('chapterId', 'title')
    .limit(10);

  return {
    courses,
    chapters,
    lessons,
    total: courses.length + chapters.length + lessons.length,
    query,
  };
};
