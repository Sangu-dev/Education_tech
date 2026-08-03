import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
} from '../services/authService.js';
import { asyncHandler, sendSuccess, sendCreated } from '../utils/responseHelper.js';

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const data = await registerUser({ name, email, password });
  sendCreated(res, data, 'Account created successfully');
});

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await loginUser({ email, password });
  sendSuccess(res, data, 'Login successful');
});

// @desc   Refresh access token
// @route  POST /api/auth/refresh-token
// @access Public
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await refreshAccessToken(refreshToken);
  sendSuccess(res, tokens, 'Token refreshed');
});

// @desc   Logout user
// @route  POST /api/auth/logout
// @access Private
export const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user._id);
  sendSuccess(res, null, 'Logged out successfully');
});

// @desc   Get current user
// @route  GET /api/auth/me
// @access Private
export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: req.user }, 'User fetched successfully');
});

// @desc   Forgot password
// @route  POST /api/auth/forgot-password
// @access Public
export const forgotPasswordCtrl = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await forgotPassword(email);
  sendSuccess(res, null, 'If an account exists, a reset link has been sent to your email');
});

// @desc   Reset password
// @route  POST /api/auth/reset-password/:token
// @access Public
export const resetPasswordCtrl = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const user = await resetPassword(token, password);
  sendSuccess(res, { user }, 'Password reset successfully');
});
