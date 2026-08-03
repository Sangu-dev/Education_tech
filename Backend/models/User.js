import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    streak: {
      current: { type: Number, default: 0 },
      best: { type: Number, default: 0 },
      lastActivity: { type: Date },
    },
    totalLearningTime: {
      type: Number,
      default: 0, // in minutes
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for courses count
userSchema.virtual('coursesCount', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'userId',
  count: true,
});

// Virtual for enrolled courses count (alias)
userSchema.virtual('enrolledCourses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'userId',
  count: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Update streak
userSchema.methods.updateStreak = function () {
  const now = new Date();
  const lastActivity = this.streak.lastActivity;
  if (!lastActivity) {
    this.streak.current = 1;
  } else {
    const diffDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      this.streak.current += 1;
    } else if (diffDays > 1) {
      this.streak.current = 1;
    }
    // If same day, keep current streak unchanged
  }
  // Track best streak
  if (this.streak.current > (this.streak.best || 0)) {
    this.streak.best = this.streak.current;
  }
  this.streak.lastActivity = now;
};

const User = mongoose.model('User', userSchema);
export default User;
