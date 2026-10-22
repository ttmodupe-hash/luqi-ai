# LUQI web/API: Node service. Python workloads use Dockerfile.python separately.
FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache bash

COPY package*.json ./
RUN npm install --legacy-peer-deps --include=dev
ENV PATH="/app/node_modules/.bin:${PATH}"

COPY . .
RUN chmod +x ./start.sh

# Do not suppress errors: every build must pass integrity and bundling checks.
RUN node scripts/verify-build.mjs \
    && npx vite build \
    && npx esbuild api/boot.ts --platform=node --bundle --format=esm --outdir=dist --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);" \
    && node scripts/postbuild.js

RUN test -f dist/boot.js && test -f dist/public/index.html

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
ENTRYPOINT ["/bin/bash", "./start.sh"]
