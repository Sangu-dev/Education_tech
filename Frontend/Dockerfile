# ==============================================================================
# Production Dockerfile for ELearnAI Frontend (React + Vite + Tailwind)
# Stage 1: Build static bundle
# Stage 2: Serve via Nginx Alpine with SPA routing and API reverse proxy
# ==============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Web Server
FROM nginx:alpine

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
