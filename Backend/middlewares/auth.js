import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from '../utils/responseHelper.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return next(createError('Not authorized, no token provided', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(createError('Not authorized, user not found', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(createError('Token expired, please login again', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(createError('Invalid token', 401));
    }
    next(error);
  }
};
