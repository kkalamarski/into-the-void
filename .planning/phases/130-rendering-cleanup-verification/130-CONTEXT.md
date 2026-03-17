# Phase 130: Rendering Cleanup & Verification - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove PNG tile sprite loading from the runtime path, delete dead code from TileRenderer and PreloadScene, archive PNG tile assets, and verify the complete visual system (terrain cubes, weather, day/night, atmosphere) passes performance and correctness checks against the v1.25 baseline. This is the final phase of milestone v1.26.

</domain>

<decisions>
## Implementation Decisions

### PNG fallback strategy
- Clean break — no debug flag or fallback mechanism to re-enable PNG tile rendering
- PNG tile files are moved to an archive folder (e.g., `assets/archive/tiles/`), not kept in their current location
- If a tile type has no procedural definition at runtime, render a default gray cube (neutral, not jarring — not magenta error color)
- Full sweep across all packages — remove PNG tile-specific types, configs, and references from shared-types and any other packages where they're now dead

### Cleanup scope
- Surgical removal of direct PNG loading paths — don't aggressively trace call chains; if a utility also serves other purposes, leave it
- Clean configuration files too — remove PNG tile entries from asset manifests, Phaser loader configs, and build pipeline references
- Remove stale comments and JSDoc referencing the old PNG tile pipeline
- Delete test files that specifically test PNG tile loading (procedural rendering tests should already exist from prior phases)

### Verification approach
- Manual FPS spot-check: developer opens game, visits one high-density zone, checks FPS counter visually. Document the numbers in commit or PR
- Add a dev-mode `console.warn` if any code path attempts to load a tile PNG at runtime — early regression detection
- No written VERIFICATION.md report — passing success criteria is sufficient
- Test one high-density zone only — if performance is good there, it's good everywhere

### Zone transition testing
- Bar is no crashes/errors — visual hiccups during transitions are acceptable
- If a visual system (weather particles, atmosphere, etc.) is visually broken during zone transitions, fix it in this phase — this is the last phase of the milestone
- Single zone-to-zone transition test exercising all four visual systems is sufficient
- Test after cleanup is complete, not before-and-after comparison

### Claude's Discretion
- Which specific archive folder path for PNG files
- Choice of high-density zone for FPS spot-check
- How to structure the console.warn guard (middleware, wrapper, or direct check)
- Which zone pair to use for transition testing

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

*Phase: 130-rendering-cleanup-verification*
*Context gathered: 2026-03-17*
