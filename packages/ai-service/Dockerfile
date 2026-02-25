FROM node:20-alpine AS builder

WORKDIR /app

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

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN npm install --omit=dev --ignore-scripts

ENV NODE_ENV=production

EXPOSE 3457

CMD ["node", "dist/index.js"]
