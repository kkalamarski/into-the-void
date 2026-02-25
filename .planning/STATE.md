# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback

**Current focus:** v1.20 World Scale & Action Bar

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-25 — Milestone v1.20 started

Progress: Roadmap not yet created

## Performance Metrics

**Velocity:**
- Total plans completed: 247 (v1.0-v1.19 complete)
- Average duration: ~3 min per plan
- Total execution time: ~12.5 hours across 18 milestones

**Recent Milestones:**
- v1.18 Content Expansion: 7 phases (82-88) completed 2026-02-24
- v1.17 Gathering & Exploration: 9 phases (73-81) completed 2026-02-23
- v1.16 UI Polish: 5 phases (68-72) completed 2026-02-23

**v1.20 Status:**
- Phases: TBD (roadmap not yet created)
- Plans: TBD
- Status: Defining requirements

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- All phases: 96px TILE_SIZE matches sprite specification
- Auth: 5-second auth timeout prevents stuck connections
- Movement: Client-side prediction for responsive feel
- Docker (89-01): Multi-stage builds with node:20-alpine for API and game-server for minimal image size
- Docker (89-01): NX generatePackageJson for dependency management in Docker builds
- Docker (89-01): HEALTHCHECK directives enable container orchestration monitoring
- Docker (89-02): Multi-stage build with node:20-alpine → nginx:alpine for minimal image size
- Docker (89-02): VITE_* env vars baked at build time via ARG directives
- Docker (89-02): 1-year cache for /assets/ due to Vite content-hashing
- Docker (89-03): Web image build deferred to CI/CD (ARM64 container emulation issue with Vite)
- [Phase 090-01]: Database services placed on manager node for volume access and data persistence
- [Phase 090-01]: Overlay networks with internal network isolation for secure database access
- [Phase 091-01]: Traefik v3.3 on manager nodes only for Docker socket access
- [Phase 091-01]: Host mode for ports 80/443 for direct ingress without overlay network overhead
- [Phase 091-01]: Let's Encrypt production server for automatic SSL certificate management
- [Phase 091-01]: HTTP to HTTPS redirect for security and SEO
- [Phase 092-01]: GHCR chosen for image storage (GitHub Actions native integration)
- [Phase 092-01]: Matrix build strategy for parallel image builds (api, game-server, web)
- [Phase 092-01]: GitHub Actions cache for faster subsequent builds
- [Phase 092-01]: Full monorepo context required for NX workspace builds
- [Phase 092-01]: Semantic versioning tags (version, major.minor, latest)
- [Phase 092-02]: SSH-based deployment to Docker Swarm manager for production releases
- [Phase 092-02]: Rolling update strategy with health checks for zero-downtime deployments
- [Phase 092-02]: Expand-contract migration pattern for backward-compatible schema changes
- [Phase 093]: Combined all VM setup steps in single guide for complete end-to-end provisioning

### Pending Todos

None yet (v1.20 just started).

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-25
Stopped at: Defining requirements for v1.20
Resume file: None

---
*Last updated: 2026-02-25 — v1.20 World Scale & Action Bar milestone started*
