# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifest and lock file
COPY package.json package-lock.json ./

# Copy only ai-service package manifest first (for layer caching)
COPY packages/ai-service/package.json ./packages/ai-service/

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
