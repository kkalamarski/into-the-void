# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- ✅ **v1.5 Movement Overhaul** - Phases 21-24 (shipped 2026-02-17)
- ✅ **v1.6 Inventory & Items** - Phases 25-29 (shipped 2026-02-18)
- ✅ **v1.7 Character Stats** - Phases 30-32 (shipped 2026-02-18)
- ✅ **v1.8 Entity System** - Phases 33-38 (shipped 2026-02-19)
- ✅ **v1.9 Combat System** - Phases 39-42 (shipped 2026-02-19)
- ✅ **v1.10 Combat UX** - Phases 43-45 (shipped 2026-02-19)
- ✅ **v1.11 NPCs & Trading** - Phases 46-50 (shipped 2026-02-20)
- ✅ **v1.12 Bug Fixes & Content Polish** - Phases 51-55 (shipped 2026-02-20)
- ✅ **v1.13 Active Combat Abilities** - Phases 56-58 (shipped 2026-02-21)
- ✅ **v1.14 Equipment Stats Overhaul** - Phases 59-63 (shipped 2026-02-21)
- ✅ **v1.15 Quest System** - Phases 64-69 (shipped 2026-02-22)
- ✅ **v1.16 UI Polish** - Phases 70-75 (shipped 2026-02-23)
- ✅ **v1.17 Core Gameplay Loop** - Phases 76-81 (shipped 2026-02-23)
- ✅ **v1.18 Content Expansion** - Phases 82-88 (shipped 2026-02-24)
- 🚧 **v1.19 Deployment & CI/CD** - Phases 89-93 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.18 (Phases 1-88) - SHIPPED</summary>

[Previous milestone phases collapsed for brevity - see milestone archives and existing ROADMAP.md sections above]

</details>

---

## Milestone v1.19: Deployment & CI/CD

**Goal:** Deploy the game to production with automated CI/CD pipeline on Docker Swarm with SSL.

### Phase 89: Docker Images

**Goal**: Production-ready Docker images for all services with multi-stage builds

**Depends on**: Nothing (infrastructure foundation)

**Requirements**: DOCKER-01, DOCKER-02, DOCKER-03, DOCKER-04

**Success Criteria** (what must be TRUE):
  1. Web app builds as static files served by nginx with correct asset paths
  2. API container starts with health check responding at /health
  3. Game server container starts with health check responding at /health
  4. All three images use multi-stage builds and are under 200MB each

**Plans**: 3 plans in 2 waves

Plans:
- [ ] 89-01-PLAN.md — Backend Dockerfiles (API + game-server with health checks)
- [ ] 89-02-PLAN.md — Web Dockerfile (nginx + static files)
- [ ] 89-03-PLAN.md — Build validation and health check verification

---

### Phase 90: Swarm Stack

**Goal**: Docker Compose stack configured for Swarm mode with all services orchestrated

**Depends on**: Phase 89 (requires Docker images)

**Requirements**: SWARM-01, SWARM-02, SWARM-03, SWARM-04, SWARM-05

**Success Criteria** (what must be TRUE):
  1. PostgreSQL service persists data across container restarts
  2. Redis service persists data across container restarts
  3. Services start in correct order (DB first, then app services)
  4. Each service has defined resource limits preventing runaway consumption
  5. Stack deploys successfully with docker stack deploy command

**Plans**: 1 plan in 1 wave

Plans:
- [ ] 90-01-PLAN.md — Docker Swarm stack with all services, volumes, and resource limits

---

### Phase 91: Traefik & SSL

**Goal**: Traefik reverse proxy routes traffic with automatic Let's Encrypt SSL

**Depends on**: Phase 90 (requires Swarm stack)

**Requirements**: PROXY-01, PROXY-02, PROXY-03, PROXY-04, PROXY-05

**Success Criteria** (what must be TRUE):
  1. Traefik automatically discovers services via Docker labels
  2. Let's Encrypt issues valid SSL certificates for play.intothevoid.online
  3. HTTPS traffic to play.intothevoid.online routes to web service
  4. API requests route correctly (either api.intothevoid.online or /api path)
  5. WebSocket connections maintain sticky sessions without drops

**Plans**: TBD

Plans:
- [ ] 91-01: TBD
- [ ] 91-02: TBD

---

### Phase 92: CI/CD Pipeline

**Goal**: GitHub Actions workflow builds images and deploys to Swarm on tag push

**Depends on**: Phase 91 (requires working Swarm stack with proxy)

**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05

**Success Criteria** (what must be TRUE):
  1. Workflow triggers when version tag is pushed to repository
  2. All three Docker images build in parallel within 10 minutes
  3. Images push to container registry with tag version
  4. SSH deployment updates Swarm stack without downtime
  5. Database migrations run automatically before new containers start

**Plans**: TBD

Plans:
- [ ] 92-01: TBD
- [ ] 92-02: TBD

---

### Phase 93: Documentation

**Goal**: Complete deployment documentation enabling first production deployment

