# syntax=docker/dockerfile:1
# YesLocker Multi-Stage Build - Railway Deployment
# Hybrid approach: Frontend build + Legacy backend (with TypeScript architecture ready for future)

# ============= FRONTEND BUILD STAGE =============
FROM node:lts-alpine AS frontend-build
WORKDIR /app

# Install dependencies for main app
COPY package*.json ./
RUN echo "📦 Installing main app dependencies..." && \
    npm ci && \
    echo "✅ Main app dependencies installed"

# Copy ALL source files (we'll build both apps)
COPY . ./

# Build user application (main app)
RUN echo "🔨 Starting user application build..." && \
    echo "📁 Current directory contents:" && \
    ls -la && \
    echo "📁 Source directory contents:" && \
    ls -la src/ && \
    echo "🚀 Running: npm run build:client" && \
    npm run build:client && \
    echo "✅ User app build completed" && \
    echo "📁 Checking for dist directory:" && \
    ls -la dist/ || (echo "❌ CRITICAL: User app dist/ directory not found!" && exit 1)

# Build admin panel
WORKDIR /app/admin
RUN echo "📦 Installing admin panel dependencies..." && \
    npm ci && \
    echo "🔨 Building admin panel..." && \
    npm run build && \
    echo "✅ Admin panel build completed" && \
    echo "📁 Admin dist contents:" && \
    ls -la dist/ || (echo "❌ CRITICAL: Admin dist/ directory not found!" && exit 1)

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

# Copy frontend build artifacts to correct locations
COPY --from=frontend-build --chown=yeslocker:nodejs /app/dist ./dist/
COPY --from=frontend-build --chown=yeslocker:nodejs /app/admin/dist ./admin/dist/

# Copy backend files (production dependencies already installed)
COPY --from=backend-prep --chown=yeslocker:nodejs /app/server ./server/

# Verify frontend files are in place
RUN echo "🔍 Verifying frontend builds in production stage:" && \
    ls -la /app/dist/ 2>/dev/null || echo "⚠️  User app dist not found" && \
    ls -la /app/admin/dist/ 2>/dev/null || echo "⚠️  Admin dist not found" && \
    ls -la /app/server/index-railway.js 2>/dev/null || echo "⚠️  Server entry point not found"

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