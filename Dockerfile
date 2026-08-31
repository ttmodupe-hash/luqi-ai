# =====================================================================
# LUQI AI — Production Dockerfile (Railway-optimized)
# =====================================================================

FROM node:20-alpine

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy package files
COPY package.json ./

# Install dependencies (use npm install, not npm ci — no lockfile needed)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify build output exists
RUN test -f dist/boot.js || (echo "Build failed: dist/boot.js not found" && exit 1)
RUN test -f dist/public/index.html || (echo "Build failed: dist/public/index.html not found" && exit 1)

# Create backups directory
RUN mkdir -p /app/backups

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/trpc/ping || exit 1

EXPOSE 3000

CMD ["node", "dist/boot.js"]