**Depends on**: Phase 92 (documents the entire deployment pipeline)

**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04

**Success Criteria** (what must be TRUE):
  1. VM setup guide covers Docker installation, Swarm init, and firewall configuration
  2. DNS guide shows exact GoDaddy A record configuration
  3. Secrets documentation lists all required GitHub Secrets with example values
  4. First deployment checklist provides step-by-step verification of working system

**Plans**: TBD

Plans:
- [ ] 93-01: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 89 → 90 → 91 → 92 → 93

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Authentication & Navigation | v1.0 | 3/3 | Complete | 2026-02-13 |
| 2. Character Selection | v1.0 | 2/2 | Complete | 2026-02-14 |
| 3. Character Creation | v1.0 | 2/2 | Complete | 2026-02-14 |
| 4. WebSocket Connection | v1.1 | 5/5 | Complete | 2026-02-14 |
| 5. World Rendering | v1.1 | 5/5 | Complete | 2026-02-14 |
| 6. Movement System | v1.1 | 5/5 | Complete | 2026-02-15 |
| 7. Entities & HUD | v1.1 | 5/5 | Complete | 2026-02-16 |
| 8. Core Isometric Transformation | v1.2 | 3/3 | Complete | 2026-02-16 |
| 9. Rendering Optimization & Interaction | v1.2 | 2/2 | Complete | 2026-02-16 |
| 10. Multiplayer Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 11. UI Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 12. Polish | v1.2 | 1/1 | Complete | 2026-02-16 |
| 13. Tile Definition Architecture | v1.3 | 3/3 | Complete | 2026-02-16 |
| 14. Elevation System Core | v1.3 | 2/2 | Complete | 2026-02-16 |
| 15. Elevation Rendering | v1.3 | 2/2 | Complete | 2026-02-16 |
| 16. Structure Walls & Pathfinding | v1.3 | 5/5 | Complete | 2026-02-16 |
| 17. World Coordinate Foundation | v1.4 | 2/2 | Complete | 2026-02-16 |
| 18. Multi-Chunk Streaming | v1.4 | 5/5 | Complete | 2026-02-16 |
| 19. Biome Integration | v1.4 | 2/2 | Complete | 2026-02-17 |
| 20. Testing & Polish | v1.4 | 2/2 | Complete | 2026-02-17 |
| 21. Server Rate Limit & Speed Unification | v1.5 | 2/2 | Complete | 2026-02-17 |
| 22. 8-Directional Input & Pathfinding | v1.5 | 2/2 | Complete | 2026-02-17 |
| 23. Movement Animation & Camera Polish | v1.5 | 4/4 | Complete | 2026-02-17 |
| 24. Zone Boundary Hysteresis | v1.5 | 1/1 | Complete | 2026-02-17 |
| 25. Item Data Model & Foundation | v1.6 | 4/4 | Complete | 2026-02-17 |
| 26. Server InventoryService & WebSocket Handlers | v1.6 | 4/4 | Complete | 2026-02-17 |
| 27. Client State & Inventory Panel UI | v1.6 | 3/3 | Complete | 2026-02-17 |
| 28. Equipment System | v1.6 | 3/3 | Complete | 2026-02-18 |
| 29. Action Bar & Personal Storage | v1.6 | 2/2 | Complete | 2026-02-18 |
| 30. Type Foundation & Pure Computation | v1.7 | 2/2 | Complete | 2026-02-18 |
| 31. Server Wiring & Socket Delivery | v1.7 | 3/3 | Complete | 2026-02-18 |
| 32. Client Display | v1.7 | 3/3 | Complete | 2026-02-18 |
| 33. Foundation Types and Entity Definitions | v1.8 | 3/3 | Complete | 2026-02-18 |
| 34. Entity Lifecycle Persistence and Enriched Spawning | v1.8 | 4/4 | Complete | 2026-02-18 |
| 35. Loot Tables, Tool Interaction, and Respawn | v1.8 | 4/4 | Complete | 2026-02-18 |
| 36. Creature AI Wander and Behavior Tick | v1.8 | 4/4 | Complete | 2026-02-18 |
| 37. Fertility Noise and Biome Spawn Quality | v1.8 | 3/3 | Complete | 2026-02-18 |
| 38. Perception Gating and Client Polish | v1.8 | 4/4 | Complete | 2026-02-19 |
| 39. Combat Core and Damage Calculation | v1.9 | 4/4 | Complete | 2026-02-19 |
| 40. Creature Combat AI and Aggro | v1.9 | 3/3 | Complete | 2026-02-19 |
| 41. Player Death and Respawn | v1.9 | 3/3 | Complete | 2026-02-19 |
| 42. Combat Feedback and HUD | v1.9 | 2/2 | Complete | 2026-02-19 |
| 43. Click-to-Attack and Bug Fix | v1.10 | 2/2 | Complete | 2026-02-19 |
| 44. Target Selection UI | v1.10 | 2/2 | Complete | 2026-02-19 |
| 45. Combat Log | v1.10 | 1/1 | Complete | 2026-02-19 |
| 46. Currency and Hub Foundation | v1.11 | 3/3 | Complete | 2026-02-19 |
| 47. Hub Travel | v1.11 | 5/5 | Complete | 2026-02-20 |
| 48. NPC Definition System and Hub Spawns | v1.11 | 3/3 | Complete | 2026-02-20 |
| 49. NPC Interaction Window | v1.11 | 3/3 | Complete | 2026-02-20 |
| 50. Trading System | v1.11 | 4/4 | Complete | 2026-02-20 |
| 51. Player Position Persistence | v1.12 | 1/1 | Complete | 2026-02-20 |
| 52. Hub NPC Spawning Fix | v1.12 | 1/1 | Complete | 2026-02-20 |
| 53. Rendering & Depth Fixes | v1.12 | 2/2 | Complete | 2026-02-20 |
| 54. New Player Starter Kit | v1.12 | 1/1 | Complete | 2026-02-20 |
| 55. Content Expansion | v1.12 | 3/3 | Complete | 2026-02-20 |
| 56. Core Ability System | v1.13 | 3/3 | Complete | 2026-02-20 |
| 57. Buff System | v1.13 | 3/3 | Complete | 2026-02-20 |
| 58. Ability Content & Polish | v1.13 | 3/3 | Complete | 2026-02-21 |
| 59. Type Foundation | v1.14 | 1/1 | Complete | 2026-02-21 |
| 60. Migration | v1.14 | 2/2 | Complete | 2026-02-21 |
| 61. Aggregation Rules | v1.14 | 1/1 | Complete | 2026-02-21 |
| 62. Calculation Parity | v1.14 | 1/1 | Complete | 2026-02-21 |
| 63. Content Normalization | v1.14 | 3/3 | Complete | 2026-02-21 |
| 64. Quest Foundations | v1.15 | 2/2 | Complete | 2026-02-22 |
| 65. Objective Tracking | v1.15 | 2/2 | Complete | 2026-02-22 |
| 66. Quest Completion & Rewards | v1.15 | 3/3 | Complete | 2026-02-22 |
| 67. NPC Quest Givers | v1.15 | 3/3 | Complete | 2026-02-22 |
| 68. Quest UI | v1.15 | 4/4 | Complete | 2026-02-22 |
| 69. Quest Chains & Bounties | v1.15 | 2/2 | Complete | 2026-02-22 |
| 70. Modal Unification | v1.16 | 2/2 | Complete | 2026-02-23 |
| 71. Quest Objective Tracker HUD | v1.16 | 1/1 | Complete | 2026-02-23 |
| 72. Visual Polish | v1.16 | 3/3 | Complete | 2026-02-23 |
| 73. Quest Markers in World | v1.16 | 1/1 | Complete | 2026-02-23 |
| 74. Quest Completion Feedback | v1.16 | 2/2 | Complete | 2026-02-23 |
| 75. Error Handling | v1.16 | 2/2 | Complete | 2026-02-23 |
| 76. Fog of War Foundation | v1.17 | 2/2 | Complete | 2026-02-23 |
| 77. POI Discovery System | v1.17 | 4/4 | Complete | 2026-02-23 |
| 78. Gathering Mini-Game | v1.17 | 4/4 | Complete | 2026-02-23 |
| 79. Resource Risk/Reward | v1.17 | 4/4 | Complete | 2026-02-23 |
| 80. Zone Mastery & Lore | v1.17 | 5/5 | Complete | 2026-02-23 |
| 81. Combat Balancing & Quest Audit | v1.17 | 3/3 | Complete | 2026-02-23 |
| 82. Aquatic Biome Foundation | v1.18 | 3/3 | Complete | 2026-02-23 |
| 83. Aquatic Entity Population | v1.18 | 3/3 | Complete | 2026-02-23 |
| 84. Exotic Biome Foundation | v1.18 | 2/2 | Complete | 2026-02-24 |
| 85. Gathering as Ability System | v1.18 | 4/4 | Complete | 2026-02-24 |
| 86. Exotic Entity Population | v1.18 | 2/2 | Complete | 2026-02-24 |
| 87. Item Integration & Balance | v1.18 | 4/4 | Complete | 2026-02-24 |
| 88. Content Gaps & Discovery | v1.18 | 3/3 | Complete | 2026-02-24 |
| 89. Docker Images | v1.19 | 3/3 | Complete | 2026-02-24 |
| 90. Swarm Stack | v1.19 | 1/1 | Complete | 2026-02-24 |
| 91. Traefik & SSL | v1.19 | 0/2 | Not started | - |
| 92. CI/CD Pipeline | v1.19 | 0/2 | Not started | - |
| 93. Documentation | v1.19 | 0/1 | Not started | - |

**Total:** 93 phases (90 complete, 3 pending)

---
*Last updated: 2026-02-24 - v1.19 roadmap created*
