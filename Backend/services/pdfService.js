import fs from 'fs';
import path from 'path';
import { extractTextFromPDF, sanitizeNotesText } from '../utils/pdfProcessor.js';
import { splitTextIntoChunks } from '../utils/textChunker.js';
import { indexCourseContent } from '../rag/retriever.js';
import { generateCourseFromPDF } from './aiService.js';
import { buildInitialLessonScenes } from '../controllers/videoController.js';
import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Lesson from '../models/Lesson.js';
import logger from '../utils/logger.js';

/**
 * Process uploaded PDF: extract → chunk → embed → generate course → save to DB
 */
export const processPDFAndGenerateCourse = async (userId, fileInfo, options = {}) => {
  const { path: filePath, originalname, size } = fileInfo;
  const { learningLevel = 'beginner', videoStyle = 'technical' } = options;

  logger.info(`Starting PDF processing for user ${userId}: ${originalname} (level: ${learningLevel}, style: ${videoStyle})`);

  const validDifficulties = ['beginner', 'school', 'college', 'intermediate', 'advanced'];
  const normalizedLevel = validDifficulties.includes(learningLevel.toLowerCase())
    ? learningLevel.charAt(0).toUpperCase() + learningLevel.slice(1).toLowerCase()
    : 'Beginner';

  // 1. Create course placeholder
  const course = await Course.create({
    userId,
    title: originalname.replace(/\.(pdf|txt|md|markdown)$/i, '').replace(/[-_]/g, ' '),
    description: 'Generating course content...',
    pdfName: originalname,
    pdfPath: filePath,
    pdfSize: size,
    difficulty: normalizedLevel,
    videoStyle: videoStyle.toLowerCase(),
    status: 'processing',
  });

  // Process asynchronously
  processCourseAsync(course._id, filePath, originalname, { learningLevel, videoStyle }).catch(async (err) => {
    logger.error(`Course processing failed for ${course._id}: ${err.message}`);
    await Course.findByIdAndUpdate(course._id, {
      status: 'failed',
      processingError: err.message,
    });
  });

  return course;
};

const processCourseAsync = async (courseId, filePath, originalname, options = {}) => {
  try {
    const ext = path.extname(originalname).toLowerCase();
    let text = '';
    let numPages = 1;

    // 2. Extract text based on file format
    logger.info(`Extracting text from notes file: ${originalname} (${ext})`);
    if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
      text = sanitizeNotesText(fs.readFileSync(filePath, 'utf-8'));
    } else {
      const extracted = await extractTextFromPDF(filePath);
      text = extracted.text;
      numPages = extracted.numPages || 1;
    }

    if (!text || text.trim().length < 15) {
      const charCount = text?.trim().length || 0;
      if (charCount < 10 && numPages > 0 && ext === '.pdf') {
        throw new Error(
          `This PDF appears to be an image-based or scanned document (${numPages} pages, ${charCount} characters extracted). ` +
          'Please upload a PDF with selectable text, or a .txt / .md notes file.'
        );
      }
      throw new Error(
        `Notes file contains very little text (only ${charCount} characters). ` +
        'Please ensure the file has meaningful educational content.'
      );
    }

    // 3. Split into chunks
    logger.info(`Splitting text into chunks (${text.length} chars, ${numPages} pages)`);
    const chunks = splitTextIntoChunks(text, 1000, 200);

    // 4. Index in vector store
    logger.info(`Indexing ${chunks.length} chunks for course ${courseId}`);
    await indexCourseContent(courseId.toString(), chunks);

    // 5. Generate course with AI
    logger.info(`Generating AI course structure for ${courseId}`);
    const courseData = await generateCourseFromPDF(text);

    // 6. Save to MongoDB
    logger.info(`Saving course structure to MongoDB`);
    await saveCourseStructure(courseId, courseData, options);

    logger.info(`✅ Course ${courseId} processed successfully`);
  } catch (error) {
    logger.error(`Async processing error: ${error.message}`);
    throw error;
  }
};

const saveCourseStructure = async (courseId, courseData, options = {}) => {
  let totalLessons = 0;
  const { learningLevel = 'beginner', videoStyle = 'technical' } = options;

  const validDifficulties = ['beginner', 'school', 'college', 'intermediate', 'advanced'];
  const rawDiff = (courseData.difficulty || learningLevel || '').toLowerCase().trim();
  const difficulty = validDifficulties.includes(rawDiff)
    ? rawDiff.charAt(0).toUpperCase() + rawDiff.slice(1)
    : 'Beginner';

  // Update course metadata
  await Course.findByIdAndUpdate(courseId, {
    title: courseData.title,
    description: courseData.description,
    difficulty,
    videoStyle,
    estimatedTime: courseData.estimatedTime,
    learningObjectives: courseData.learningObjectives || [],
    prerequisites: courseData.prerequisites || [],
    tags: courseData.tags || [],
    tableOfContents: courseData.chapters?.map(c => ({
      chapter: c.title,
      topics: c.topics?.map(t => t.title) || [],
    })) || [],
    totalChapters: courseData.chapters?.length || 0,
    vectorCollectionId: courseId.toString(),
  });

  // Create chapters, topics, lessons
  let firstLesson = null;

  for (let ci = 0; ci < (courseData.chapters || []).length; ci++) {
    const chapterData = courseData.chapters[ci];

    const chapter = await Chapter.create({
      courseId,
      title: chapterData.title,
      description: chapterData.description || '',
      order: ci + 1,
      totalTopics: chapterData.topics?.length || 0,
    });

    for (let ti = 0; ti < (chapterData.topics || []).length; ti++) {
      const topicData = chapterData.topics[ti];

      const topic = await Topic.create({
        courseId,
        chapterId: chapter._id,
        title: topicData.title,
        order: ti + 1,
        totalLessons: topicData.lessons?.length || 0,
      });

      for (let li = 0; li < (topicData.lessons || []).length; li++) {
        const lessonData = topicData.lessons[li];
        const initialScenes = buildInitialLessonScenes(lessonData);
        const newLesson = await Lesson.create({
          courseId,
          chapterId: chapter._id,
          topicId: topic._id,
          title: lessonData.title,
          content: lessonData.content || '',
          summary: lessonData.summary || '',
          examples: lessonData.examples || [],
          keyTakeaways: lessonData.keyTakeaways || [],
          importantNotes: lessonData.importantNotes || [],
          estimatedTime: lessonData.estimatedTime || 5,
          order: li + 1,
          videoStatus: 'none',
          videoStyle: videoStyle.toLowerCase(),
          learningLevel: learningLevel.toLowerCase(),
          scenes: initialScenes,
        });

        if (!firstLesson) firstLesson = newLesson;
        totalLessons++;
      }
    }
  }

  // Mark course as ready
  await Course.findByIdAndUpdate(courseId, {
    status: 'ready',
    totalLessons,
  });

  // Proactively render animated video for the very first lesson in the background
  if (firstLesson) {
    import('../controllers/videoController.js')
      .then(({ processVideoAsync }) => {
        logger.info(`Starting background video generation for introductory lesson: ${firstLesson.title}`);
        return processVideoAsync(firstLesson._id, {
          learningLevel,
          videoStyle,
          lang: 'en',
        });
      })
      .catch((err) => {
        logger.warn(`Background video pre-gen warning: ${err.message}`);
      });
  }
};
