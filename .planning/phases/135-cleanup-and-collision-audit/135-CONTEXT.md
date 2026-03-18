# Phase 135: Cleanup and Collision Audit - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all legacy tile-step movement code (client, server, shared types, tests) and audit tile collision data across all biomes so walkable tiles are accurate and no invisible walls remain. Click-to-move and pathfinding are fully removed — WASD pixel movement is the only movement system.

</domain>

<decisions>
## Implementation Decisions

### Click behavior after removal
- Clicking the game world does nothing — no movement, no feedback, no console logs
- Remove all pathfinding visual indicators (path lines, destination markers, movement cursors)
- Preserve click handlers for entities/NPCs/interactive objects — only remove movement-related click handling

### Collision audit criteria
- Determine walkability by visual appearance: if a tile sprite looks flat/walkable, it should be walkable
- Only block tiles with clearly elevated geometry (walls, cliffs, tall solid objects)
- Ambiguous tiles (shallow water, rubble, low bushes) default to walkable — err on the side of gameplay flow
- Audit all zones/biomes — comprehensive pass, not just known problem areas
- Fix collision flags in the tile definitions (world-gen source data), not via runtime overrides

### Dead code removal depth
- Full cascade: delete the 3 named files (MovementController, PathfindingController, A* handler), then trace all imports and remove any orphaned utilities, types, constants, and event handlers
- Remove unused tile-step movement types from shared-types if no remaining code references them
- Remove all legacy server-side tile-step code (old handlers, validators, rate limiters) that have been replaced by pixel movement
- Delete test files that only test removed code — keep tests for the new pixel movement system

### Verification approach
- Automated collision map check: script that dumps collision data per biome and flags tiles where collision=true but tile type is flat/ground-level
- Collision audit script is one-off — run it, fix issues, discard the script
- TypeScript clean build + grep for legacy terms (pathfinding, clickToMove, tileStep, etc.) to catch stale references
- No regression tests for tile collision flags

### Claude's Discretion
- Order of operations for deletion cascade
- How to identify legacy terms for grep verification
- Exact approach for collision map analysis script

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 135-cleanup-and-collision-audit*
*Context gathered: 2026-03-18*
