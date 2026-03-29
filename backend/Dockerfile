# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

# Install only production dependencies for a lean runtime image.
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy production node_modules from deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy backend source. .dockerignore excludes heavy and local-only files.
COPY . .

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
USER nodeuser

EXPOSE 4000

CMD ["node", "server.js"]
