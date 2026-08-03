import express from 'express';
import {
  getProfile, updateProfile, uploadAvatarCtrl,
  changePassword, deleteAccount,
} from '../controllers/profileController.js';
import { protect } from '../middlewares/auth.js';
import { uploadAvatar, handleMulterError } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import {
  updateProfileValidator, changePasswordValidator,
} from '../validators/profileValidator.js';

const router = express.Router();

router.use(protect);

router.get('/', getProfile);
router.patch('/', updateProfileValidator, validate, updateProfile);
router.post('/avatar', handleMulterError(uploadAvatar), uploadAvatarCtrl);
router.patch('/password', changePasswordValidator, validate, changePassword);
router.delete('/', deleteAccount);

export default router;
