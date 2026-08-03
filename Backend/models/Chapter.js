import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Chapter title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    totalTopics: {
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

// Text indexes
chapterSchema.index({ title: 'text' });
chapterSchema.index({ courseId: 1, order: 1 });

// Virtual for topics
chapterSchema.virtual('topics', {
  ref: 'Topic',
  localField: '_id',
  foreignField: 'chapterId',
});

const Chapter = mongoose.model('Chapter', chapterSchema);
export default Chapter;
