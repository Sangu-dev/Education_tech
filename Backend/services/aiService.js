import { grokComplete, parseAIJson } from '../ai/grokClient.js';
import { buildCourseGenerationPrompt } from '../ai/prompts/courseGenPrompt.js';
import { buildQuizGenerationPrompt } from '../ai/prompts/quizGenPrompt.js';
import { buildSummarizationPrompt } from '../ai/prompts/summaryPrompt.js';
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

    const response = await grokComplete(messages, {
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

    const response = await grokComplete(messages, {
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
    const summary = await grokComplete(messages, {
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

    const response = await grokComplete(messages, {
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

    const response = await grokComplete(messages, {
      temperature: 0.5,
      maxTokens: 8000,
      jsonMode: true,
    });

    const planData = parseAIJson(response);

    if (!planData.scenes || !Array.isArray(planData.scenes) || planData.scenes.length === 0) {
      throw new Error('AI failed to generate video scenes array');
    }

    // Ensure scenes have valid IDs and defaults matching the Programmatic Slide schema
    planData.scenes = planData.scenes.map((s, idx) => {
      // Clean and clamp on_screen_text to maximum 7 words
      let rawPunchy = typeof s.on_screen_text === 'string'
        ? s.on_screen_text
        : (Array.isArray(s.on_screen_text) ? s.on_screen_text.join(' • ') : (s.title || `Concept ${idx + 1}`));
      const punchyWords = rawPunchy.split(/\s+/).filter(Boolean);
      const clampedPunchy = punchyWords.slice(0, 7).join(' ');

      const validSlideTypes = ['cloud_architecture', 'process_flow', 'bullet_list', 'comparison'];
      const desc = ((s.title || '') + ' ' + (s.narration || '')).toLowerCase();
      let slideType = s.slide_type;
      if (!validSlideTypes.includes(slideType)) {
        if (desc.includes('cloud') || desc.includes('network') || desc.includes('server')) {
          slideType = 'cloud_architecture';
        } else if (desc.includes('stage') || desc.includes('step') || desc.includes('flow') || desc.includes('pipeline')) {
          slideType = 'process_flow';
        } else if (desc.includes('versus') || desc.includes('vs') || desc.includes('compare') || desc.includes('traditional')) {
          slideType = 'comparison';
        } else {
          slideType = 'bullet_list';
        }
      }

      return {
        scene_id: s.scene_id || idx + 1,
        title: s.title || `Scene ${idx + 1}`,
        slide_type: slideType,
        on_screen_text: clampedPunchy || s.title || 'Core Principle',
        bullet_points: Array.isArray(s.bullet_points) && s.bullet_points.length > 0
          ? s.bullet_points.slice(0, 3)
          : [s.title || 'Key Architectural Concept', 'Core Intuition and Mechanics', 'Verified Implementation'],
        diagram_data: (typeof s.diagram_data === 'object' && s.diagram_data !== null)
          ? s.diagram_data
          : {
              stages: ['1. Ingestion', '2. Processing', '3. Storage'],
              nodes: ['Storage', 'Compute', 'Database'],
            },
        narration: s.narration || `In this section, we examine ${s.title || topicTitle} to understand its core mechanics and operational value.`,
        duration_estimate: Math.max(3.5, Number(s.duration_estimate || s.duration || 8.5)),
        duration: Math.max(3.5, Number(s.duration_estimate || s.duration || 8.5)),
        important_keywords: Array.isArray(s.important_keywords) ? s.important_keywords.slice(0, 3) : [topicTitle.slice(0, 15)],
      };
    });

    logger.info(`Generated ${planData.scenes.length} programmatic slide scenes for "${topicTitle}"`);
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

    const response = await grokComplete(messages, {
      temperature: 0.6,
      maxTokens: 4000,
      jsonMode: true,
    });

    const newScene = parseAIJson(response);
    const validSlideTypes = ['cloud_architecture', 'process_flow', 'bullet_list', 'comparison'];
    const slideType = validSlideTypes.includes(newScene.slide_type) ? newScene.slide_type : (scene.slide_type || 'process_flow');

    let rawPunchy = typeof newScene.on_screen_text === 'string'
      ? newScene.on_screen_text
      : (Array.isArray(newScene.on_screen_text) ? newScene.on_screen_text.join(' • ') : (newScene.title || scene.on_screen_text || ''));
    const clampedPunchy = rawPunchy.split(/\s+/).filter(Boolean).slice(0, 7).join(' ');

    return {
      ...scene,
      ...newScene,
      scene_id: scene.scene_id,
      title: newScene.title || scene.title,
      slide_type: slideType,
      on_screen_text: clampedPunchy || scene.on_screen_text,
      bullet_points: Array.isArray(newScene.bullet_points) && newScene.bullet_points.length > 0
        ? newScene.bullet_points.slice(0, 3)
        : (scene.bullet_points || ['Foundational Concept', 'Operational Mechanism', 'Key Takeaway']),
      diagram_data: newScene.diagram_data || scene.diagram_data || {},
      narration: newScene.narration || scene.narration,
      duration_estimate: Math.max(3.5, Number(newScene.duration_estimate || scene.duration || 8.5)),
      duration: Math.max(3.5, Number(newScene.duration_estimate || scene.duration || 8.5)),
    };
  } catch (error) {
    logger.error(`Regenerate scene error: ${error.message}`);
    throw new Error(`Failed to regenerate scene: ${error.message}`);
  }
};
