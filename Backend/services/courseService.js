import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Lesson from '../models/Lesson.js';
import Progress from '../models/Progress.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Chat from '../models/Chat.js';
import { createError } from '../utils/responseHelper.js';

/**
 * Get all courses for a user
 */
export const getUserCourses = async (userId, { page = 1, limit = 10, status } = {}) => {
  const query = { userId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [courses, total] = await Promise.all([
    Course.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-tableOfContents'),
    Course.countDocuments(query),
  ]);

  return {
    courses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single course with full structure
 */
export const getCourseById = async (courseId, userId) => {
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) throw createError('Course not found', 404);

  const chapters = await Chapter.find({ courseId }).sort({ order: 1 });

  const chaptersWithContent = await Promise.all(
    chapters.map(async (chapter) => {
      const topics = await Topic.find({ chapterId: chapter._id }).sort({ order: 1 });
      const topicsWithLessons = await Promise.all(
        topics.map(async (topic) => {
          const lessons = await Lesson.find({ topicId: topic._id })
            .sort({ order: 1 })
            .select('-content'); // Exclude heavy content from list view
          return { ...topic.toObject(), lessons };
        })
      );
      return { ...chapter.toObject(), topics: topicsWithLessons };
    })
  );

  return { ...course.toObject(), chapters: chaptersWithContent };
};

/**
 * Get a single lesson
 */
export const getLessonById = async (lessonId, userId) => {
  const lesson = await Lesson.findById(lessonId)
    .populate('courseId', 'userId title difficulty')
    .populate('chapterId', 'title order')
    .populate('topicId', 'title order');

  if (!lesson) throw createError('Lesson not found', 404);

  // Verify ownership
  if (lesson.courseId.userId.toString() !== userId.toString()) {
    throw createError('Access denied', 403);
  }

  // Get prev/next lessons
  const allLessons = await Lesson.find({ topicId: lesson.topicId._id })
    .sort({ order: 1 })
    .select('_id title order');

  const currentIdx = allLessons.findIndex(l => l._id.toString() === lessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  return { lesson, prevLesson, nextLesson };
};

/**
 * Delete a course and all related data
 */
export const deleteCourse = async (courseId, userId) => {
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) throw createError('Course not found', 404);

  const chapters = await Chapter.find({ courseId });
  const chapterIds = chapters.map(c => c._id);
  const topics = await Topic.find({ chapterId: { $in: chapterIds } });
  const topicIds = topics.map(t => t._id);

  await Promise.all([
    Lesson.deleteMany({ topicId: { $in: topicIds } }),
    Topic.deleteMany({ chapterId: { $in: chapterIds } }),
    Chapter.deleteMany({ courseId }),
    Progress.deleteMany({ courseId }),
    Quiz.deleteMany({ courseId }),
    QuizAttempt.deleteMany({ courseId }),
    Chat.deleteMany({ courseId }),
    Course.findByIdAndDelete(courseId),
  ]);

  // Delete vector store collection
  const { deleteCollection } = await import('../rag/vectorStore.js');
  await deleteCollection(courseId.toString());
};
