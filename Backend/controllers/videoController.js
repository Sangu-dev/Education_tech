import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import { generateLessonTeacherScenes, regenerateSingleScene } from '../services/aiService.js';
import { renderCompleteLessonVideo, reRenderSingleScene } from '../services/animationService.js';
import { asyncHandler, sendSuccess, createError } from '../utils/responseHelper.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * @desc   Trigger AI Teacher animated video generation for a lesson
 * @route  POST /api/video/generate/:lessonId
 * @access Private
 */
export const generateVideoForLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const {
    learningLevel = 'beginner',
    videoStyle = 'technical',
    lang = 'en',
  } = req.body;

  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw createError('Lesson not found', 404);
  }

  // Update status to processing
  lesson.videoStatus = 'processing';
  lesson.videoProgress = 5;
  lesson.videoProgressStep = 'Analyzing document & creating lesson plan';
  lesson.learningLevel = learningLevel;
  lesson.videoStyle = videoStyle;
  await lesson.save();

  // Run async in background so HTTP response is immediate
  processVideoAsync(lesson._id, { learningLevel, videoStyle, lang }).catch(async (err) => {
    logger.error(`Video processing failed for lesson ${lessonId}: ${err.message}`);
    await Lesson.findByIdAndUpdate(lessonId, {
      videoStatus: 'failed',
      videoProgressStep: `Generation failed: ${err.message}`,
    });
  });

  sendSuccess(res, {
    lessonId: lesson._id,
    videoStatus: 'processing',
    videoProgress: 5,
    videoProgressStep: 'Analyzing document & creating lesson plan',
  }, 'Video generation started');
});

/**
 * Asynchronous worker for full video pipeline
 */
export const processVideoAsync = async (lessonId, options = {}) => {
  const { learningLevel = 'beginner', videoStyle = 'technical', lang = 'en', forceRegenerateScenes = false } = options;
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return;

  try {
    let scenesToRender = (lesson.scenes && lesson.scenes.length > 0) ? lesson.scenes : null;

    if (!scenesToRender || forceRegenerateScenes) {
      // 1. Groq AI Teacher pedagogical planning
      logger.info(`AI Teacher planning scenes for: "${lesson.title}"`);
      await Lesson.findByIdAndUpdate(lessonId, {
        videoProgress: 15,
        videoProgressStep: 'Understanding concepts & designing animation steps',
      });

      const planData = await generateLessonTeacherScenes(lesson.title, lesson.content, {
        learningLevel,
        videoStyle,
      });

      lesson.scenes = planData.scenes;
      await lesson.save();
      scenesToRender = planData.scenes;
    } else {
      logger.info(`Using ${scenesToRender.length} existing pre-planned scenes for: "${lesson.title}"`);
    }

    // 2. Render scenes, TTS audio, and MP4 video composition
    const onProgress = async (stepName, pct) => {
      await Lesson.findByIdAndUpdate(lessonId, {
        videoProgress: pct,
        videoProgressStep: stepName,
      });
    };

    const renderResult = await renderCompleteLessonVideo(lesson, scenesToRender, {
      lang,
      videoStyle,
      onProgress,
    });

    // 3. Mark video as ready
    await Lesson.findByIdAndUpdate(lessonId, {
      videoStatus: 'ready',
      videoProgress: 100,
      videoProgressStep: 'Video ready to watch and download',
      videoUrl: renderResult.videoUrl,
      scenes: renderResult.scenes,
    });

    logger.info(`✅ Lesson ${lessonId} video ready at ${renderResult.videoUrl}`);
  } catch (error) {
    logger.error(`Error in processVideoAsync: ${error.message}`);
    await Lesson.findByIdAndUpdate(lessonId, {
      videoStatus: 'failed',
      videoProgressStep: `Error: ${error.message}`,
    });
  }
};

/**
 * @desc   Get video generation status and scene details
 * @route  GET /api/video/status/:lessonId
 * @access Private
 */
/**
 * Generate sensible initial pedagogical scenes from lesson content
 * so the Interactive Teacher has voice and diagrams immediately available.
 */
