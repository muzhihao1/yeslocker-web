# Use the Node.js LTS alpine official image (Railway best practice)
FROM node:lts-alpine

# Create and change to the app directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY admin/package*.json ./admin/
COPY server/package*.json ./server/

# Install dependencies using npm ci (Railway best practice)
RUN npm ci && \
    cd admin && npm ci && \
    cd ../server && npm ci

# Copy local code to the container image
COPY . ./

# Build the applications
RUN npm run build:client && \
    cd admin && npm run build

# Expose port (Railway automatically sets PORT env var)
EXPOSE 3000

# Start the application with diagnostic startup script
CMD ["node", "start.js"]