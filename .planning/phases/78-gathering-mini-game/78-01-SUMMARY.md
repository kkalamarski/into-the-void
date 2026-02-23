---
phase: 78-gathering-mini-game
plan: 01
subsystem: gathering
tags: [types, validation, proficiency, anti-cheat]
dependency_graph:
  requires: []
  provides:
    - gathering-types
    - timing-validation
    - proficiency-logic
  affects:
    - shared-types
    - game-logic
tech_stack:
  added: []
  patterns:
    - pure-functions
    - server-side-validation
    - latency-compensation
key_files:
  created:
    - packages/shared-types/src/game/proficiency.ts
    - packages/game-logic/src/gathering/timing-validation.ts
    - packages/game-logic/src/gathering/proficiency.ts
  modified:
    - packages/shared-types/src/index.ts
    - packages/shared-types/src/network/events.ts
    - packages/game-logic/src/index.ts
decisions:
  - title: "Latency compensation window"
    rationale: "+-200ms tolerance outside success window to account for network latency without allowing cheating"
  - title: "Progressive proficiency scaling"
    rationale: "Success zone scales 20% to 50% (2% per level) to balance challenge with progression reward"
  - title: "Three-tier accuracy system"
    rationale: "Perfect (1.5x), Good (1.0x), Poor (0.5x) provides clear feedback and meaningful yield variation"
metrics:
  duration_seconds: 152
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  commits: 2
  completed_at: "2026-02-23T13:56:16Z"
---

# Phase 78 Plan 01: Gathering Mini-Game Types and Logic Summary

**One-liner:** Timing-based gathering system with server-side validation, latency compensation, and proficiency-based difficulty scaling.

## What Was Built

### Task 1: Define Gathering Types in shared-types
Created `packages/shared-types/src/game/proficiency.ts` with:
- **ResourceCategory** type: `'mining' | 'herbalism' | 'archaeology'` for three gathering professions
- **TimingChallenge** interface: Server-generated challenge with `challengeId`, `duration` (3000ms), and `successWindow` (start/end offsets)
- **TimingResult** interface: Client response with `challengeId`, `clientOffset` (click timing), and `clickTime` (for latency validation)
- **GatheringAccuracy** type: `'poor' | 'good' | 'perfect'` for three-tier performance feedback
- **ProficiencyData** interface: Per-character XP and level tracking for all three categories
- **GATHER_DURATION_MS** constant: Single source of truth for bar duration (3000ms)

Updated `packages/shared-types/src/network/events.ts`:
- Added `gathering:start` and `gathering:complete` to ClientEventType
- Added `gathering:challenge` and `gathering:result` to ServerEventType
- Defined event payloads with proper type safety

**Commit:** `08ce356`

### Task 2: Create Timing Validation and Proficiency Logic in game-logic
Created `packages/game-logic/src/gathering/timing-validation.ts`:
- **validateGatherTiming()**: Core validation function with:
  - Challenge expiry check (duration + 500ms grace period)
  - Challenge ID verification (prevents replay attacks)
  - Three-tier accuracy detection:
    - Perfect: within success window (1.5x yield)
    - Good: within +-200ms tolerance (1.0x yield, latency compensation)
    - Poor: outside tolerance zone (0.5x yield)

Created `packages/game-logic/src/gathering/proficiency.ts`:
- **calculateSuccessZoneWidth()**: Scales success zone 20% to 50% based on proficiency level (2% per level, capped at 50%)
- **calculateXPReward()**: Calculates XP based on accuracy and resource tier (tier 1 = 10 XP, tier 4 = 40 XP, multiplied by accuracy)
- **calculateLevelFromXP()**: Progressive XP curve (level 1→2 = 100 XP, each subsequent level +50 more)
- **calculateBaseYieldBonus()**: 2% yield bonus per level, capped at 50%
- **getResourceCategory()**: Maps entity types (mineral, plant, artifact) to resource categories

**Commit:** `d1235a9`

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions Made

### 1. Latency Compensation Strategy
**Decision:** Use +-200ms tolerance window outside the success zone for "good" accuracy rating.

**Rationale:** Network latency typically ranges 50-150ms. The 200ms tolerance provides enough buffer for reasonable latency without making the mini-game trivially easy or allowing significant cheating. Perfect accuracy (1.5x yield) still requires hitting the actual success window.

**Impact:** Players with moderate latency can still achieve good results, improving accessibility without compromising anti-cheat protection.

### 2. Proficiency Scaling Curve
**Decision:** Success zone scales from 20% (level 1) to 50% (level 16+) at 2% per level.

**Rationale:** Provides meaningful progression reward - at level 16, the success zone is 2.5x wider than level 1. Cap at 50% prevents the mini-game from becoming trivial at high levels while still rewarding investment.

**Impact:** Early gathering is challenging, encouraging players to invest in proficiency. High-level gatherers have a more forgiving experience without eliminating skill requirement.

### 3. Three-Tier Accuracy System
**Decision:** Use three discrete accuracy tiers (poor/good/perfect) rather than continuous scoring.

**Rationale:** Simpler to understand and implement. Clear feedback ("you got perfect!") is more satisfying than abstract scores. Yield multipliers (0.5x, 1.0x, 1.5x) create meaningful variance without extreme punishment or reward.

**Impact:** UI can provide clear visual feedback, players understand performance immediately, server validation logic remains simple and deterministic.

## Technical Details

### Type Safety
All gathering events use strongly-typed interfaces with import-based type references in events.ts. This ensures compile-time verification of event payloads across client and server.

### Anti-Cheat Protection
- Challenge ID verification prevents replay attacks (submitting same timing multiple times)
- Server-side timing validation uses server timestamps, not client-reported times
- Challenge expiry check (duration + 500ms) prevents delayed submissions
- Client offset is validated against server-generated success window

### Pure Functions
All game-logic functions are pure (no side effects, deterministic). This enables:
- Easy unit testing
- Client-side prediction without state corruption
- Server authority while maintaining responsive feedback

## Verification Results

- [x] TypeScript compilation successful for both packages
- [x] Types exported from `@into-the-void/shared-types`
- [x] Functions exported from `@into-the-void/game-logic`
- [x] Event types defined in ClientEvents and ServerEvents interfaces
- [x] All must-have truths satisfied

## Self-Check: PASSED

**Created files:**
```bash
# FOUND: packages/shared-types/src/game/proficiency.ts
# FOUND: packages/game-logic/src/gathering/timing-validation.ts
# FOUND: packages/game-logic/src/gathering/proficiency.ts
```

**Commits:**
```bash
# FOUND: 08ce356 (Task 1)
# FOUND: d1235a9 (Task 2)
```

**Exports verified:**
- TimingChallenge, TimingResult, GatheringAccuracy, ResourceCategory, ProficiencyData exported from shared-types
- validateGatherTiming, calculateSuccessZoneWidth, calculateXPReward, calculateLevelFromXP, calculateBaseYieldBonus, getResourceCategory exported from game-logic
- gathering:start, gathering:complete, gathering:challenge, gathering:result events defined in events.ts

## Next Steps

This plan establishes the foundation for the gathering mini-game. The next plan should implement:
1. Database schema for proficiency tracking (proficiency table with characterId, category, xp, level)
2. Server-side gathering handler (listens to gathering:start, generates challenges, validates timing)
3. Loot integration (resource yield calculation using yieldMultiplier)
4. Proficiency XP and level updates

All types and validation logic are now ready for server-side integration.
