FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --include=dev --ignore-scripts
COPY api/lib/mysqlConfig.ts api/lib/mysqlConfig.ts
COPY db/ db/
COPY scripts/inspect-release-database.ts scripts/inspect-release-database.ts
COPY scripts/prepare-release-feature-storage.ts scripts/prepare-release-feature-storage.ts
RUN node_modules/.bin/esbuild scripts/inspect-release-database.ts --bundle --platform=node --format=esm --outfile=/build/inspect.js --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);"
RUN node_modules/.bin/esbuild scripts/prepare-release-feature-storage.ts --bundle --platform=node --format=esm --outfile=/build/prepare.js --banner:js="import { createRequire } from 'module';const require = createRequire(import.meta.url);"
FROM node:22-alpine
WORKDIR /work
COPY --from=build /build/inspect.js ./inspect.js
COPY --from=build /build/prepare.js ./prepare.js
COPY db/migrations/customer-device-sessions-v1.sql db/migrations/customer-device-sessions-v1.sql
COPY db/migrations/p2p-circles-v1.sql db/migrations/p2p-circles-v1.sql
USER node
CMD ["node","/work/inspect.js"]
