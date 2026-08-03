import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Topic title is required'],
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    totalLessons: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

topicSchema.index({ chapterId: 1, order: 1 });
topicSchema.index({ title: 'text' });

// Virtual for lessons
topicSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'topicId',
});

const Topic = mongoose.model('Topic', topicSchema);
export default Topic;