export const buildInitialLessonScenes = (lesson) => {
  const takeaways = lesson.keyTakeaways || [];
  const examples = lesson.examples || [];
  const summary = lesson.summary || lesson.content?.slice(0, 300) || '';

  return [
    {
      scene_id: 1,
      title: `Introduction: ${lesson.title}`,
      duration: 10,
      narration: `Welcome to this lesson on ${lesson.title}. In this session, we will break down the essential intuition and understand how it works step by step. ${summary.slice(0, 150)}`,
      visual_description: `Overview and intuition of ${lesson.title}`,
      animation_steps: ['Introduce core topic', 'Establish motivation', 'Outline learning goals'],
      on_screen_text: takeaways.slice(0, 3).length > 0 ? takeaways.slice(0, 3) : ['Core Intuition', 'Mechanism', 'Application'],
      important_keywords: [lesson.title?.slice(0, 18) || 'Topic', 'Fundamentals'],
      diagram_type: 'concept_map',
      diagram_data: {
        central: lesson.title?.slice(0, 20) || 'Concept',
        branches: takeaways.slice(0, 3).length > 0 ? takeaways.slice(0, 3) : ['Core Intuition', 'Mechanism', 'Application'],
      },
      transition: 'fade',
      educational_purpose: 'introduce_concept',
    },
    {
      scene_id: 2,
      title: `Mechanism & Core Principles`,
      duration: 12,
      narration: `Now let's examine the inner mechanisms. Notice how the components interact and transform information. ${takeaways[0] ? `Specifically: ${takeaways[0]}.` : ''} Every step plays a vital role in ensuring consistent and accurate results.`,
      visual_description: `Step-by-step process architecture of ${lesson.title}`,
      animation_steps: ['Analyze input parameters', 'Process through transformation stage', 'Produce predictable output'],
      on_screen_text: takeaways.length >= 2 ? takeaways.slice(0, 3) : ['Step 1: Input', 'Step 2: Processing', 'Step 3: Outcome'],
      important_keywords: ['Mechanism', 'Process Flow'],
      diagram_type: 'process',
      diagram_data: {
        steps: ['Input Specification', 'Execution Logic', 'Verified Output'],
        description: 'Core operational pipeline',
      },
      transition: 'fade',
      educational_purpose: 'explain_concept',
    },
    {
      scene_id: 3,
      title: `Application & Practical Example`,
      duration: 11,
      narration: examples[0]
        ? `To see this in action, consider ${examples[0].title || 'this practical scenario'}. ${examples[0].description || ''}`
        : `Let's connect this concept to a real-world scenario. Notice how applying these principles simplifies complex workflows and accelerates problem solving.`,
      visual_description: `Practical example demonstrating ${lesson.title}`,
      animation_steps: ['Set up real-world scenario', 'Apply core technique', 'Observe breakthrough outcome'],
      on_screen_text: ['Practical Context', 'Implementation', 'Validated Result'],
      important_keywords: ['Application', 'Real-world'],
      diagram_type: 'comparison',
      diagram_data: {
        left: { title: 'Standard Approach', points: ['Manual effort', 'Limited scale'] },
        right: { title: 'Modern Technique', points: ['Automated flow', 'High efficiency'] },
      },
      transition: 'fade',
      educational_purpose: 'demonstrate_example',
    },
    {
      scene_id: 4,
      title: `Summary & Key Takeaways`,
      duration: 10,
      narration: `To wrap up our lesson on ${lesson.title}: remember that understanding the foundational mechanism makes mastering advanced topics much simpler. Review the key takeaways below!`,
      visual_description: `Key takeaways summary for ${lesson.title}`,
      animation_steps: ['Synthesize key concepts', 'Highlight primary takeaway', 'Prepare for next milestone'],
      on_screen_text: takeaways.slice(0, 3).length > 0 ? takeaways.slice(0, 3) : ['Core Mastery', 'Key Takeaway', 'Next Milestone'],
      important_keywords: ['Summary', 'Next Steps'],
      diagram_type: 'timeline',
      diagram_data: {
        events: ['Foundations', 'Mechanisms', 'Mastery'],
      },
      transition: 'fade',
      educational_purpose: 'recap',
    },
  ];
};

/**
 * @desc   Get video generation status and scene details
 * @route  GET /api/video/status/:lessonId
 * @access Private
 */
export const getVideoStatus = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const lesson = await Lesson.findById(lessonId).select(
    'title content summary keyTakeaways examples videoStatus videoProgress videoProgressStep videoUrl videoStyle learningLevel scenes'
  );

  if (!lesson) {
    throw createError('Lesson not found', 404);
  }

  // If scenes are not yet populated, create initial scenes so Interactive Teacher works immediately
  if ((!lesson.scenes || lesson.scenes.length === 0) && (lesson.videoStatus === 'none' || lesson.videoStatus === 'failed')) {
    const initialScenes = buildInitialLessonScenes(lesson);
    lesson.scenes = initialScenes;
    await Lesson.findByIdAndUpdate(lessonId, { scenes: initialScenes });
  }

  sendSuccess(res, {
    lessonId: lesson._id,
    title: lesson.title,
    videoStatus: lesson.videoStatus,
    videoProgress: lesson.videoProgress,
    videoProgressStep: lesson.videoProgressStep,
    videoUrl: lesson.videoUrl,
    videoStyle: lesson.videoStyle,
    learningLevel: lesson.learningLevel,
    scenes: lesson.scenes || [],
  }, 'Video status fetched');
});

/**
 * @desc   Regenerate a single scene with refined narration/diagram
 * @route  POST /api/video/regenerate-scene/:lessonId/:sceneId
 * @access Private
 */
export const regenerateScene = asyncHandler(async (req, res) => {
  const { lessonId, sceneId } = req.params;
  const { feedback, lang = 'en', learningLevel = 'beginner', videoStyle = 'technical' } = req.body;

  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw createError('Lesson not found', 404);

  const sceneIndex = (lesson.scenes || []).findIndex((s) => Number(s.scene_id) === Number(sceneId));
  if (sceneIndex === -1) throw createError('Scene not found', 404);

  const oldScene = lesson.scenes[sceneIndex];

  // 1. Call AI to regenerate pedagogical scene
  const updatedSceneData = await regenerateSingleScene(oldScene, lesson.content, {
    feedback,
    learningLevel,
    videoStyle,
  });

  // 2. Re-render only that scene and rebuild MP4
  const result = await reRenderSingleScene(lesson, Number(sceneId), updatedSceneData, { lang });

  lesson.scenes = result.scenes;
  lesson.videoUrl = result.videoUrl;
  await lesson.save();

  sendSuccess(res, {
    scene: result.scenes.find((s) => Number(s.scene_id) === Number(sceneId)),
    videoUrl: result.videoUrl,
    scenes: result.scenes,
  }, `Scene #${sceneId} regenerated successfully`);
});

/**
 * @desc   Download the rendered MP4 video
 * @route  GET /api/video/download/:lessonId
 * @access Public / Private
 */
export const downloadVideo = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const lesson = await Lesson.findById(lessonId);

  if (!lesson || !lesson.videoUrl) {
    throw createError('No video available for this lesson', 404);
  }

  const filePath = path.join(ROOT_DIR, lesson.videoUrl.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) {
    throw createError('Video file not found on server', 404);
  }

  const safeTitle = lesson.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.download(filePath, `${safeTitle}_Lesson.mp4`);
});
