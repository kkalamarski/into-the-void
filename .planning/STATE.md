# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.7 Character Stats — Phase 31 complete, ready for Phase 32

## Current Position

Phase: 32 of 32 (Client Display)
Plan: 3 of 3 in current phase
Status: Plan 03 complete — stat comparison tooltip wired into InventoryPanel
Last activity: 2026-02-18 — 32-03 executed (ItemTooltip stat comparison display + InventoryPanel equippedItem wiring)

Progress: [████░░░░░░] 40% (v1.7 milestone)

## Performance Metrics

**Velocity:**
- Total plans completed: 92 (Phases 1-31 complete)
- Average duration: ~3m per plan
- Total execution time: ~4 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 1-3 | 7 | 2 days |
| v1.1 | 4-7 | 20 | 3 days |
| v1.2 | 8-12 | 8 | 1 day |
| v1.3 | 13-16 | 13 | 1 day |
| v1.4 | 17-20 | 13 | 2 days |
| v1.5 | 21-24 | 9 | 1 day |
| v1.6 | 25-29 | 16 | 2 days |

**Recent Trend:**
- Trend: Stable, averaging 2-4 plans per phase

| Phase 30 P01 | 2 | 3 tasks | 4 files |
| Phase 30 P02 | 3 | 3 tasks | 5 files |
| Phase 31 P01 | 2 | 2 tasks | 4 files |
| Phase 31 P02 | 2 | 2 tasks | 3 files |
| Phase 31 P03 | 2 | 1 task | 1 file |
| Phase 32 P01 | 2 | 2 tasks | 4 files |
| Phase 32 P03 | 3 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.7 research]: Build order is non-negotiable: shared-types → game-logic → game-server → web client; TypeScript compilation enforces this
- [v1.7 research]: `computeCharStats()` must live in `game-logic`, not server — creatures will use the same function in the combat milestone
- [v1.7 research]: `statsStore.ts` must be a separate Zustand store from `gameStore` — same rationale as `inventoryStore` separation (prevents Phaser re-renders)
- [v1.7 research]: Existing character rows need a one-time JSONB migration script — old 5-stat shape produces silent wrong behavior, not compile errors
- [v1.7 research]: Client never calls `computeCharStats()` locally — server emits authoritative `CharStatsPayload`; client only renders it
- [v1.7 research]: Check `combat/damage.ts` and `combat/turn-order.ts` for old stat names (`strength`, `endurance`, `agility`) — TypeScript Partial<> will not catch silent renames
- [30-01]: PlayerStats entirely deleted — no aliasing; CharacterStats is canonical 8-stat type for players and creatures
- [30-01]: strength->power, agility->haste, endurance->toughness rename applied to damage.ts and turn-order.ts
- [30-01]: StatsJson defaults set to level-1 base stats; existing DB rows need Phase 31 migration script
- [Phase 30]: computeCharStats uses SCALE_CONSTANTS[StatScaleTarget] record — new targets require only adding a key
- [Phase 30]: vitest.config.ts added to game-logic to enable @nx/vite:test executor
- [31-01]: stats:update is private (client.emit not server.to(room).emit) — only the requesting client receives their own stats
- [31-01]: Base stats computed with emptyEquipment = { modules: [] } for clean delta between level scaling and equipment bonuses
- [31-01]: emitStats helper pattern — always call after inventory:update when equipment could change
- [31-02]: statsStore follows inventoryStore pattern exactly - same Zustand+immer structure, module-level socket wiring
- [31-02]: migrate-stats-schema.ts targets characters table; hasOldShape() detects old 5-stat keys (strength/agility/endurance/intelligence); NEW_STATS_DEFAULT matches StatsJson level-1 defaults
- [31-03]: statsStore activated via side-effect import in GameUI.tsx — no useStatsStore hook yet (rendering deferred to Phase 32)
- [32-01]: Compare base stats only (not total) for level-up detection — equipment changes affect total, level gains affect base
- [32-01]: P key toggles stats panel following same keyboard-enabled guard pattern as I/E/C keys
- [32-01]: levelUpDeltas accumulates delta amount (next - prev) per stat, not the new absolute value
- [32-03]: equippedItem prop is optional — tooltip degrades gracefully when no item equipped in slot
- [32-03]: Module comparison uses modules[0]; accessory comparison uses accessory1 (v1 limitation)
- [32-03]: Stat names shown are legacy ComputedStats keys (armor, speedMultiplier, etc.) — auto-upgrades when CharacterStats effects added

### Pending Todos

None.

### Blockers/Concerns

**Carried from Phase 28 planning (deferred):**
- Module type compatibility rules (whether module types are mutually exclusive) — not specified in lore; deferred to future design decision
- ilvl formula lore validation still pending

**Carried from v1.3:**
- Server-side elevation validation not wired (client-side complete, server uses old validation)
- Low priority — only relevant if elevation interacts with item pickup range

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 32-03-PLAN.md (stat comparison tooltip + InventoryPanel equippedItem wiring)
Resume file: None

**Next action:** Execute Phase 32 Plan 04 (if exists) or advance to next phase — `/gsd:execute-phase 32`

---
*Last updated: 2026-02-18 after 32-03 stat comparison tooltip wired into InventoryPanel complete*
