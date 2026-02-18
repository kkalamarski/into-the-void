---
phase: 31-server-wiring-socket-delivery
plan: 02
subsystem: client-state, database-migration
tags: [zustand, socket-io, drizzle, stats, migration]
dependency_graph:
  requires: [31-01]
  provides: [statsStore, migrate-stats-schema]
  affects: [apps/web/src/store, packages/database/src/migrations]
tech_stack:
  added: []
  patterns: [zustand-immer-store, module-level-socket-wiring, idempotent-migration]
key_files:
  created:
    - apps/web/src/store/statsStore.ts
    - packages/database/src/migrations/migrate-stats-schema.ts
  modified:
    - apps/web/src/network/socket.ts
decisions:
  - statsStore follows inventoryStore pattern exactly - same Zustand+immer structure, module-level socket wiring
  - Migration script targets characters table; hasOldShape() detects old 5-stat keys (strength/agility/endurance/intelligence)
  - NEW_STATS_DEFAULT matches StatsJson schema defaults in characters.ts (level-1 base stats)
metrics:
  duration: 2m
  completed: 2026-02-18
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 31 Plan 02: Client Stats Store and DB Migration Summary

**One-liner:** Zustand statsStore with stats:update socket wiring and idempotent JSONB migration script for old 5-stat character rows.

## What Was Built

### Task 1: statsStore.ts and socket.ts update

Created `apps/web/src/store/statsStore.ts` following the exact `inventoryStore.ts` pattern:
- `useStatsStore` hook exposing `stats: CharStatsPayload | null`, `setStats`, and `clearStats`
- Zustand with immer middleware
- `gameSocket.on('stats:update', ...)` wired at module level — fires when server pushes updated stats

Added `'stats:update'` to the `serverEvents` array in `apps/web/src/network/socket.ts` (after `'storage:update'`).

### Task 2: migrate-stats-schema.ts

Created `packages/database/src/migrations/migrate-stats-schema.ts`:
- `hasOldShape()` function detects the old 5-stat shape by checking for `strength`, `agility`, `endurance`, or `intelligence` keys
- `NEW_STATS_DEFAULT` with all 8 level-1 base stats matching `StatsJson` schema defaults
- Idempotent loop: skips rows that already have the new 8-stat shape
- Targets `characters` table via Drizzle `db.update(characters).set(...).where(eq(characters.id, row.id))`
- Logs migrated/skipped counts and character names for audit trail

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | afda5e3 | feat(31-02): add statsStore and wire stats:update socket event |
| Task 2 | c45ac07 | feat(31-02): add migrate-stats-schema.ts for characters.stats JSONB |

## Self-Check: PASSED

- FOUND: apps/web/src/store/statsStore.ts
- FOUND: apps/web/src/network/socket.ts
- FOUND: packages/database/src/migrations/migrate-stats-schema.ts
- FOUND commit: afda5e3
- FOUND commit: c45ac07
