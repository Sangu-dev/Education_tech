import crypto from 'crypto';
import User from '../models/User.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/generateToken.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/sendEmail.js';
import { createError } from '../utils/responseHelper.js';
import logger from '../utils/logger.js';

export const registerUser = async ({ name, email, password }) => {
  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createError('An account with this email already exists', 409);
  }

  // Create user
  const user = await User.create({ name, email, password });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, name).catch(err =>
    logger.warn(`Welcome email failed: ${err.message}`)
  );

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

export const loginUser = async ({ email, password }) => {
  // Find user with password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw createError('Invalid email or password', 401);
  }

  // Update last login & streak
  user.lastLogin = new Date();
  user.updateStreak();

  // Generate new tokens
  const { accessToken, refreshToken } = generateTokenPair(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (token) => {
  if (!token) throw createError('Refresh token required', 401);

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw createError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw createError('Refresh token is invalid', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user._id);
  user.refreshToken = newRefreshToken;
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists
    return;
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(email, user.name, resetUrl);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw createError('Failed to send reset email', 500);
  }
};

export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw createError('Invalid or expired password reset token', 400);
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = null;
  await user.save();

  return sanitizeUser(user);
};

// Remove sensitive fields
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  streak: {
    current: user.streak?.current || 0,
    best: user.streak?.best || 0,
    lastActivity: user.streak?.lastActivity,
  },
  totalLearningTime: user.totalLearningTime,
  createdAt: user.createdAt,
});
