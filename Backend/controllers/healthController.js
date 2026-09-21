import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFfmpegPath } from '../services/binaryResolver.js';
import {
  getActiveProvider,
  isGrokConfigured,
  isGroqConfigured,
  isGeminiConfigured,
} from '../ai/groqClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DB_STATE_MAP = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Controller providing comprehensive system health diagnostics
 * @route GET /api/health
 */
export const getHealth = (req, res) => {
  const dbStateCode = mongoose.connection.readyState;
  const dbStatus = DB_STATE_MAP[dbStateCode] || 'unknown';
  const isDbConnected = dbStateCode === 1;

  // FFmpeg binary availability
  const ffmpegPath = getFfmpegPath();
  const hasFfmpeg = Boolean(ffmpegPath);

  // AI Provider status
  const activeProvider = getActiveProvider();
  const hasAiConfigured = activeProvider !== 'none';

  // Storage writable check
  let uploadsWritable = false;
  try {
    const uploadsDir = path.join(ROOT_DIR, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      uploadsWritable = true;
    }
  } catch {
    uploadsWritable = false;
  }

  // Determine overall service state
  let overallStatus = 'healthy';
  if (!isDbConnected) {
    overallStatus = 'unhealthy';
  } else if (!hasAiConfigured || !hasFfmpeg) {
    overallStatus = 'degraded';
  }

  const memory = process.memoryUsage();
  const toMB = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const healthPayload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown',
    },
    services: {
      ffmpeg: {
        available: hasFfmpeg,
        binary: ffmpegPath ? path.basename(ffmpegPath) : null,
      },
      ai: {
        activeProvider,
        configured: hasAiConfigured,
        providers: {
          grok: isGrokConfigured(),
          groq: isGroqConfigured(),
          gemini: isGeminiConfigured(),
        },
      },
    },
    storage: {
      uploadsWritable,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        heapUsed: toMB(memory.heapUsed),
        heapTotal: toMB(memory.heapTotal),
        rss: toMB(memory.rss),
      },
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  return res.status(statusCode).json(healthPayload);
};

export default getHealth;
