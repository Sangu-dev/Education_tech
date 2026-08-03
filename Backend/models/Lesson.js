import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Lesson content is required'],
    },
    summary: {
      type: String,
    },
    examples: [
      {
        title: { type: String },
        description: { type: String },
        code: { type: String },
      },
    ],
    keyTakeaways: [
      {
        type: String,
        trim: true,
      },
    ],
    importantNotes: [
      {
        type: String,
        trim: true,
      },
    ],
    estimatedTime: {
      type: Number, // minutes
      default: 5,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text indexes for search
lessonSchema.index({ title: 'text', content: 'text', summary: 'text' });
lessonSchema.index({ topicId: 1, order: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);
export default Lesson;
