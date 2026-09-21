import 'dotenv/config'; // ← MUST be first so env vars are available to all other imports
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { validateEnv } from './config/envValidator.js';
import { connectDB } from './config/db.js';
import { corsOptions } from './config/corsConfig.js';
import { apiLimiter } from './config/rateLimiter.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { getHealth } from './controllers/healthController.js';
import logger from './utils/logger.js';

// Validate configuration and prepare directories
validateEnv();

// Routes
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import translateRoutes from './routes/translateRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

// dotenv is already loaded at the top of this file via 'import dotenv/config'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Backend/bin (ffmpeg) is in PATH
const binDir = path.join(__dirname, 'bin');
if (fs.existsSync && binDir) {
  process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH || ''}`;
}

const app = express();

// Connect to database
connectDB();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.use(mongoSanitize());

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Static Files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', getHealth);

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/video', videoRoutes);

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

export default app;
