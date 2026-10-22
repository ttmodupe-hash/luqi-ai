# LUQI web/API: Node service. Python workloads use Dockerfile.python separately.
FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache bash

COPY package*.json ./
RUN npm ci --legacy-peer-deps --include=dev
ENV PATH="/app/node_modules/.bin:${PATH}"

COPY . .
RUN chmod +x ./start.sh

# Do not suppress errors: every build must pass integrity and bundling checks.
RUN node scripts/verify-build.mjs \
    && npm run build

RUN test -s dist/boot.js && test -s dist/public/index.html && test -s dist/reset-account-password.js

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
ENTRYPOINT ["/bin/bash", "./start.sh"]
