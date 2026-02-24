# Phase 89: Docker Images - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-ready Docker images for web, API, and game-server with multi-stage builds. Images should be minimal, use health checks, and be ready for deployment to Docker Swarm.

</domain>

<decisions>
## Implementation Decisions

### Registry & Tagging
- Use GitHub Container Registry (GHCR) for image storage
- Private repository (requires auth token to pull)
- Tag images with version (v1.19.0) + 'latest' always points to newest
- Claude's discretion: image naming convention (separate images vs monorepo style)

### Base Images
- Node.js 20 LTS for backend services (API, game-server)
- Alpine-based images for minimal size
- Nginx Alpine for serving web app static files
- SPA routing enabled (nginx try_files fallback to index.html)

### Build Process
- Build entire pnpm workspace, copy needed app dist to final image
- Exclude tests, docs, .git from build context via .dockerignore
- Production dependencies only in final runtime stage (devDeps for build stage only)
- Claude's discretion: Dockerfile location (root vs per-app)

### Health Checks
- Endpoint path: /health for both API and game-server
- Check depth: Process alive only (return 200 if server running)
- Response format: JSON `{"status": "ok"}` with 200 status
- Health endpoints need to be added (don't exist yet)

### Claude's Discretion
- Image naming convention (ghcr.io/user/into-the-void-web vs ghcr.io/user/into-the-void/web)
- Dockerfile location (repo root vs apps/*/Dockerfile)
- Layer ordering for optimal caching
- Exact nginx configuration details

</decisions>

<specifics>
## Specific Ideas

- NX monorepo requires full workspace for builds due to shared packages (@into-the-void/*)
- Web app is React + Phaser SPA, needs fallback routing for client-side routes
- API is NestJS on port 3000, game-server is NestJS WebSocket on port 3001
- Images should be under 200MB each (success criterion from roadmap)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 089-docker-images*
*Context gathered: 2026-02-24*
