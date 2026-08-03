import { createError } from '../utils/responseHelper.js';

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Not authenticated', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        createError(
          `Access denied. Required role: ${roles.join(' or ')}`,
          403
        )
      );
    }
    next();
  };
};

export const requireAdmin = requireRole('admin');
