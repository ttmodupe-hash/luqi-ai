FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

# Copy package files from root (package-lock.json included when present)
COPY package*.json ./

# Install ALL dependencies including devDependencies
RUN npm install --legacy-peer-deps --include=dev

# Add node_modules/.bin to PATH so vite/esbuild are found
ENV PATH="/app/node_modules/.bin:${PATH}"

# Copy all application source, api, scripts, and configs from repo root
COPY . .

RUN chmod +x ./start.sh

# Build the application (verify gate → frontend → backend bundle → postbuild)
RUN node scripts/verify-build.mjs && npx vite build && npx esbuild api/boot.ts --platform=node --bundle --format=esm --outdir=dist --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);" && node scripts/postbuild.js

# Verify build output exists
RUN test -f dist/boot.js || (echo "ERROR: dist/boot.js not created" && exit 1)
RUN test -f dist/public/index.html || (echo "ERROR: dist/public/index.html not created" && exit 1)

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bash", "start.sh"]
