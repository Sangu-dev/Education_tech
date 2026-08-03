import { groqComplete, parseAIJson } from '../ai/groqClient.js';
import { buildCourseGenerationPrompt } from '../ai/prompts/courseGenPrompt.js';
import { buildQuizGenerationPrompt } from '../ai/prompts/quizGenPrompt.js';
import { buildSummarizationPrompt } from '../ai/prompts/chatPrompt.js';
import logger from '../utils/logger.js';

/**
 * Generate course structure from PDF text
 */
export const generateCourseFromPDF = async (pdfText, options = {}) => {
  try {
    const messages = buildCourseGenerationPrompt(pdfText, options);

    const response = await groqComplete(messages, {
      temperature: 0.4,
      maxTokens: 4000,
      jsonMode: true,
    });

    const courseData = parseAIJson(response);

    // Validate minimum structure
    if (!courseData.title || !courseData.chapters?.length) {
      throw new Error('AI generated invalid course structure');
    }

    logger.info(`Course generated: "${courseData.title}" with ${courseData.chapters.length} chapters`);
    return courseData;
  } catch (error) {
    logger.error(`Course generation error: ${error.message}`);
    throw new Error(`Failed to generate course: ${error.message}`);
  }
};

/**
 * Generate quiz for a chapter
 */
export const generateQuizForChapter = async (chapterTitle, lessons, options = {}) => {
  try {
    const messages = buildQuizGenerationPrompt(chapterTitle, lessons, options);

    const response = await groqComplete(messages, {
      temperature: 0.5,
      maxTokens: 8000,
      jsonMode: true,
    });

    const quizData = parseAIJson(response);

    if (!quizData.questions?.length) {
      throw new Error('AI generated invalid quiz structure');
    }

    logger.info(`Quiz generated for "${chapterTitle}": ${quizData.questions.length} questions`);
    return quizData;
  } catch (error) {
    logger.error(`Quiz generation error: ${error.message}`);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
};

/**
 * Generate a lesson summary
 */
export const generateLessonSummary = async (lessonTitle, lessonContent) => {
  try {
    const messages = buildSummarizationPrompt(lessonContent, lessonTitle);
    const summary = await groqComplete(messages, {
      temperature: 0.3,
      maxTokens: 1000,
    });
    return summary;
  } catch (error) {
    logger.error(`Summary generation error: ${error.message}`);
    return null;
  }
};

/**
 * Generate follow-up questions for deeper learning
 */
export const generateFollowUpQuestions = async (topic, context) => {
  try {
    const messages = [
      {
        role: 'system',
        content: 'Generate insightful follow-up questions to deepen understanding. Return JSON array only.',
      },
      {
        role: 'user',
        content: `Topic: ${topic}\nContext: ${context.substring(0, 1000)}\n\nGenerate 3 follow-up questions as JSON: {"questions": ["q1", "q2", "q3"]}`,
      },
    ];

    const response = await groqComplete(messages, {
      temperature: 0.7,
      maxTokens: 500,
      jsonMode: true,
    });

    const data = parseAIJson(response);
    return data.questions || [];
  } catch (error) {
    logger.warn(`Follow-up questions error: ${error.message}`);
    return [];
  }
};
