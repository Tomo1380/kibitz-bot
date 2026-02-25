# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (sodium-native, @discordjs/opus)
RUN apk add --no-cache python3 make g++ libsodium-dev opus-dev

# Copy root workspace manifest and lock file
COPY package.json package-lock.json ./

# Copy all workspace package manifests (required for npm workspaces resolution)
COPY packages/bot/package.json ./packages/bot/
COPY packages/ai-service/package.json ./packages/ai-service/
COPY packages/capture/package.json ./packages/capture/
COPY packages/capture-app/package.json ./packages/capture-app/

# Install all workspace dependencies
RUN npm install --workspace=packages/bot --include-workspace-root

# Copy bot source
COPY packages/bot/ ./packages/bot/

# Build TypeScript
RUN npm run build --workspace=packages/bot

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

# Install native dependencies needed at runtime
RUN apk add --no-cache python3 make g++ \
    && apk add --no-cache libsodium-dev

WORKDIR /app

# Copy built output and node_modules from builder
COPY --from=builder /app/packages/bot/dist ./dist
COPY --from=builder /app/packages/bot/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose no ports — bot is outbound-only (Discord websocket)
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
