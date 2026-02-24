---
phase: 091-traefik-ssl
plan: 01
subsystem: infrastructure
tags:
  - traefik
  - ssl
  - letsencrypt
  - reverse-proxy
  - docker-swarm
dependency_graph:
  requires:
    - docker-stack.yml (from Phase 90)
  provides:
    - Traefik reverse proxy with SSL
    - traefik-public overlay network
    - Automatic HTTPS for all services
  affects:
    - api (HTTPS routing)
    - game-server (HTTPS WebSocket routing)
    - web (HTTPS routing with redirect)
tech_stack:
  added:
    - Traefik v3.3
    - Let's Encrypt ACME
  patterns:
    - Reverse proxy with service discovery
    - Automatic SSL certificate management
    - HTTP to HTTPS redirect
    - Sticky sessions for WebSockets
key_files:
  created:
    - deploy/traefik/traefik.yml
    - deploy/traefik-stack.yml
  modified:
    - docker-stack.yml
decisions:
  - decision: "Traefik v3.3 on manager nodes only"
    rationale: "Manager nodes have Docker socket access for service discovery"
    alternatives: ["Run on all nodes - rejected (unnecessary duplication)"]
  - decision: "Host mode for ports 80 and 443"
    rationale: "Direct ingress routing without overlay network overhead"
    alternatives: ["Ingress mode - rejected (adds latency for real-time game)"]
  - decision: "Let's Encrypt production server"
    rationale: "Ready for production deployment with valid certificates"
    alternatives: ["Staging server - rejected (not needed for single-node setup)"]
  - decision: "HTTP to HTTPS redirect middleware"
    rationale: "Ensure all traffic uses secure connections"
    alternatives: ["Allow HTTP - rejected (security requirement)"]
metrics:
  duration: 120
  completed: "2026-02-24"
---

# Phase 91 Plan 01: Traefik SSL Configuration Summary

**One-liner:** Traefik v3 reverse proxy with automatic Let's Encrypt SSL certificates for HTTPS access to all services.

## What Was Built

Configured Traefik as the edge router for the Docker Swarm stack with automatic SSL certificate management:

### 1. Traefik Static Configuration (`deploy/traefik/traefik.yml`)

**Entrypoints:**
- `web` (port 80): Automatically redirects to HTTPS
- `websecure` (port 443): TLS-enabled with Let's Encrypt

**Docker Provider:**
- Swarm mode enabled for service discovery
- Only routes services with `traefik.enable=true`
- Uses `traefik-public` overlay network

**Certificate Resolver:**
- Name: `letsencrypt`
- Email: Configurable via `ACME_EMAIL` (default: admin@intothevoid.online)
- Challenge: HTTP-01 challenge on port 80
- Storage: `/letsencrypt/acme.json` in named volume
- Server: Let's Encrypt production

**Logging:**
- Structured JSON logs for both access and application logs
- INFO level for production debugging

### 2. Traefik Swarm Stack (`deploy/traefik-stack.yml`)

**Service Configuration:**
- Image: `traefik:v3.3`
- Deployment: Global mode on manager nodes only
- Placement: `node.role == manager`

**Ports (Host Mode):**
- 80:80 (HTTP ingress)
- 443:443 (HTTPS ingress)

**Volumes:**
- Docker socket: Read-only access for service discovery
- Static config: `/etc/traefik/traefik.yml`
- Certificates: `traefik_certs` named volume for ACME storage

**Resources:**
- CPU: 0.5 limit, 0.1 reservation
- Memory: 256MB limit, 128MB reservation

**Dashboard:**
- Exposed at `traefik.${DOMAIN}` with HTTPS
- Secured with basic auth (configurable via `TRAEFIK_DASHBOARD_AUTH`)
- Routes to internal Traefik API

**Network:**
- Creates `traefik-public` overlay network (attachable)
- Shared with application services in docker-stack.yml

### 3. Application Services HTTPS Configuration (`docker-stack.yml`)

**All Services (api, game-server, web):**
- Entrypoint: `websecure` (port 443)
- TLS: Enabled with `letsencrypt` certificate resolver
- Certificates: Automatically issued and renewed

**API Service:**
- Domain: `api.${DOMAIN}` (api.intothevoid.online)
- TLS on port 3000

**Game Server:**
- Domain: `game.${DOMAIN}` (game.intothevoid.online)
- TLS on port 3001
- Sticky sessions preserved for WebSocket connections
- Cookie: `game_session`

**Web Service:**
- Domain: `play.${DOMAIN}` (play.intothevoid.online)
- TLS on port 80 (nginx)
- HTTP router: Redirects HTTP to HTTPS
- Middleware: `redirect-to-https` with permanent redirect

## Deviations from Plan

None - plan executed exactly as written.

## Files Created/Modified

**Created:**
1. **deploy/traefik/traefik.yml** (55 lines)
   - Static Traefik configuration
   - Docker Swarm provider
   - Let's Encrypt ACME setup
   - Entrypoint definitions

2. **deploy/traefik-stack.yml** (57 lines)
   - Traefik service for Docker Swarm
   - Port mappings in host mode
   - Certificate volume
   - traefik-public network creation
   - Dashboard routing with auth

