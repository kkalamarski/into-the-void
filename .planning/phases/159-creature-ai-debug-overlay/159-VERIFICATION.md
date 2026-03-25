---
phase: 159
status: human_needed
verified: "2026-03-25"
---

# Phase 159: Creature AI & Debug Overlay — Verification

## Phase Goal
Creatures are alive and moving on screen, and the debug overlay reports the tile type and elevation the player is actually standing on.

## Requirements Coverage

| Requirement | Plan | Status | Notes |
|-------------|------|--------|-------|
| AI-01 | 159-02 | Code verified | Creature AI tick loop confirmed working; wander/flee/chase logic correct; diagnostic logging added |
| AI-02 | 159-02 | Code verified | entity:batch events emitted and handled by client; visual tweening in EntityManager |
| DBG-01 | 159-01 | Code verified | Debug overlay now uses world-aware lookups via getWorldTileHeight/resolveWorldToChunkLocal |

## must_haves Verification

- [x] Debug overlay reports correct tile type and elevation (world-aware lookups)
- [x] Player position correctly maps to tile grid for elevation lookup (prevents sinking)
- [x] Coordinate pipeline consistent between collision, debug overlay, and distance calculations
- [x] Creatures move according to behavior type (code review: wander/flee/chase logic correct)
- [x] Creature position updates broadcast to client (entity:batch events wired correctly)
- [x] Distance calculations between player and creatures use correct coordinate spaces

## Automated Checks

- [x] Web app builds successfully
- [x] Game server builds successfully
- [x] No type errors introduced

## Human Verification Needed

The following require manual testing with a running dev server:

1. **Debug overlay accuracy**: Open F3, walk around different biomes — tile type should match visual tile color, elevation should match visible stack height
2. **Player sinking fixed**: Walk onto elevated terrain — player should not sink below the tile surface
3. **Creature movement visible**: Load into a world zone with creatures — they should visibly move within a few seconds
4. **Creature aggro**: Walk near a predator/maniac — it should aggro after ~0.5s delay
5. **Creature flee**: Walk near a herbivore — it should flee away from you
6. **Distance logging**: Check server console for diagnostic logs showing creature/player distances — verify they look reasonable (e.g., adjacent creatures should show ~128-200px distance, not thousands)

## Score

5/6 must_haves verified via code review. Runtime behavior needs human testing.
