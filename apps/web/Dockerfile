# Stage 1: Builder - Build the web application
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy nx configuration
COPY nx.json tsconfig.base.json ./

# Copy all workspace packages (apps and packages)
# This is required because Vite needs to resolve path aliases from tsconfig
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build arguments for environment variables (baked into build at compile time)
ARG VITE_API_URL=""
ARG VITE_GAME_SERVER_URL=""

# Build the web app (increase Node memory limit for large bundle)
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NX_SKIP_NX_CACHE=true
RUN pnpm nx run web:build || (echo "Build failed with exit code $?"; exit 1)

# Stage 2: Runner - Serve with nginx
FROM nginx:alpine

# Copy built static files from builder
COPY --from=builder /app/dist/apps/web /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check using wget (included in nginx:alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/health || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
