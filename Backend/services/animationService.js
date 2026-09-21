import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import logger from '../utils/logger.js';
import { generateSceneNarrationAudio, probeAudioDuration } from './ttsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const VIDEOS_DIR = path.join(ROOT_DIR, 'uploads', 'videos');
const FFMPEG_PATH = path.join(ROOT_DIR, 'bin', 'ffmpeg.exe');
const PYTHON_SCRIPT = path.join(__dirname, 'manimRenderer.py');
const CARD_GENERATOR_SCRIPT = path.join(__dirname, 'cardGenerator.py');

// Ensure videos directory exists
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

/**
 * Execute a command and return promise
 */
function runProcess(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { ...options, windowsHide: true });
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process ${cmd} exited with code ${code}: ${stderr || stdout}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Render a single animated scene via Manim Python script
 */
async function renderManimClip(scene, outputPath, duration) {
  const tempJsonPath = path.join(VIDEOS_DIR, `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`);
  const scenePayload = {
    ...scene,
    duration: Math.max(3, Number(duration || scene.duration || 6)),
  };

  try {
    fs.writeFileSync(tempJsonPath, JSON.stringify(scenePayload, null, 2), 'utf-8');

    // Run Python Manim renderer
    await runProcess('python', [PYTHON_SCRIPT, tempJsonPath, outputPath]);
    return true;
  } catch (error) {
    logger.warn(`Manim clip render failed for scene ${scene.scene_id}: ${error.message}. Using high-quality video fallback.`);
    return false;
  } finally {
    try {
      if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    } catch {}
  }
}

/**
 * High-quality fallback PNG/FFmpeg clip renderer if Manim encounters any runtime constraint
 */
async function renderFallbackClip(scene, outputPath, durationSec) {
  const tempJson = path.join(VIDEOS_DIR, `temp_card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`);
  const tempPng = path.join(VIDEOS_DIR, `temp_card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`);

  try {
    fs.writeFileSync(tempJson, JSON.stringify(scene, null, 2), 'utf-8');
    await runProcess('python', [CARD_GENERATOR_SCRIPT, '--json-file', tempJson, '--output', tempPng]);

    // Convert PNG to MP4 with FFmpeg (PNG is universally supported by FFmpeg)
    const args = [
      '-y',
      '-loop', '1',
      '-i', tempPng,
      '-t', String(durationSec),
      '-vf', 'scale=1280:720,format=yuv420p',
      '-r', '24',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      outputPath,
    ];

    await runProcess(FFMPEG_PATH, args);
    return true;
  } finally {
    try { if (fs.existsSync(tempJson)) fs.unlinkSync(tempJson); } catch {}
    try { if (fs.existsSync(tempPng)) fs.unlinkSync(tempPng); } catch {}
  }
}

/**
 * Synchronize video clip with audio file using FFmpeg
 * Pads/freezes last video frame if audio is longer, ensuring 100% sync
 */
async function muxAudioAndVideo(rawVideoPath, audioPath, outputPath, targetDuration) {
  const actualAudioDuration = await probeAudioDuration(audioPath);
  const duration = Math.max(targetDuration, actualAudioDuration);

  // Use FFmpeg tpad filter to clone the last frame until the audio ends
  const args = [
    '-y',
    '-i', rawVideoPath,
    '-i', audioPath,
    '-filter_complex', `[0:v]tpad=stop_mode=clone:stop_duration=${Math.max(0, duration + 0.2)}[v]`,
    '-map', '[v]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', String(duration),
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  await runProcess(FFMPEG_PATH, args);
  return { duration, outputPath };
}

/**
 * Concatenate multiple synchronized MP4 clips into final video
 */
async function concatenateClips(clipPaths, finalVideoPath) {
  const listFile = path.join(VIDEOS_DIR, `concat_${Date.now()}.txt`);
  const lines = clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listFile, lines, 'utf-8');

  try {
    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      finalVideoPath,
    ];

    await runProcess(FFMPEG_PATH, args);
    return true;
  } finally {
    try {
      if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
    } catch {}
  }
}

/**
 * Full Pipeline: Render all scenes into synchronized MP4 video
 * @param {object} lesson - MongoDB Lesson document
 * @param {Array} scenes - Structured scenes array
 * @param {object} options - { lang, videoStyle, onProgress }
 */
