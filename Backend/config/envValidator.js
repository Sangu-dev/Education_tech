import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { getActiveProvider } from '../ai/groqClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Validate environment configuration during application bootstrap.
 * Identifies missing keys, verifies directory structure, and outputs safe diagnostics.
 */
export const validateEnv = () => {
  const issues = [];
  const warnings = [];

  const port = process.env.PORT || 5000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  // 1. Database URI
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    issues.push('Missing MONGO_URI or MONGODB_URI. MongoDB connection will fail.');
  }

  // 2. JWT Secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'your_super_secret_jwt_access_token_key_here' || jwtSecret.includes('your_secret')) {
    if (nodeEnv === 'production') {
      issues.push('JWT_SECRET must be set to a secure unique random string in production.');
    } else {
      warnings.push('JWT_SECRET is using default placeholder. Generate a secure secret before deploying.');
    }
  }

  // 3. AI Providers
  const activeAi = getActiveProvider();
  if (activeAi === 'none') {
    warnings.push('No valid AI API key detected (GROK_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY). Course and quiz generation will be unavailable.');
  }

  // 4. Ensure runtime media and log directories exist
  const requiredDirs = [
    path.join(ROOT_DIR, 'uploads'),
    path.join(ROOT_DIR, 'uploads', 'audio'),
    path.join(ROOT_DIR, 'uploads', 'videos'),
    path.join(ROOT_DIR, 'logs'),
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        issues.push(`Failed to create directory ${dir}: ${err.message}`);
      }
    }
  }

  // Safe bootstrap diagnostics log
  logger.info(`⚙️  Environment: [${nodeEnv}] | Port: [${port}] | Active AI: [${activeAi.toUpperCase()}]`);

  if (warnings.length > 0) {
    for (const w of warnings) {
      logger.warn(`⚠️  Config warning: ${w}`);
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      logger.error(`❌ Config error: ${issue}`);
    }
    if (nodeEnv === 'production') {
      throw new Error(`Fatal configuration errors: ${issues.join('; ')}`);
    }
  }

  return { isValid: issues.length === 0, issues, warnings };
};

export default validateEnv;
