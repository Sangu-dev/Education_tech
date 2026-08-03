import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    estimatedTime: {
      type: String, // e.g., "4 hours 30 minutes"
    },
    learningObjectives: [
      {
        type: String,
        trim: true,
      },
    ],
    prerequisites: [
      {
        type: String,
        trim: true,
      },
    ],
    tableOfContents: [
      {
        chapter: String,
        topics: [String],
      },
    ],
    thumbnail: {
      type: String,
      default: null,
    },
    pdfName: {
      type: String,
      required: true,
    },
    pdfPath: {
      type: String,
      required: true,
    },
    pdfSize: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    processingError: {
      type: String,
    },
    vectorCollectionId: {
      type: String, // ChromaDB collection reference
    },
    totalLessons: {
      type: Number,
      default: 0,
    },
    totalChapters: {
      type: Number,
      default: 0,
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text indexes for search
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ userId: 1, createdAt: -1 });

// Virtual for chapters
courseSchema.virtual('chapters', {
  ref: 'Chapter',
  localField: '_id',
  foreignField: 'courseId',
});

const Course = mongoose.model('Course', courseSchema);
export default Course;
