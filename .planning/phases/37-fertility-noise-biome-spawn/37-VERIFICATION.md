---
phase: 37-fertility-noise-biome-spawn
verified: 2026-02-18T21:20:07Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 37: Fertility Noise Biome Spawn Verification Report

**Phase Goal:** Spawn density across the world varies by a fertility noise layer — Lush tiles spawn more entities than Barren tiles — and the zone HUD shows the player what fertility tier they are standing in.
**Verified:** 2026-02-18T21:20:07Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `getFertilityAt(worldX, worldY)` returns Barren, Normal, or Lush based on seeded noise | VERIFIED | `packages/world-gen/src/generation/biome.ts` line 185 — method uses `fertilityNoise.fbm()` with `_fertility` seed suffix, normalizes to [0,1], returns tier based on thresholds 0.33/0.66 |
| 2 | `FertilityType` is importable from `@into-the-void/shared-types` | VERIFIED | `packages/shared-types/src/core/zone.ts` line 9 exports `FertilityType = 'Barren' \| 'Normal' \| 'Lush'`; `src/index.ts` re-exports via `export * from './core/zone'` |
| 3 | `generateSpawnPoints` accepts `BiomeGenerator` instead of `BiomeType` | VERIFIED | `packages/world-gen/src/generation/spawn.ts` line 140 — signature is `biomeGenerator: BiomeGenerator` |
| 4 | Lush areas spawn more entities than Barren areas (visible density difference) | VERIFIED | `FERTILITY_MULTIPLIERS = { Barren: 0.5, Normal: 1.0, Lush: 1.5 }` applied to both `creatureDensity` and `mineralDensity` via `Math.round(config.*Density * multiplier * ...)` |
| 5 | Entities at biome-edge tiles come from correct biome's spawn table (per-tile sampling) | VERIFIED | Both creature and mineral loops call `biomeGenerator.getBiome(worldX, worldY)` at each spawn position (lines 164, 189) to select from correct `BIOME_SPAWN_CONFIGS[tileBiome]` |
| 6 | No chunk exceeds density caps: 15 creatures, 10 minerals, 5 plants, 2 artifacts | VERIFIED | `SPAWN_CAPS = { creatures: 15, minerals: 10, plants: 5, artifacts: 2 }` enforced via `Math.min(rawCount, SPAWN_CAPS.creatures/minerals)` at lines 156 and 181 |
| 7 | Zone HUD displays fertility as "Biome Name (Fertility)" format | VERIFIED | `apps/web/src/ui/hud/HUD.tsx` line 95 — `{zoneState?.fertilityType && \` (${zoneState.fertilityType})\`}` appended to biome name span |
| 8 | `ZoneState` includes `fertilityType` field | VERIFIED | `packages/shared-types/src/core/zone.ts` line 98 — `fertilityType: FertilityType` as required (non-optional) field on `ZoneState` interface |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-types/src/core/zone.ts` | FertilityType union type + ZoneState field | VERIFIED | Line 9: `FertilityType` union; line 98: `fertilityType: FertilityType` on `ZoneState` |
| `packages/world-gen/src/generation/biome.ts` | `getFertilityAt` method on `BiomeGenerator` | VERIFIED | Line 185: full implementation using 4th noise layer with `_fertility` seed suffix; `FERTILITY_SCALE = 0.0012` as private readonly class property |
| `packages/world-gen/src/generation/spawn.ts` | Fertility multiplier logic, per-tile sampling, density caps | VERIFIED | Lines 6-17: `FERTILITY_MULTIPLIERS` and `SPAWN_CAPS` constants; lines 148-156: fertility lookup and multiplier application; lines 156/181: cap enforcement; lines 162-165/187-190: per-tile `getBiome` calls |
| `packages/world-gen/src/generation/chunk.ts` | `generateSpawnPoints` called with `this.biomeGenerator` | VERIFIED | Lines 51-57: multi-line call passes `this.biomeGenerator` as 4th argument |
| `apps/game-server/src/game/game.service.ts` | Fertility computation in `getZoneState` | VERIFIED | Lines 97-100: `BiomeGenerator` instantiated with world seed, `getFertilityAt(centerX, centerY)` called, result included in returned `ZoneState` |
| `apps/web/src/ui/hud/HUD.tsx` | Fertility display in biome indicator | VERIFIED | Line 95: fertility appended to biome name display using `zoneState?.fertilityType` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `spawn.ts` density calculation | `BiomeGenerator.getFertilityAt` | `biomeGenerator` parameter | WIRED | Line 151: `biomeGenerator.getFertilityAt(centerX, centerY)` at chunk center |
| `spawn.ts` entity selection | `BiomeGenerator.getBiome` | per-tile biome sampling | WIRED | Lines 164 and 189: `biomeGenerator.getBiome(worldX, worldY)` inside each spawn loop |
| `chunk.ts` | `generateSpawnPoints` | passing `this.biomeGenerator` | WIRED | Lines 51-57: `generateSpawnPoints(this.worldSeed, chunkX, chunkY, this.biomeGenerator, collisions)` |
| `game.service.ts` getZoneState | `BiomeGenerator.getFertilityAt` | `getZoneState()` method | WIRED | Lines 97-100: `new BiomeGenerator(seed).getFertilityAt(centerX, centerY)` with result returned in `ZoneState` |
| `HUD.tsx` | `ZoneState.fertilityType` | `zoneState?.fertilityType` display | WIRED | Line 95: inline conditional render of fertility tier appended to biome display name |

### Requirements Coverage

All requirements for this phase are satisfied:

1. FertilityType exists in shared-types and is exported — SATISFIED
2. BiomeGenerator has 4th noise layer (fertilityNoise) seeded deterministically — SATISFIED
3. `getFertilityAt` returns tiered result based on normalized noise — SATISFIED
4. `generateSpawnPoints` signature uses `BiomeGenerator` — SATISFIED
5. `WorldGenerator.generateChunk` passes `this.biomeGenerator` — SATISFIED
6. Fertility multiplier modulates both creature and mineral density — SATISFIED
7. Density caps enforced with `Math.min` — SATISFIED
8. Per-tile biome sampling for spawn table selection — SATISFIED
9. `ZoneState.fertilityType` is a required field — SATISFIED
10. `getZoneState()` computes and returns fertilityType — SATISFIED
11. HUD displays "Biome Name (Fertility)" format — SATISFIED
12. Build passes for all packages — SATISFIED (pnpm build: 10/10 projects, cache confirmed)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `spawn.ts` | 214, 243 | `return null` | Info | Legitimate: null returned from `weightedPick` when empty list and `findValidSpawnPosition` when no valid position found after max attempts. Both handled via `if (!position) continue` guard. Not a stub. |

No blockers or warnings found.

### Human Verification Required

#### 1. Visual Spawn Density Difference

**Test:** Walk between zones with different fertility tiers (requires running dev server, moving between zones)
**Expected:** Observable difference — Lush zones visually contain more creatures and minerals than Barren zones (approximately 3x difference: Barren=0.5x, Lush=1.5x multiplier)
**Why human:** Requires game running, actual zone traversal, and visual comparison of entity density across fertility boundaries

#### 2. HUD Fertility Update On Zone Transition

**Test:** Move from a zone of one fertility tier into an adjacent zone of a different fertility tier
**Expected:** HUD biome indicator updates from e.g. "Void Plains (Barren)" to "Void Plains (Normal)" when crossing a fertility boundary
**Why human:** Requires live zone transition event flow — cannot verify dynamic WebSocket event → Zustand state update → React re-render chain statically

### Gaps Summary

No gaps. All 8 observable truths are verified. All artifacts exist with substantive implementations (not stubs). All key links are wired and connected end-to-end. The build compiles cleanly for all 10 projects.

---

_Verified: 2026-02-18T21:20:07Z_
_Verifier: Claude (gsd-verifier)_
