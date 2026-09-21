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
    // AI Teacher Animated Video fields
    videoStatus: {
      type: String,
      enum: ['none', 'pending', 'processing', 'ready', 'failed'],
      default: 'none',
    },
    videoProgress: {
      type: Number,
      default: 0,
    },
    videoProgressStep: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: null,
    },
    videoStyle: {
      type: String,
      default: 'technical',
    },
    learningLevel: {
      type: String,
      default: 'beginner',
    },
    scenes: [
      {
        scene_id: { type: Number, required: true },
        title: { type: String, required: true },
        duration: { type: Number, default: 10 },
        narration: { type: String, required: true },
        visual_description: { type: String },
        animation_steps: [{ type: String }],
        on_screen_text: [{ type: String }],
        important_keywords: [{ type: String }],
        diagram_type: {
          type: String,
          default: 'concept_map',
        },
        diagram_data: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        transition: { type: String, default: 'fade' },
        educational_purpose: { type: String, default: 'explain_concept' },
        audioUrl: { type: String, default: null },
        videoClipUrl: { type: String, default: null },
      },
    ],
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
