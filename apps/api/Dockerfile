# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./

# Copy all workspace packages (NX needs full workspace for build)
COPY apps/ apps/
COPY packages/ packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the API application (NX generates package.json with external deps)
RUN pnpm nx run api:build --prod

# Stage 2: Runner
FROM node:20-alpine

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist/apps/api ./

# Install production dependencies only
RUN npm install --omit=dev

# Set production environment
ENV NODE_ENV=production

# Expose API port
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "main.js"]
