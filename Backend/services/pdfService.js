import { extractTextFromPDF } from '../utils/pdfProcessor.js';
import { splitTextIntoChunks } from '../utils/textChunker.js';
import { indexCourseContent } from '../rag/retriever.js';
import { generateCourseFromPDF } from './aiService.js';
import Course from '../models/Course.js';
import Chapter from '../models/Chapter.js';
import Topic from '../models/Topic.js';
import Lesson from '../models/Lesson.js';
import logger from '../utils/logger.js';

/**
 * Process uploaded PDF: extract → chunk → embed → generate course → save to DB
 */
export const processPDFAndGenerateCourse = async (userId, fileInfo) => {
  const { path: filePath, originalname, size } = fileInfo;

  logger.info(`Starting PDF processing for user ${userId}: ${originalname}`);

  // 1. Create course placeholder
  const course = await Course.create({
    userId,
    title: originalname.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '),
    description: 'Generating course content...',
    pdfName: originalname,
    pdfPath: filePath,
    pdfSize: size,
    status: 'processing',
  });

  // Process asynchronously
  processCourseAsync(course._id, filePath, originalname).catch(async (err) => {
    logger.error(`Course processing failed for ${course._id}: ${err.message}`);
    await Course.findByIdAndUpdate(course._id, {
      status: 'failed',
      processingError: err.message,
    });
  });

  return course;
};

const processCourseAsync = async (courseId, filePath, originalname) => {
  try {
    // 2. Extract text from PDF
    logger.info(`Extracting text from PDF: ${originalname}`);
    const { text, numPages } = await extractTextFromPDF(filePath);

    if (!text || text.trim().length < 100) {
      const charCount = text?.trim().length || 0;
      if (charCount < 10 && numPages > 0) {
        throw new Error(
          `This PDF appears to be an image-based or scanned document (${numPages} pages, ${charCount} characters extracted). ` +
          'Please upload a PDF with selectable text. You can use Adobe Acrobat or an online OCR tool to convert scanned PDFs.'
        );
      }
      throw new Error(
        `PDF contains very little extractable text (only ${charCount} characters across ${numPages} pages). ` +
        'Please ensure the PDF has readable text content.'
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
    await saveCourseStructure(courseId, courseData);

    logger.info(`✅ Course ${courseId} processed successfully`);
  } catch (error) {
    logger.error(`Async processing error: ${error.message}`);
    throw error;
  }
};

const saveCourseStructure = async (courseId, courseData) => {
  let totalLessons = 0;

  // Update course metadata
  await Course.findByIdAndUpdate(courseId, {
    title: courseData.title,
    description: courseData.description,
    difficulty: courseData.difficulty || 'Beginner',
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
        await Lesson.create({
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
        });
        totalLessons++;
      }
    }
  }

  // Mark course as ready
  await Course.findByIdAndUpdate(courseId, {
    status: 'ready',
    totalLessons,
  });
};
