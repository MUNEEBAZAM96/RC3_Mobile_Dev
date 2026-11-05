FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc && npm prune --omit=dev && chmod -R a+rX /app

ENV NODE_ENV=production
USER node
EXPOSE 8080

CMD ["node", "dist/index.js"]
