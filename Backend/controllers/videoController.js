import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Lesson from '../models/Lesson.js';
import { generateLessonTeacherScenes, regenerateSingleScene } from '../services/aiService.js';
import { renderCompleteLessonVideo, reRenderSingleScene } from '../services/animationService.js';
import { asyncHandler, sendSuccess, createError } from '../utils/responseHelper.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Track active video rendering jobs to prevent concurrent duplicate workers on the same lesson
const activeVideoJobs = new Set();

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

  // If a render is already running for this lesson, return current status immediately
  if (activeVideoJobs.has(lessonId.toString()) || lesson.videoStatus === 'processing') {
    logger.info(`Video generation already in progress for lesson ${lessonId}. Returning existing status.`);
    return sendSuccess(res, {
      lessonId: lesson._id,
      videoStatus: 'processing',
      videoProgress: lesson.videoProgress || 15,
      videoProgressStep: lesson.videoProgressStep || 'Video generation already in progress',
    }, 'Video generation already in progress');
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
  const idStr = lessonId.toString();
  if (activeVideoJobs.has(idStr)) {
    logger.warn(`Video generation already in progress for lesson ${idStr}. Skipping duplicate invocation.`);
    return;
  }
  activeVideoJobs.add(idStr);

  const { learningLevel = 'beginner', videoStyle = 'technical', lang = 'en', forceRegenerateScenes = false } = options;
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    activeVideoJobs.delete(idStr);
    return;
  }

  try {
    let scenesToRender = (lesson.scenes && lesson.scenes.length > 0) ? lesson.scenes : null;
    const needsRegen = !scenesToRender || forceRegenerateScenes || !scenesToRender[0]?.slide_type;

    if (needsRegen) {
      // 1. Grok AI Teacher programmatic slide planning
      logger.info(`AI Teacher planning structured programmatic slides for: "${lesson.title}"`);
      await Lesson.findByIdAndUpdate(lessonId, {
        videoProgress: 15,
        videoProgressStep: 'Understanding concepts & designing programmatic slides',
      });

      const planData = await generateLessonTeacherScenes(lesson.title, lesson.content || lesson.summary || '', {
        learningLevel,
        videoStyle,
      });

      lesson.scenes = planData.scenes;
      await lesson.save();
      scenesToRender = planData.scenes;
    } else {
      logger.info(`Using ${scenesToRender.length} existing structured scenes for: "${lesson.title}"`);
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
  } finally {
    activeVideoJobs.delete(idStr);
  }
};

/**
 * @desc   Get video generation status and scene details
 * @route  GET /api/video/status/:lessonId
 * @access Private
 */
/**
 * Generate sensible initial pedagogical scenes from lesson content
 * formatted strictly for the Programmatic Modern Slide Engine.
 */
export const buildInitialLessonScenes = (lesson) => {
  const takeaways = lesson.keyTakeaways || [];
  const examples = lesson.examples || [];
  const summary = lesson.summary || lesson.content?.slice(0, 300) || '';
  const isCloud = (lesson.title || '').toLowerCase().includes('cloud');

  return [
    {
      scene_id: 1,
      title: `Introduction: ${lesson.title}`,
      duration: 9.5,
      duration_estimate: 9.5,
      slide_type: isCloud ? 'cloud_architecture' : 'bullet_list',
      narration: `Welcome to this lesson on ${lesson.title}. In this session, we will break down the essential intuition and understand how it works step by step. ${summary.slice(0, 150)}`,
      on_screen_text: `Foundational Architecture: ${lesson.title.split(' ').slice(0, 4).join(' ')}`,
      bullet_points: takeaways.length >= 2 ? takeaways.slice(0, 3) : [
        'Fundamental conceptual model',
        'On-demand automated resources',
        'Core operational principles',
      ],
      diagram_data: {
        primary_icon: isCloud ? 'cloud' : 'layers',
        nodes: ['Storage', 'Compute', 'Database'],
        stages: ['Request', 'Execution', 'Storage'],
      },
    },
    {
      scene_id: 2,
      title: '3-Stage Processing Pipeline',
      duration: 10,
      duration_estimate: 10,
      slide_type: 'process_flow',
      narration: `Now let's examine the inner mechanisms. Notice how components interact in three connected stages. Every step ensures reliable and efficient processing.`,
      on_screen_text: '3-Stage Scalable Data Pipeline',
      bullet_points: [
        'Stage 1: Input ingestion and validation',
        'Stage 2: Dynamic processing and transform',
        'Stage 3: Persisted storage and delivery',
      ],
      diagram_data: {
        stages: ['1. Ingestion', '2. Dynamic Compute', '3. Persisted Storage'],
      },
    },
    {
      scene_id: 3,
      title: 'Modern Architecture vs Legacy Approach',
      duration: 9.5,
      duration_estimate: 9.5,
      slide_type: 'comparison',
      narration: examples[0]
        ? `To see this in action, consider ${examples[0].title || 'this practical scenario'}. Notice how modern automated workflows replace slow legacy processes.`
        : `Let's compare modern architectures with traditional manual infrastructure. Automated pipelines unlock massive agility and resilience.`,
      on_screen_text: 'Modern Architecture vs Legacy Systems',
      bullet_points: [
        'Eliminates manual maintenance bottlenecks',
        'Instant elastic automated scaling',
        'Predictable high availability',
      ],
      diagram_data: {
        left_title: 'Legacy Approach',
        left_points: ['Manual maintenance', 'Slow rigid capacity'],
        right_title: 'Modern Architecture',
        right_points: ['Automated scaling', 'High availability'],
      },
    },
    {
      scene_id: 4,
      title: 'Summary & Core Takeaways',
      duration: 9.0,
      duration_estimate: 9.0,
      slide_type: 'bullet_list',
      narration: `To wrap up our lesson on ${lesson.title}: remember that mastering these foundational concepts unlocks seamless integration with advanced architectures.`,
      on_screen_text: 'Core Mastery and Key Takeaways',
      bullet_points: takeaways.length >= 2 ? takeaways.slice(0, 3) : [
        'Master the foundational architecture',
        'Leverage automated elastic pipelines',
        'Apply best practices in production',
      ],
      diagram_data: {
        primary_icon: 'star',
        highlight_badge: 'Mastery',
      },
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
