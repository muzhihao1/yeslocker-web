# Multi-stage build for YesLocker
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY admin/package*.json ./admin/
COPY server/package*.json ./server/

# Install all dependencies
RUN npm install
RUN cd admin && npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build client and admin
RUN npm run build:client
RUN cd admin && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built files and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/admin/dist ./admin/dist
COPY --from=builder /app/server ./server

# Install production dependencies
RUN cd server && npm ci --only=production

# Create a health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/index-railway.js"]