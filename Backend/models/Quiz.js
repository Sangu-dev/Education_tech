import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'true_false', 'short_answer'],
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: [{ type: String }], // For MCQ
  correctAnswer: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
  },
  points: {
    type: Number,
    default: 1,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
});

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    questions: [questionSchema],
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    timeLimit: {
      type: Number, // minutes, null means no limit
      default: null,
    },
    passingScore: {
      type: Number,
      default: 70, // percentage
    },
  },
  {
    timestamps: true,
  }
);

quizSchema.index({ courseId: 1, chapterId: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
