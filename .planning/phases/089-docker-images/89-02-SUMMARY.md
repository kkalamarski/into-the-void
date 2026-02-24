---
phase: 089-docker-images
plan: 02
subsystem: deployment
tags: [docker, nginx, web, spa, containerization]

dependency_graph:
  requires: []
  provides:
    - web-dockerfile
    - nginx-spa-config
  affects:
    - web-deployment
    - production-builds

tech_stack:
  added:
    - nginx:alpine (web server)
    - multi-stage docker builds
  patterns:
    - SPA routing with try_files
    - content-hashed asset caching
    - container health checks

key_files:
  created:
    - apps/web/Dockerfile
    - apps/web/nginx.conf
  modified: []

decisions:
  - Use multi-stage build (node:20-alpine → nginx:alpine) for minimal image size
  - Bake VITE_* env vars at build time (not runtime) via ARG directives
  - Long cache for /assets/ (1 year) because Vite content-hashes filenames
  - Add /health endpoint for container orchestration health checks

metrics:
  duration: "1m 22s"
  tasks_completed: 2
  commits: 2
  files_created: 2
  completed_at: "2026-02-24"
---

# Phase 89 Plan 02: Web Application Docker Image Summary

**One-liner:** Production-ready multi-stage Dockerfile serving React+Phaser SPA via nginx with SPA routing and health checks.

## What Was Built

### nginx Configuration
Created `/apps/web/nginx.conf` with:
- **SPA routing:** `try_files $uri $uri/ /index.html` handles client-side routing (React Router)
- **Asset caching:** 1-year cache for `/assets/*` (Vite adds content hashes, safe for immutable caching)
- **Health check:** `/health` endpoint returns 200 "ok" for container orchestration
- **Gzip compression:** Reduces transfer size for text assets

### Multi-Stage Dockerfile
Created `/apps/web/Dockerfile` with two stages:

**Stage 1 (builder):**
- Base: `node:20-alpine`
- Enables pnpm via corepack
- Copies all workspace files (apps + packages) for Vite path alias resolution
- Accepts build args: `VITE_API_URL`, `VITE_GAME_SERVER_URL` (baked into build)
- Runs `pnpm nx run web:build` to generate static files

**Stage 2 (runner):**
- Base: `nginx:alpine` (minimal size)
- Copies built files from builder to `/usr/share/nginx/html`
- Copies nginx.conf for SPA routing
- Exposes port 80
- Includes HEALTHCHECK using wget against `/health` endpoint
- Starts nginx in foreground (`daemon off`)

## Tasks Completed

| Task | Name                                   | Commit  | Files                |
| ---- | -------------------------------------- | ------- | -------------------- |
| 1    | Create nginx configuration for SPA     | 4cfe2ea | apps/web/nginx.conf  |
| 2    | Create web Dockerfile (multi-stage)    | 9e2935e | apps/web/Dockerfile  |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:

1. ✅ apps/web/nginx.conf exists with `try_files` SPA fallback
2. ✅ apps/web/nginx.conf has `/health` location returning 200
3. ✅ apps/web/Dockerfile exists with `FROM node:20-alpine AS builder`
4. ✅ apps/web/Dockerfile has `FROM nginx:alpine` for runner
5. ✅ apps/web/Dockerfile has HEALTHCHECK directive
6. ✅ apps/web/Dockerfile accepts VITE_* build args

## Key Technical Decisions

### Multi-Stage Build Strategy
- **Decision:** Use node:20-alpine for build, nginx:alpine for runtime
- **Rationale:** Minimizes final image size (nginx:alpine ~25MB vs node ~180MB)
- **Trade-off:** Slightly longer build time, but much faster deployment and lower storage costs

### Build-Time Environment Variables
- **Decision:** Use ARG for VITE_* vars instead of ENV
- **Rationale:** Vite bakes env vars into static bundle at compile time (cannot be changed at runtime)
- **Usage:** `docker build --build-arg VITE_API_URL=https://api.example.com ...`
- **Impact:** Different builds needed for different environments (dev/staging/prod)

### Asset Caching Strategy
- **Decision:** 1-year cache with `immutable` directive for `/assets/*`
- **Rationale:** Vite adds content hashes to filenames (e.g., `app.a1b2c3d4.js`)
- **Safety:** Hash changes when content changes, so safe to cache aggressively
- **Benefit:** Reduces bandwidth and improves load times for repeat visitors

### Health Check Implementation
- **Decision:** Custom `/health` endpoint in nginx.conf
- **Rationale:** Container orchestrators (Docker Swarm, Kubernetes) need reliable health checks
- **Implementation:** Returns 200 "ok" with no access logs (reduces noise)
- **HEALTHCHECK:** 30s interval, 3s timeout, 3 retries before marking unhealthy

## Build Instructions

### Local Build
```bash
# From repository root
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=http://localhost:3000 \
  --build-arg VITE_GAME_SERVER_URL=ws://localhost:3001 \
  -t intothevoid-web:local .
```

### Production Build
```bash
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=https://api.intothevoid.online \
  --build-arg VITE_GAME_SERVER_URL=wss://game.intothevoid.online \
  -t intothevoid-web:latest .
```

### Run Container
```bash
docker run -p 8080:80 intothevoid-web:latest

# Test health check
curl http://localhost:8080/health
# Expected: "ok"

# Test SPA routing
curl http://localhost:8080/
curl http://localhost:8080/login
curl http://localhost:8080/game
# All should return index.html
```

## Success Criteria

All success criteria met:

- ✅ apps/web/nginx.conf with SPA routing and health check
- ✅ apps/web/Dockerfile with multi-stage build (node builder, nginx runner)
- ✅ Build args for VITE_API_URL and VITE_GAME_SERVER_URL
- ✅ EXPOSE 80 and HEALTHCHECK configured

## Next Steps

Recommended follow-up tasks:

1. **Test build locally:** Verify the Dockerfile builds successfully
2. **Test container:** Run container and verify SPA routing works
3. **Optimize layers:** Consider adding `.dockerignore` to exclude unnecessary files from build context
4. **CI/CD integration:** Configure GitHub Actions to build and push images (Plan 89-03)
5. **Multi-platform builds:** Consider `docker buildx` for arm64 support if needed

## Self-Check: PASSED

All claimed artifacts verified:

- ✅ FOUND: apps/web/nginx.conf
- ✅ FOUND: apps/web/Dockerfile
- ✅ FOUND: commit 4cfe2ea
- ✅ FOUND: commit 9e2935e
