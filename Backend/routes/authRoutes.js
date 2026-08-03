import express from 'express';
import {
  register, login, logout, refresh, getMe,
  forgotPasswordCtrl, resetPasswordCtrl,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  registerValidator, loginValidator,
  forgotPasswordValidator, resetPasswordValidator,
} from '../validators/authValidator.js';
import { authLimiter } from '../config/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/logout', protect, logout);
router.post('/refresh-token', refresh);
router.get('/me', protect, getMe);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, forgotPasswordCtrl);
router.post('/reset-password/:token', resetPasswordValidator, validate, resetPasswordCtrl);

export default router;