export const renderCompleteLessonVideo = async (lesson, scenes, options = {}) => {
  const {
    lang = 'en',
    videoStyle = 'technical',
    onProgress = () => {},
  } = options;

  const lessonId = lesson._id?.toString() || 'lesson_' + Date.now();
  const finalFilename = `video_${lessonId}_${lang}.mp4`;
  const finalVideoPath = path.join(VIDEOS_DIR, finalFilename);
  const relativeVideoUrl = `/uploads/videos/${finalFilename}`;

  logger.info(`Starting video rendering for lesson ${lessonId} with ${scenes.length} scenes in ${lang}`);
  onProgress('Starting animation & audio pipeline', 10);

  const renderedClips = [];
  const updatedScenes = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneNum = i + 1;
    const progressPct = 10 + Math.round((sceneNum / scenes.length) * 75);

    onProgress(`Rendering Scene ${sceneNum} of ${scenes.length}: "${scene.title}"`, progressPct);

    // 1. Generate / retrieve synchronized TTS audio
    const audioResult = await generateSceneNarrationAudio(scene.narration, {
      lessonId,
      sceneId: scene.scene_id || sceneNum,
      lang,
    });

    const sceneDuration = Math.max(3.5, audioResult.duration);

    // 2. Render visual clip (Manim with fallback)
    const rawClipPath = path.join(VIDEOS_DIR, `raw_${lessonId}_${scene.scene_id}.mp4`);
    const muxedClipPath = path.join(VIDEOS_DIR, `clip_${lessonId}_${scene.scene_id}_${lang}.mp4`);

    let visualSuccess = await renderManimClip(scene, rawClipPath, sceneDuration);
    if (!visualSuccess || !fs.existsSync(rawClipPath)) {
      await renderFallbackClip(scene, rawClipPath, sceneDuration);
    }

    // 3. Mux audio + video with perfect synchronization
    await muxAudioAndVideo(rawClipPath, audioResult.filePath, muxedClipPath, sceneDuration);

    renderedClips.push(muxedClipPath);

    // Update scene metadata
    updatedScenes.push({
      ...scene,
      duration: sceneDuration,
      audioUrl: audioResult.audioUrl,
      videoClipUrl: `/uploads/videos/${path.basename(muxedClipPath)}`,
    });

    // Cleanup raw clip
    try {
      if (fs.existsSync(rawClipPath)) fs.unlinkSync(rawClipPath);
    } catch {}
  }

  // 4. Concatenate all scene clips into final MP4 video
  onProgress('Assembling final MP4 video', 92);
  logger.info(`Concatenating ${renderedClips.length} scene clips into final video: ${finalVideoPath}`);
  await concatenateClips(renderedClips, finalVideoPath);

  onProgress('Video finalized and ready', 100);
  logger.info(`✅ Video successfully generated: ${relativeVideoUrl}`);

  return {
    videoUrl: relativeVideoUrl,
    scenes: updatedScenes,
  };
};

/**
 * Regenerate and re-render only one specific scene and rebuild final video
 */
export const reRenderSingleScene = async (lesson, targetSceneId, newSceneData, options = {}) => {
  const { lang = 'en', scenes: overrideScenes } = options;
  const lessonId = lesson._id?.toString() || 'lesson';
  const existingScenes = [...(overrideScenes || lesson.scenes || [])];

  const sceneIndex = existingScenes.findIndex((s) => Number(s.scene_id) === Number(targetSceneId));
  if (sceneIndex === -1) {
    throw new Error(`Scene #${targetSceneId} not found in lesson`);
  }

  // Update scene in array
  existingScenes[sceneIndex] = {
    ...existingScenes[sceneIndex],
    ...newSceneData,
    scene_id: targetSceneId,
  };

  const scene = existingScenes[sceneIndex];

  // 1. Generate audio for this scene
  const audioResult = await generateSceneNarrationAudio(scene.narration, {
    lessonId,
    sceneId: targetSceneId,
    lang,
  });

  const sceneDuration = Math.max(3.5, audioResult.duration);

  // 2. Render visual clip
  const rawClipPath = path.join(VIDEOS_DIR, `raw_${lessonId}_${targetSceneId}.mp4`);
  const muxedClipPath = path.join(VIDEOS_DIR, `clip_${lessonId}_${targetSceneId}_${lang}.mp4`);

  let visualSuccess = await renderManimClip(scene, rawClipPath, sceneDuration);
  if (!visualSuccess || !fs.existsSync(rawClipPath)) {
    await renderFallbackClip(scene, rawClipPath, sceneDuration);
  }

  // 3. Mux audio + video
  await muxAudioAndVideo(rawClipPath, audioResult.filePath, muxedClipPath, sceneDuration);

  existingScenes[sceneIndex].duration = sceneDuration;
  existingScenes[sceneIndex].audioUrl = audioResult.audioUrl;
  existingScenes[sceneIndex].videoClipUrl = `/uploads/videos/${path.basename(muxedClipPath)}`;

  try {
    if (fs.existsSync(rawClipPath)) fs.unlinkSync(rawClipPath);
  } catch {}

  // 4. Collect all clips and re-concatenate
  const allClips = existingScenes.map((s) => {
    return path.join(VIDEOS_DIR, `clip_${lessonId}_${s.scene_id}_${lang}.mp4`);
  });

  // Verify all clips exist, otherwise render missing ones
  for (let i = 0; i < existingScenes.length; i++) {
    const clipP = allClips[i];
    if (!fs.existsSync(clipP)) {
      const s = existingScenes[i];
      const aRes = await generateSceneNarrationAudio(s.narration, { lessonId, sceneId: s.scene_id, lang });
      const rClip = path.join(VIDEOS_DIR, `raw_${lessonId}_${s.scene_id}.mp4`);
      await renderFallbackClip(s, rClip, aRes.duration);
      await muxAudioAndVideo(rClip, aRes.filePath, clipP, aRes.duration);
      try { if (fs.existsSync(rClip)) fs.unlinkSync(rClip); } catch {}
    }
  }

  const finalFilename = `video_${lessonId}_${lang}.mp4`;
  const finalVideoPath = path.join(VIDEOS_DIR, finalFilename);
  await concatenateClips(allClips, finalVideoPath);

  return {
    videoUrl: `/uploads/videos/${finalFilename}`,
    scenes: existingScenes,
  };
};
