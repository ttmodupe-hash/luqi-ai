FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

# Copy package files
COPY package.json ./

# Install ALL dependencies including devDependencies (needed for build)
RUN npm install --legacy-peer-deps --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify build output exists
RUN ls -la dist/
RUN ls -la dist/public/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/boot.js"]
