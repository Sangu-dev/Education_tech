import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let cachedFfmpegPath = null;
let searched = false;

/**
 * Dynamically resolves the FFmpeg executable across environment sources
 * 1. ffmpeg-static package
 * 2. System PATH
 * 3. Local Backend/bin directory
 * @returns {string|null} Resolved executable path or null if unavailable
 */
export const getFfmpegPath = () => {
  if (cachedFfmpegPath && fs.existsSync(cachedFfmpegPath)) {
    return cachedFfmpegPath;
  }

  if (searched && cachedFfmpegPath === null) {
    return null;
  }

  searched = true;

  // 1. Try ffmpeg-static in Backend/node_modules
  try {
    const ffmpegStaticPath = path.join(ROOT_DIR, 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(ffmpegStaticPath)) {
      cachedFfmpegPath = ffmpegStaticPath;
      logger.info(`FFmpeg binary resolved via ffmpeg-static: ${cachedFfmpegPath}`);
      return cachedFfmpegPath;
    }
  } catch (err) {
    logger.debug(`ffmpeg-static check failed: ${err.message}`);
  }

  // 2. Try root node_modules/ffmpeg-static
  try {
    const rootFfmpegStaticPath = path.join(ROOT_DIR, '..', 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(rootFfmpegStaticPath)) {
      cachedFfmpegPath = rootFfmpegStaticPath;
      logger.info(`FFmpeg binary resolved via root ffmpeg-static: ${cachedFfmpegPath}`);
      return cachedFfmpegPath;
    }
  } catch (_err) {
    /* ignore root check failure */
  }

  // 3. Try system PATH
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    const output = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 }).toString();
    const firstLine = output.split(/[\r\n]+/)[0]?.trim();
    if (firstLine && fs.existsSync(firstLine)) {
      cachedFfmpegPath = firstLine;
      logger.info(`FFmpeg binary resolved from system PATH: ${cachedFfmpegPath}`);
      return cachedFfmpegPath;
    }
  } catch (_err) {
    /* ignore system PATH lookup failure */
  }

  // 4. Try local Backend/bin directory
  const localBin = path.join(ROOT_DIR, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (fs.existsSync(localBin)) {
    cachedFfmpegPath = localBin;
    logger.info(`FFmpeg binary resolved from local bin directory: ${cachedFfmpegPath}`);
    return cachedFfmpegPath;
  }

  logger.warn('⚠️ FFmpeg executable was not found. MP4 video encoding will be disabled until FFmpeg is available.');
  cachedFfmpegPath = null;
  return null;
};

/**
 * Returns true if FFmpeg is ready for video operations
 */
export const isFfmpegAvailable = () => {
  return Boolean(getFfmpegPath());
};

export default getFfmpegPath;
