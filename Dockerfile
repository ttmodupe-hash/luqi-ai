FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

RUN ls -la dist/
RUN ls -la dist/public/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/boot.js"]
