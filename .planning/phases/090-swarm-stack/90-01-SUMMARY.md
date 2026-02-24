---
phase: 090-swarm-stack
plan: 01
subsystem: infrastructure
tags:
  - docker
  - swarm
  - orchestration
  - deployment
dependency_graph:
  requires: []
  provides:
    - docker-stack.yml
    - deployment environment template
  affects:
    - all services (postgres, redis, api, game-server, web)
tech_stack:
  added:
    - Docker Swarm orchestration
    - Overlay networking
  patterns:
    - Service placement constraints
    - Resource allocation (CPU, memory)
    - Health-based dependencies
    - Rolling update configuration
key_files:
  created:
    - docker-stack.yml
    - deploy/.env.example
  modified: []
decisions:
  - decision: "Database services placed on manager node"
    rationale: "Ensures volume access and data persistence"
    alternatives: []
  - decision: "Health check-based service dependencies"
    rationale: "Ensures databases are ready before app services start"
    alternatives: []
  - decision: "Overlay networks with internal network isolation"
    rationale: "Secure database access, public Traefik routing"
    alternatives: []
metrics:
  duration: 153
  completed: "2026-02-24"
---

# Phase 90 Plan 01: Docker Swarm Stack Configuration Summary

**One-liner:** Docker Compose stack file configured for Swarm mode with service orchestration, resource limits, and persistent storage.

## What Was Built

Created Docker Swarm deployment configuration with:

### Services Configured (5 total)

**Database Services:**
1. **postgres** - PostgreSQL 16 Alpine
   - Placement: Manager node only
   - Resources: 1.0 CPU limit, 512MB memory limit
   - Volume: postgres_data (persistent)
   - Healthcheck: pg_isready every 10s

2. **redis** - Redis 7 Alpine
   - Placement: Manager node only
   - Resources: 0.5 CPU limit, 256MB memory limit
   - Volume: redis_data (persistent with AOF)
   - Healthcheck: redis-cli ping every 10s

**Application Services:**
3. **api** - REST API service
   - Replicas: 1
   - Resources: 1.0 CPU limit, 512MB memory limit
   - Dependencies: postgres + redis (health-based)
   - Networks: internal + traefik-public
   - Traefik: api.${DOMAIN}

4. **game-server** - WebSocket game server
   - Replicas: 1
   - Resources: 2.0 CPU limit, 1024MB memory limit (highest - real-time processing)
   - Dependencies: postgres + redis (health-based)
   - Networks: internal + traefik-public
   - Traefik: game.${DOMAIN} with sticky sessions

5. **web** - Static frontend
   - Replicas: 1
   - Resources: 0.5 CPU limit, 128MB memory limit (lowest - static content)
   - Networks: traefik-public only
   - Traefik: play.${DOMAIN}

### Resource Allocation Strategy

**Total resources allocated:**
- CPU limits: 5.0 cores total
- Memory limits: 2.4GB total

**Priority allocation:**
- game-server: 40% CPU, 43% memory (real-time gameplay)
- postgres: 20% CPU, 21% memory (data persistence)
- api: 20% CPU, 21% memory (REST endpoints)
- redis: 10% CPU, 11% memory (caching)
- web: 10% CPU, 5% memory (static files)

### Volume Configuration

**postgres_data:**
- Driver: local
- Path: /var/lib/postgresql/data
- Persistence: Across container restarts

**redis_data:**
- Driver: local
- Path: /data
- Persistence: AOF (Append Only File) enabled

### Network Topology

**internal (overlay):**
- Type: Overlay network
- Access: Internal only (no external access)
- Purpose: Database isolation
- Connected services: postgres, redis, api, game-server

**traefik-public (external):**
- Type: External overlay network
- Created by: Traefik stack (Phase 91)
- Purpose: Reverse proxy routing
- Connected services: api, game-server, web

### Deployment Configuration

**All application services include:**
- Rolling update strategy (parallelism: 1, delay: 10s)
- Automatic rollback on failure
- Traefik labels for routing (activated in Phase 91)

**Environment variables:**
- Documented in deploy/.env.example
- Required: POSTGRES_PASSWORD, JWT_SECRET
- Optional: POSTGRES_USER, POSTGRES_DB, DOMAIN, REGISTRY, TAG

## Deviations from Plan

None - plan executed exactly as written.

## Files Created

1. **docker-stack.yml** (160 lines)
   - All 5 services configured for Swarm mode
   - Deploy configuration with resource limits
   - Health-based dependencies
   - Overlay network setup
   - Traefik routing labels

2. **deploy/.env.example** (46 lines)
   - Required environment variables documented
   - Optional variables with defaults
   - Security guidance for generating secrets
   - Deployment instructions

## Commits

1. **868bbf0** - feat(090-01): add docker-stack.yml for Swarm deployment
2. **0d824d1** - feat(090-01): add deployment environment template

## Key Decisions

1. **Database placement on manager nodes**
   - Ensures reliable volume access
   - Prevents data loss from node failures
   - Trade-off: Limits horizontal scaling (acceptable for single-node MVP)

2. **Health-based service dependencies**
   - Apps wait for databases to be ready
   - Prevents connection errors on startup
   - Uses Docker healthcheck conditions

3. **Resource limits on all services**
   - Prevents resource starvation
   - Enables predictable performance
   - Game server gets highest allocation (real-time processing)

4. **Overlay network isolation**
   - Internal network has no external access
   - Databases isolated from public internet
   - Only app services connect to traefik-public

## Integration Points

**Consumed by this plan:**
- Phase 89: Docker images (api, game-server, web)

**Provides for future plans:**
- Phase 91: Traefik configuration (uses traefik-public network)
- Phase 92: GitHub Actions CI/CD (uses REGISTRY, TAG variables)
- Phase 93: Deployment runbook (references docker-stack.yml)

## Next Steps

Phase 91 will:
1. Create Traefik stack configuration
2. Set up SSL certificates with Let's Encrypt
3. Configure reverse proxy routing
4. Create traefik-public overlay network

## Verification Results

All success criteria met:
- [x] docker-stack.yml exists at project root
- [x] All 5 services have deploy.resources.limits
- [x] postgres_data and redis_data volumes defined
- [x] API and game-server depend on postgres/redis with service_healthy condition
- [x] deploy/.env.example documents all required environment variables
- [x] Traefik labels present (prep for Phase 91)

## Self-Check: PASSED

**Files exist:**
- FOUND: docker-stack.yml
- FOUND: deploy/.env.example

**Commits exist:**
- FOUND: 868bbf0
- FOUND: 0d824d1

**Key patterns verified:**
- version: '3.8' present
- 5 deploy: sections (one per service)
- 5 resources: sections
- 5 limits: sections
- 2 persistent volumes
- 4 health-based dependencies (api + game-server each depend on postgres + redis)
