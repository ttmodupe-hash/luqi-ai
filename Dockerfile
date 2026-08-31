# =====================================================================
# LUQI AI — Production Dockerfile
# Multi-stage build for minimal image size
# =====================================================================

# ── Stage 1: Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production && npm cache clean --force

# ── Stage 2: Builder ────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ── Stage 3: Production Runner ──────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Create backups directory for self-healing
RUN mkdir -p /app/backups

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/trpc/ping || exit 1

EXPOSE 3000

CMD ["node", "dist/boot.js"]
