# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for build)
# Используем npm install в builder stage, так как package-lock.json может быть не синхронизирован
RUN npm install --prefer-offline --no-audit

# Copy source code
COPY src ./src
COPY migrations ./migrations

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install only runtime dependencies for native modules (if needed)
RUN apk add --no-cache dumb-init su-exec

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and updated package-lock.json from builder stage
COPY --from=builder /app/package*.json ./

# Install only production dependencies
# Используем npm install для production, так как это более устойчиво к проблемам с lock файлом
RUN npm install --only=production --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY public ./public

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create logs and uploads directories with proper permissions
# Создаем директории и устанавливаем права ДО переключения на nodejs пользователя
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app && \
    chmod -R 775 /app/uploads && \
    chmod -R 775 /app/logs

# Не переключаемся на nodejs здесь - entrypoint скрипт сделает это после установки прав

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use entrypoint script to set permissions and then start with dumb-init
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application with dumb-init
CMD ["dumb-init", "--", "node", "dist/index.js"]