**Modified:**
3. **docker-stack.yml** (+17 lines)
   - Added HTTPS entrypoint to all services
   - Added TLS with Let's Encrypt resolver
   - Added HTTP to HTTPS redirect for web
   - Preserved sticky sessions for game-server

## Commits

1. **96743fe** - feat(091-01): add Traefik v3 static configuration
2. **23f10a7** - feat(091-01): add Traefik Docker Swarm stack
3. **e6836dd** - feat(091-01): configure HTTPS routers with Let's Encrypt

## Key Decisions

### 1. Host Mode for Ingress Ports
**Decision:** Use `mode: host` for ports 80 and 443 instead of ingress mode.

**Rationale:**
- Direct routing without overlay network overhead
- Better performance for real-time WebSocket connections
- Simpler debugging (no VIP routing)

**Trade-offs:**
- Requires published ports on all manager nodes
- Acceptable for single-node or small cluster deployments

### 2. Global Deployment on Manager Nodes
**Decision:** Deploy Traefik as global service constrained to manager nodes.

**Rationale:**
- Manager nodes have stable placement
- Docker socket access for service discovery
- Ensures ingress availability on control plane

**Alternatives Considered:**
- Replicated mode: Rejected (manager-only constraint makes global mode clearer)
- All nodes: Rejected (worker nodes don't need ingress in single-node setup)

### 3. Let's Encrypt Production Server
**Decision:** Use Let's Encrypt production server immediately (not staging).

**Rationale:**
- Single-node setup has low risk of rate limiting
- Avoids certificate trust issues during testing
- Ready for production deployment

**Rate limits:** Let's Encrypt allows 50 certificates per domain per week (sufficient for this use case).

### 4. HTTP to HTTPS Redirect
**Decision:** Implement automatic HTTP to HTTPS redirect for web service.

**Rationale:**
- Security best practice (prevent unencrypted traffic)
- User-friendly (no manual URL scheme changes)
- SEO benefits (search engines prefer HTTPS)

**Implementation:** Separate HTTP router with redirect middleware ensures all play.intothevoid.online traffic uses HTTPS.

## Integration Points

**Consumes from Phase 90:**
- docker-stack.yml service definitions
- Service labels (traefik.enable, rules, ports)
- traefik-public network reference (external: true)

**Provides for Phase 92 (CI/CD):**
- Secure HTTPS endpoints for all services
- Certificate management (no manual SSL setup needed)
- Service routing based on domain names

**Provides for Phase 93 (Deployment):**
- traefik-stack.yml deployment instructions
- Certificate volume persistence
- Dashboard access for debugging

## Verification Results

All success criteria met:

- [x] Traefik static config exists with Docker Swarm provider and Let's Encrypt ACME
- [x] Traefik stack deploys as Swarm service with certificate storage volume
- [x] All app services have HTTPS routers with Let's Encrypt resolver
- [x] HTTP to HTTPS redirect configured for web service
- [x] WebSocket sticky sessions preserved for game-server
- [x] traefik-public network created by Traefik stack, used by app stack

**Verification output:**
```
✓ 3 services with Let's Encrypt (api, game-server, web)
✓ 15 router configurations found
✓ Docker Swarm mode enabled
✓ Certificate resolver configured
✓ Sticky sessions for WebSocket
✓ HTTP to HTTPS redirect
✓ Network configuration consistent
```

## Security Considerations

**Certificate Storage:**
- ACME certificates stored in named volume `traefik_certs`
- Persistent across Traefik restarts
- Backed up with volume backup strategy (Phase 93)

**Dashboard Access:**
- Basic auth enabled (default password: admin/admin - change in production)
- HTTPS-only access
- Let's Encrypt certificate for traefik.intothevoid.online

**HTTP to HTTPS Redirect:**
- Permanent redirect (301) for SEO and caching
- Applied to web service (user-facing traffic)
- API and game-server use direct HTTPS (no redirect needed)

## Next Steps

**Phase 92 (GitHub Actions CI/CD) will:**
1. Build and push Docker images to GHCR
2. Tag images for deployment (latest, semver)
3. Create deployment workflow for Docker Swarm

**Deployment Prerequisites (Phase 93):**
1. Provision DigitalOcean VM
2. Initialize Docker Swarm
3. Configure DNS A records at GoDaddy:
   - play.intothevoid.online → VM IP
   - api.intothevoid.online → VM IP
   - game.intothevoid.online → VM IP
   - traefik.intothevoid.online → VM IP
4. Deploy Traefik stack first (creates network)
5. Deploy application stack (uses network)

**Certificate Issuance:**
- Let's Encrypt will issue certificates on first HTTPS request
- HTTP-01 challenge requires DNS records to be configured first
- Certificates auto-renew 30 days before expiry

## Self-Check: PASSED

**Files exist:**
- FOUND: deploy/traefik/traefik.yml
- FOUND: deploy/traefik-stack.yml
- FOUND: docker-stack.yml (modified)

**Commits exist:**
- FOUND: 96743fe
- FOUND: 23f10a7
- FOUND: e6836dd

**Key patterns verified:**
- certificatesResolvers section present
- swarmMode: true in Docker provider
- 3 services with tls.certresolver=letsencrypt
- HTTP to HTTPS redirect middleware
- Sticky sessions preserved
- traefik-public network in both stacks
