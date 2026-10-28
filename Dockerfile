# LUQI web/API: Node service. Python workloads use Dockerfile.python separately.
FROM node:22-alpine

# /app collides with this repository's app/ tree in Vite's absolute-URL resolver.
# Use a non-colliding physical root; preserve /app for existing operator commands.
WORKDIR /srv/luqi
RUN ln -s /srv/luqi /app
RUN apk add --no-cache bash openssl ca-certificates

COPY package*.json ./
RUN npm ci --legacy-peer-deps --include=dev
ENV PATH="/srv/luqi/node_modules/.bin:${PATH}"

COPY . .
RUN chmod +x ./start.sh

# Do not suppress errors: verify the graph and bytes inside the real image.
RUN node scripts/verify-build.mjs \
    && npm run build \
    && node scripts/verify-production-frontend.mjs

RUN test -s dist/boot.js && test -s dist/public/index.html && test -s dist/reset-account-password.js && test -s dist/prepare-mysql-schema.js && test -s dist/prepare-mysql-runtime-role.js

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# The web process needs readable bundles and network/database access, not root.
USER node
ENTRYPOINT ["/bin/bash", "./start.sh"]
