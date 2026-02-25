FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (sodium-native, @discordjs/opus)
RUN apk add --no-cache python3 make g++ libsodium-dev opus-dev

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (standalone, no workspace)
RUN npm install --ignore-scripts

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

RUN apk add --no-cache libsodium-dev ffmpeg

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN npm install --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
