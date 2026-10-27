FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --include=dev --ignore-scripts
COPY api/lib/mysqlConfig.ts api/lib/mysqlConfig.ts
COPY db/ db/
COPY scripts/inspect-release-database.ts scripts/inspect-release-database.ts
RUN node_modules/.bin/esbuild scripts/inspect-release-database.ts --bundle --platform=node --format=esm --outfile=/build/inspect.js --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);"
FROM node:22-alpine
WORKDIR /work
COPY --from=build /build/inspect.js ./inspect.js
USER node
CMD ["node","/work/inspect.js"]
