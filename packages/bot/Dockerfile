FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (sodium-native, @discordjs/opus)
RUN apk add --no-cache python3 make g++ libsodium-dev opus-dev

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDeps for build)
RUN npm install --ignore-scripts

# Build native modules explicitly (sodium-native needs this)
RUN npm rebuild sodium-native || true

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

# Install runtime libs only (no build tools needed — node_modules copied from builder)
RUN apk add --no-cache libsodium ffmpeg

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
# Copy node_modules from builder (avoids re-compiling native modules without build tools)
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
