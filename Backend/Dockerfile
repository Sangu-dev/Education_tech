# ==============================================================================
# Production Dockerfile for ELearnAI Backend
# Combines Node.js 20, Python 3 (edge-tts, Pillow), and FFmpeg
# ==============================================================================

FROM node:20-bookworm-slim

# Set environment
ENV NODE_ENV=production \
    PORT=5000 \
    PUPPETEER_SKIP_DOWNLOAD=true

# Install system dependencies: Python 3, pip, ffmpeg, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure storage and log directories exist
RUN mkdir -p uploads/audio uploads/videos logs

# Expose server port
EXPOSE 5000

# Health check probe using the diagnostic endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
