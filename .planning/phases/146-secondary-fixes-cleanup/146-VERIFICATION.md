---
phase: 146
status: passed
verified: 2026-03-19
requirements: [MISC-01, MISC-02, MISC-03, MISC-04]
---

# Phase 146: Secondary Fixes & Cleanup — Verification

## Goal
Portal debounce works correctly across zone boundaries, NPC proximity uses consistent pixel positioning, debug logs are removed from production code, and PROJECT.md known-issues reflects the real bug.

## Must-Have Verification

### 1. Portal debounce key includes zoneId (MISC-01)

**Status: PASS**

Evidence:
- `checkPortalTileAtPixels` at line 2252 builds key as `${this.currentZoneId}:${tileX},${tileY}` — zoneId is included
- `commitZoneTransition` at line 1132 clears `this.lastPortalEmitKey = null` on zone commit
- `fullZoneReset` at line 1256 clears `this.lastPortalEmitKey = null` on teleportation
- Traveling through a portal to a new zone produces a different debounce key, so another portal at the same tile coords is NOT suppressed

### 2. NPC proximity uses consistent pixel positioning (MISC-02)

**Status: PASS**

Evidence:
- `updateLocalPlayerSprite` at line 2091 reads `this.pixelMovement?.getPosition()` for real pixel coordinates
- Falls back to `tileToPixelCenter` only when pixelMovement is not initialized
- Both tile-based and pixel-movement paths now pass actual pixel coordinates to `updateNpcProximity`
- TypeScript build passes with no errors

### 3. Debug console.log removed from entity click handlers (MISC-03)

**Status: PASS**

Evidence:
- Zero `console.log` statements remain in WorldScene.ts (grep confirms 0 matches)
- Three `[DEBUG]` lines removed from `gameobjectdown` handler
- 12 additional `[WorldScene]`/`[ChunkManager]` debug logs removed
- Single `console.warn` for missing chunk handler preserved (legitimate warning)

### 4. PROJECT.md known-issues corrected (MISC-04)

**Status: PASS**

Evidence:
- Stale "Adjacent chunk loading breaks on component remount" entry removed (bug was fixed in Phase 144)
- Known Issues section now contains only the WebSocket auth entry
- No stale entries remain

## Build Verification

**Status: PASS**
- `npx nx run web:build` completes successfully with no TypeScript errors

## Requirement Traceability

| Requirement | Plan | Status |
|-------------|------|--------|
| MISC-01 | 146-01 | Verified |
| MISC-02 | 146-01 | Verified |
| MISC-03 | 146-02 | Verified |
| MISC-04 | 146-02 | Verified |

## Result

**PASSED** — All 4 must-haves verified against codebase. Build passes. All requirements accounted for.
