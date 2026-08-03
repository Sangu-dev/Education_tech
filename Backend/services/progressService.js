import Progress from '../models/Progress.js';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { createError } from '../utils/responseHelper.js';

/**
 * Mark a lesson as complete
 */
export const markLessonComplete = async (userId, lessonId, timeSpent = 0) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw createError('Lesson not found', 404);

  const progress = await Progress.findOneAndUpdate(
    { userId, courseId: lesson.courseId, lessonId },
    {
      completed: true,
      completedAt: new Date(),
      chapterId: lesson.chapterId,
      $inc: { timeSpent },
    },
    { upsert: true, new: true }
  );

  // Update user learning time
  if (timeSpent > 0) {
    await User.findByIdAndUpdate(userId, {
      $inc: { totalLearningTime: Math.round(timeSpent / 60) }, // convert to minutes
    });
  }

  // Update streak
  const user = await User.findById(userId);
  if (user) {
    user.updateStreak();
    await user.save();
  }

  return progress;
};

/**
 * Get course progress for a user
 */
export const getCourseProgress = async (userId, courseId) => {
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) throw createError('Course not found', 404);

  const totalLessons = course.totalLessons || 0;
  const completedCount = await Progress.countDocuments({
    userId,
    courseId,
    completed: true,
  });

  const percentage = totalLessons > 0
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;

  // Get last completed lesson
  const lastProgress = await Progress.findOne({ userId, courseId, completed: true })
    .sort({ completedAt: -1 })
    .populate('lessonId', 'title topicId chapterId');

  return {
    courseId,
    totalLessons,
    completedLessons: completedCount,
    percentage,
    lastLesson: lastProgress?.lessonId || null,
    lastActivity: lastProgress?.completedAt || null,
  };
};

/**
 * Get all progress for a user (dashboard)
 */
export const getUserProgress = async (userId) => {
  const courses = await Course.find({ userId, status: 'ready' })
    .select('_id title thumbnail totalLessons difficulty');

  const progressData = await Promise.all(
    courses.map(course => getCourseProgress(userId, course._id))
  );

  return courses.map((course, i) => ({
    ...course.toObject(),
    progress: progressData[i],
  }));
};

/**
 * Get completed lesson IDs for a course
 */
export const getCompletedLessons = async (userId, courseId) => {
  const records = await Progress.find({ userId, courseId, completed: true })
    .select('lessonId completedAt');
  return records;
};
