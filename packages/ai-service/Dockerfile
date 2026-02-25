# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifest and lock file
COPY package.json package-lock.json ./

# Copy all workspace package manifests (required for npm workspaces resolution)
COPY packages/ai-service/package.json ./packages/ai-service/
COPY packages/bot/package.json ./packages/bot/
COPY packages/capture/package.json ./packages/capture/
COPY packages/capture-app/package.json ./packages/capture-app/

# Install workspace dependencies
RUN npm install --workspace=packages/ai-service --include-workspace-root

# Copy source
COPY packages/ai-service/ ./packages/ai-service/

# Build TypeScript
RUN npm run build --workspace=packages/ai-service

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/packages/ai-service/dist ./dist
COPY --from=builder /app/packages/ai-service/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3457

EXPOSE 3457

CMD ["node", "dist/index.js"]
