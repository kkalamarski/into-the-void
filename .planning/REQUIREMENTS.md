# Requirements: Into the Void

**Defined:** 2026-02-14
**Core Value:** Players can create an account, log in, and select/create characters before entering the game world.

## v1.1 Requirements

Requirements for post-login game experience. Each maps to roadmap phases.

### Network & Connection

- [ ] **NET-01**: Game connects to WebSocket with auth token and characterId after character selection
- [ ] **NET-02**: Client receives initial game state (player position, zone data, nearby entities)
- [ ] **NET-03**: Client sends player actions (movement, interactions) to server
- [ ] **NET-04**: Client receives real-time updates from server (player positions, entity states)
- [ ] **NET-05**: Client handles disconnect gracefully (shows reconnecting UI, queues actions)
- [ ] **NET-06**: Client reconciles position with server authority (client-side prediction)

### World Rendering

- [ ] **REND-01**: World renders as color-coded tiles (walkable, blocking, water, acid, lava, etc.)
- [ ] **REND-02**: Viewport culling renders only visible tiles (performance)
- [ ] **REND-03**: Zone name displays biome tier with color coding (Tier I=green, IV=red)
- [ ] **REND-04**: Chunks load as player approaches and unload when distant
- [ ] **REND-05**: Camera follows player with smooth scrolling

### Movement

- [ ] **MOV-01**: Player moves with WASD or arrow keys
- [ ] **MOV-02**: Player moves with click-to-move (A* pathfinding)
- [ ] **MOV-03**: Movement provides immediate visual feedback (client-side prediction)
- [ ] **MOV-04**: Server validates movement and corrects if needed

### HUD & UI

- [ ] **HUD-01**: HUD displays player health bar
- [ ] **HUD-02**: HUD displays player energy bar
- [ ] **HUD-03**: HUD displays current zone name with tier indicator
- [ ] **HUD-04**: Minimap shows player position and biome colors

### Entities

- [ ] **ENT-01**: Other players appear in the world as colored tiles
- [ ] **ENT-02**: Entities (creatures, items, plants) appear as colored tiles by type
- [ ] **ENT-03**: Entities display health bars when damaged
- [ ] **ENT-04**: Creatures display behavioral icons (Herbivore/Omnivore/Predator/Maniac)
- [ ] **ENT-05**: Static entity registry defines all tile types, creatures, items with configs

## Future Requirements

Deferred to subsequent milestones.

### Movement Enhancements

- **MOV-05**: Dual movement system (keyboard + click work simultaneously for tactical control)

### HUD Enhancements

- **HUD-05**: Faction-specific HUD theming (colors match Verdant/Helix/Nexus)

### Network Optimizations

- **NET-07**: Advanced interpolation for all visible entities
- **NET-08**: Session restoration on reconnect (resume from disconnect point)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Sprite-based rendering | v1.1 uses color tiles only; sprites deferred |
| Combat system | Separate milestone; requires game design decisions |
| Inventory UI | Separate milestone; requires item system design |
| Chat system | Separate milestone |
| Sound/music | Polish; defer until core gameplay stable |
| Mobile controls | Web-first; mobile later |
| Real-time chat | High complexity, not core to v1.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NET-01 | — | Pending |
| NET-02 | — | Pending |
| NET-03 | — | Pending |
| NET-04 | — | Pending |
| NET-05 | — | Pending |
| NET-06 | — | Pending |
| REND-01 | — | Pending |
| REND-02 | — | Pending |
| REND-03 | — | Pending |
| REND-04 | — | Pending |
| REND-05 | — | Pending |
| MOV-01 | — | Pending |
| MOV-02 | — | Pending |
| MOV-03 | — | Pending |
| MOV-04 | — | Pending |
| HUD-01 | — | Pending |
| HUD-02 | — | Pending |
| HUD-03 | — | Pending |
| HUD-04 | — | Pending |
| ENT-01 | — | Pending |
| ENT-02 | — | Pending |
| ENT-03 | — | Pending |
| ENT-04 | — | Pending |
| ENT-05 | — | Pending |

**Coverage:**
- v1.1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 (pending roadmap creation)

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after initial definition*
