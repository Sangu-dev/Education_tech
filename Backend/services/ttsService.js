import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT_DIR, 'uploads', 'audio');
const FFMPEG_PATH = path.join(ROOT_DIR, 'bin', 'ffmpeg.exe');

// Ensure audio dir exists
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Supported languages
const LANG_MAP = {
  en: 'en',
  hi: 'hi',
  kn: 'kn',
  te: 'te',
  ta: 'ta',
  ml: 'ml',
};

/**
 * Split text into chunks that fit within Google TTS limits (~180 chars)
 */
function splitIntoTTSChunks(text, maxLen = 180) {
  if (!text) return [];
  // Clean markdown, symbols
  const clean = text
    .replace(/[#*`_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = clean.match(/[^।.!?]+[।.!?]*/g) || [clean];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = s.trim();
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}

/**
 * Fetch a single audio buffer from Google TTS
 */
function fetchTTSChunk(text, lang = 'en') {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text.slice(0, 200));
    const gttsLang = LANG_MAP[lang] || 'en';
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${gttsLang}&client=tw-ob&ttsspeed=0.95`;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
      timeout: 10000,
    };

    const req = https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS failed with status code ${res.statusCode}`));
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TTS request timed out'));
    });
  });
}

/**
 * Probe exact duration of an audio file in seconds via FFmpeg
 */
export const probeAudioDuration = (filePath) => {
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG_PATH, ['-i', filePath]);
    let stderr = '';

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', () => {
      // Look for Duration: 00:00:12.34
      const match = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      if (match) {
        const hours = parseFloat(match[1]);
        const minutes = parseFloat(match[2]);
        const seconds = parseFloat(match[3]);
        const totalSec = hours * 3600 + minutes * 60 + seconds;
        return resolve(Math.max(1, totalSec));
      }
      // Fallback estimate: 8 seconds
      resolve(8);
    });

    proc.on('error', () => {
      resolve(8);
    });
  });
};

/**
 * Generate silent MP3 if TTS is unavailable as a fallback
 */
function generateSilentMP3(durationSec, outputPath) {
  return new Promise((resolve) => {
    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', `anullsrc=r=24000:cl=mono`,
      '-t', String(durationSec),
      '-q:a', '9',
      outputPath,
    ];
    const proc = spawn(FFMPEG_PATH, args);
    proc.on('close', () => resolve(true));
    proc.on('error', () => resolve(false));
  });
}

const EDGE_TTS_SCRIPT = path.join(__dirname, 'edgeTtsHelper.py');

/**
 * Generate speech via Python Edge-TTS helper
 */
function generateEdgeTTS(text, lang, outputPath) {
  return new Promise((resolve, reject) => {
    const tempTextFile = path.join(AUDIO_DIR, `temp_text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    fs.writeFileSync(tempTextFile, text || '', 'utf-8');

    const proc = spawn('python', [
      EDGE_TTS_SCRIPT,
      '--text-file', tempTextFile,
      '--lang', lang,
      '--output', outputPath,
    ], { windowsHide: true });

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      try { if (fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile); } catch {}
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 500) {
        resolve(true);
      } else {
        reject(new Error(`edge-tts failed (code ${code}): ${stderr || stdout}`));
      }
    });

    proc.on('error', (err) => {
      try { if (fs.existsSync(tempTextFile)) fs.unlinkSync(tempTextFile); } catch {}
      reject(err);
    });
  });
}

/**
 * Generate full narration MP3 for a scene, measure duration, and return file URL
 * @param {string} text - The narration text
 * @param {object} options - { lessonId, sceneId, lang }
 * @returns {Promise<{ audioUrl: string, duration: number, filePath: string }>}
 */
export const generateSceneNarrationAudio = async (text, options = {}) => {
  const {
    lessonId = 'temp',
    sceneId = 1,
    lang = 'en',
  } = options;

  const textHash = crypto.createHash('md5').update((text || '') + '_' + lang).digest('hex').slice(0, 8);
  const filename = `scene_${lessonId}_${sceneId}_${lang}_${textHash}.mp3`;
  const filePath = path.join(AUDIO_DIR, filename);
  const relativeUrl = `/uploads/audio/${filename}`;

  // Check cache
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    const duration = await probeAudioDuration(filePath);
    logger.info(`TTS Cache hit for scene ${sceneId} (${duration.toFixed(1)}s): ${filename}`);
    return { audioUrl: relativeUrl, duration, filePath };
  }

  const cleanText = (text || '').replace(/[#*`_~]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleanText) {
    await generateSilentMP3(3, filePath);
    return { audioUrl: relativeUrl, duration: 3, filePath };
  }

  logger.info(`Generating neural narration for scene #${sceneId} in ${lang}`);

  // 1. Primary Engine: Edge-TTS Neural Voice
  try {
    await generateEdgeTTS(cleanText, lang, filePath);
    const duration = await probeAudioDuration(filePath);
    logger.info(`✅ Edge-TTS audio saved for scene ${sceneId}: ${duration.toFixed(1)}s (${filename})`);
    return { audioUrl: relativeUrl, duration, filePath };
  } catch (edgeErr) {
    logger.warn(`Edge-TTS unavailable (${edgeErr.message}). Falling back to Google TTS chunking.`);
  }

  // 2. Secondary Engine: Google TTS fallback
  const chunks = splitIntoTTSChunks(cleanText);
  try {
    const buffers = [];
    for (const chunk of chunks) {
      try {
        const buf = await fetchTTSChunk(chunk, lang);
        buffers.push(buf);
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        logger.warn(`Google TTS chunk failed: ${err.message}. Retrying once...`);
        try {
          await new Promise((r) => setTimeout(r, 250));
          const retryBuf = await fetchTTSChunk(chunk, lang);
          buffers.push(retryBuf);
        } catch {
          logger.error(`Skipping failed Google TTS chunk`);
        }
      }
    }

    if (buffers.length > 0) {
      const combined = Buffer.concat(buffers);
      fs.writeFileSync(filePath, combined);
      const duration = await probeAudioDuration(filePath);
      logger.info(`✅ Google TTS saved for scene ${sceneId}: ${duration.toFixed(1)}s`);
      return { audioUrl: relativeUrl, duration, filePath };
    } else {
      throw new Error('No audio buffers received from Google TTS');
    }
  } catch (googleErr) {
    logger.error(`Google TTS fallback also failed for scene ${sceneId}: ${googleErr.message}`);
    // Estimated duration: ~2.5 words per sec
    const words = cleanText.split(/\s+/).length;
    const estSec = Math.max(4, Math.round(words / 2.5));
    await generateSilentMP3(estSec, filePath);
    return { audioUrl: relativeUrl, duration: estSec, filePath };
  }
};

