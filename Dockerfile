# syntax=docker/dockerfile:1
# YesLocker Multi-Stage Build - Railway Deployment
# Hybrid approach: Frontend build + Legacy backend (with TypeScript architecture ready for future)

# ============= FRONTEND BUILD STAGE =============
FROM node:lts-alpine AS frontend-build
WORKDIR /app

# Build user application
COPY package*.json ./
RUN npm ci

# Copy source and build user app  
COPY . ./
RUN npm run build:client

# Build admin panel
WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm ci  
COPY admin/ ./
RUN npm run build

# ============= BACKEND PREPARATION =============
FROM node:lts-alpine AS backend-prep
WORKDIR /app/server

# Install backend dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy all server files (including legacy and TypeScript architecture)
COPY server/ ./

# ============= PRODUCTION RUNTIME STAGE =============
FROM node:lts-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S yeslocker -u 1001

# Copy frontend build artifacts
COPY --from=frontend-build --chown=yeslocker:nodejs /app/dist ./public/
COPY --from=frontend-build --chown=yeslocker:nodejs /app/admin/dist ./admin/dist/

# Copy backend files (production dependencies already installed)
COPY --from=backend-prep --chown=yeslocker:nodejs /app/server ./server/

# Set up proper file permissions
RUN chown -R yeslocker:nodejs /app

# Switch to non-root user
USER yeslocker

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-3001}/api/health', (res) => { \
    if (res.statusCode === 200) process.exit(0); else process.exit(1); \
  }).on('error', () => process.exit(1))"

# Expose port (Railway will override with PORT environment variable)
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start legacy server (Railway-compatible)
# NOTE: TypeScript architecture available in server/src/ for future migration
CMD ["node", "server/index-railway.js"]