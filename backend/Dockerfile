# ─── Build Stage ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci --quiet

COPY src ./src
RUN npm run build

# ─── Production Stage ────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --quiet && npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs
RUN mkdir -p uploads logs && chown -R nodejs:nodejs uploads logs

USER nodejs

# Railway will ignore EXPOSE and use dynamic PORT
EXPOSE 5000

# Note: Healthcheck is managed by Railway via railway.json to handle dynamic ports

CMD ["node", "dist/server.js"]
