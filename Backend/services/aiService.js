import { groqComplete, parseAIJson } from '../ai/groqClient.js';
import { buildCourseGenerationPrompt } from '../ai/prompts/courseGenPrompt.js';
import { buildQuizGenerationPrompt } from '../ai/prompts/quizGenPrompt.js';
import { buildSummarizationPrompt } from '../ai/prompts/chatPrompt.js';
import {
  buildTeacherScenePrompt,
  buildSingleSceneRegeneratePrompt,
} from '../ai/prompts/teacherScenePrompt.js';
import logger from '../utils/logger.js';

/**
 * Generate course structure from PDF text
 */
export const generateCourseFromPDF = async (pdfText, options = {}) => {
  try {
    const messages = buildCourseGenerationPrompt(pdfText, options);

    const response = await groqComplete(messages, {
      temperature: 0.4,
      maxTokens: 8000,
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

/**
 * Generate AI Teacher animated scene plan for a lesson or topic
 */
export const generateLessonTeacherScenes = async (topicTitle, content, options = {}) => {
  try {
    logger.info(`Generating AI Teacher scene plan for: "${topicTitle}" (${options.learningLevel || 'beginner'}, ${options.videoStyle || 'technical'})`);

    const messages = buildTeacherScenePrompt(content, {
      topicTitle,
      ...options,
    });

    const response = await groqComplete(messages, {
      temperature: 0.5,
      maxTokens: 8000,
      jsonMode: true,
    });

    const planData = parseAIJson(response);

    if (!planData.scenes || !Array.isArray(planData.scenes) || planData.scenes.length === 0) {
      throw new Error('AI failed to generate video scenes array');
    }

    // Ensure scenes have valid IDs and defaults
    planData.scenes = planData.scenes.map((s, idx) => ({
      scene_id: s.scene_id || idx + 1,
      title: s.title || `Scene ${idx + 1}`,
      duration: s.duration || 10,
      narration: s.narration || '',
      visual_description: s.visual_description || '',
      animation_steps: Array.isArray(s.animation_steps) ? s.animation_steps : [],
      on_screen_text: Array.isArray(s.on_screen_text) ? s.on_screen_text : [],
      important_keywords: Array.isArray(s.important_keywords) ? s.important_keywords : [],
      diagram_type: s.diagram_type || 'concept_map',
      diagram_data: s.diagram_data || {},
      transition: s.transition || 'fade',
      educational_purpose: s.educational_purpose || 'explain_concept',
    }));

    logger.info(`Generated ${planData.scenes.length} educational scenes for "${topicTitle}"`);
    return planData;
  } catch (error) {
    logger.error(`Scene generation error: ${error.message}`);
    throw new Error(`Failed to generate educational video scenes: ${error.message}`);
  }
};

/**
 * Regenerate an individual scene with refinement/feedback
 */
export const regenerateSingleScene = async (scene, lessonContext, options = {}) => {
  try {
    logger.info(`Regenerating scene #${scene.scene_id} for "${scene.title}"`);
    const messages = buildSingleSceneRegeneratePrompt(scene, lessonContext, options);

    const response = await groqComplete(messages, {
      temperature: 0.6,
      maxTokens: 4000,
      jsonMode: true,
    });

    const newScene = parseAIJson(response);
    return {
      ...scene,
      ...newScene,
      scene_id: scene.scene_id, // preserve ID
    };
  } catch (error) {
    logger.error(`Regenerate scene error: ${error.message}`);
    throw error;
  }
};

