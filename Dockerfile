FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

# Copy package files
COPY package.json ./

# Install ALL dependencies including devDependencies
RUN npm install --legacy-peer-deps --include=dev

# Add node_modules/.bin to PATH so vite/esbuild are found
ENV PATH="/app/node_modules/.bin:${PATH}"

# Copy source code
COPY . .

# Build the application (npx ensures binaries are found)
RUN npx vite build && npx esbuild api/boot.ts --platform=node --bundle --format=esm --outdir=dist --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);" && node scripts/postbuild.js

# Verify build output exists
RUN test -f dist/boot.js || (echo "ERROR: dist/boot.js not created" && exit 1)
RUN test -f dist/public/index.html || (echo "ERROR: dist/public/index.html not created" && exit 1)

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/boot.js"]
