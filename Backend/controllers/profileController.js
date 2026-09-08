import User from '../models/User.js';
import Course from '../models/Course.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Progress from '../models/Progress.js';
import Chat from '../models/Chat.js';
import { deleteCourse } from '../services/courseService.js';
import { asyncHandler, sendSuccess, createError } from '../utils/responseHelper.js';
import fs from 'fs';
import path from 'path';

// @desc   Get user profile
// @route  GET /api/profile
// @access Private
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  // Stats
  const [totalCourses, totalProgress, totalAttempts] = await Promise.all([
    Course.countDocuments({ userId: req.user._id, status: 'ready' }),
    Progress.countDocuments({ userId: req.user._id, completed: true }),
    QuizAttempt.countDocuments({ userId: req.user._id }),
  ]);

  sendSuccess(res, {
    user,
    stats: {
      totalCourses,
      lessonsCompleted: totalProgress,
      quizzesTaken: totalAttempts,
      learningTime: user.totalLearningTime,
      streak: user.streak,
    },
  }, 'Profile fetched');
});

// @desc   Update profile
// @route  PATCH /api/profile
// @access Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  // Check email uniqueness
  if (email && email !== req.user.email) {
    const existing = await User.findOne({ email });
    if (existing) throw createError('Email already in use', 409);
  }

  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, { user }, 'Profile updated');
});

// @desc   Upload avatar
// @route  POST /api/profile/avatar
// @access Private
export const uploadAvatarCtrl = asyncHandler(async (req, res) => {
  if (!req.file) throw createError('No image uploaded', 400);

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  // Safely delete old avatar
  const oldUser = await User.findById(req.user._id);
  if (oldUser && oldUser.avatar) {
    try {
      const oldPath = path.join(process.cwd(), oldUser.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch {
      // Ignore failure to remove old avatar
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: avatarUrl },
    { new: true }
  );

  sendSuccess(res, { avatar: avatarUrl, user }, 'Avatar updated');
});

// @desc   Change password
// @route  PATCH /api/profile/password
// @access Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) throw createError('Current password is incorrect', 401);

  user.password = newPassword;
  user.refreshToken = null; // Invalidate all sessions
  await user.save();

  sendSuccess(res, null, 'Password changed successfully');
});

// @desc   Delete account
// @route  DELETE /api/profile
// @access Private
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Cascade delete all user courses and all associated child resources
  const userCourses = await Course.find({ userId }).select('_id');
  for (const course of userCourses) {
    try {
      await deleteCourse(course._id, userId);
    } catch {
      // Continue cascade even if a single course cleanup has issues
    }
  }

  // 2. Cascade delete remaining user data
  await Promise.all([
    Progress.deleteMany({ userId }),
    QuizAttempt.deleteMany({ userId }),
    Chat.deleteMany({ userId }),
  ]);

  // 3. Delete avatar file if exists
  const user = await User.findById(userId);
  if (user && user.avatar) {
    try {
      const avatarPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    } catch {
      // Ignore avatar cleanup failure
    }
  }

  await User.findByIdAndDelete(userId);

  sendSuccess(res, null, 'Account deleted successfully');
});
