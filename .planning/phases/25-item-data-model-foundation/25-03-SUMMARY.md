---
phase: 25-item-data-model-foundation
plan: "03"
subsystem: database
tags: [database, inventory, equipment, schema, drizzle]
dependency_graph:
  requires: ["25-01"]
  provides: ["EquipmentJson exo-suit model", "updateInventoryFull", "player_storage schema", "storage CRUD queries"]
  affects: ["packages/database/src/schema/inventories.ts", "packages/database/src/queries/inventory.ts", "packages/database/src/schema/storage.ts", "packages/database/src/queries/storage.ts"]
tech_stack:
  added: []
  patterns: ["Atomic DB update (single SET call)", "JSONB typed with Drizzle $type<>()"]
key_files:
  created:
    - packages/database/src/schema/storage.ts
    - packages/database/src/queries/storage.ts
    - packages/database/src/migrations/migrate-equipment-schema.ts
  modified:
    - packages/database/src/schema/inventories.ts
    - packages/database/src/queries/inventory.ts
    - packages/database/src/schema/index.ts
    - packages/database/src/index.ts
decisions:
  - "EquipmentJson migrated from head/chest/legs/feet to exosuit/modules[]/tool/accessory1/accessory2 per lore mandate"
  - "updateInventoryFull uses single .set({ items, equipment }) call to prevent two-write race window exploit"
  - "Migration script casts newEquipment as any to bypass Drizzle strict type on JSONB column (script only, not production code)"
metrics:
  duration: "3m 1s"
  completed: "2026-02-17"
  tasks_completed: 4
  files_created: 3
  files_modified: 4
---

# Phase 25 Plan 03: Migrate Equipment Schema & Add Storage Summary

**One-liner:** EquipmentJson migrated to exo-suit model (exosuit/modules[]/tool/accessory1/accessory2), atomic `updateInventoryFull` added, and `player_storage` table with CRUD queries created.

## What Was Built

### Task 1: EquipmentJson Interface Update

`packages/database/src/schema/inventories.ts` — replaced the old humanoid armor model with the lore-mandated exo-suit equipment model:

- Removed: `head`, `chest`, `legs`, `feet`, `hands`, `mainHand`, `offHand`
- Added: `exosuit?`, `modules: InventoryItemJson[]`, `tool?`, `accessory1?`, `accessory2?`
- Default value changed from `{}` to `{ modules: [] }`
- Both `InventoryItemJson` and `EquipmentJson` are now exported interfaces (previously unexported)

### Task 2: Atomic updateInventoryFull Function

`packages/database/src/queries/inventory.ts` — added `updateInventoryFull(db, characterId, { items, equipment })`:

- Single `.update().set({ items, equipment })` call — one SQL statement, PostgreSQL atomicity guarantee
- Prevents item duplication exploit window from the two-call `updateInventoryItems` + `updateEquipment` pattern
- Exported automatically via existing `export * from './queries/inventory'` in `packages/database/src/index.ts`

### Task 3: Equipment Schema Migration Script

`packages/database/src/migrations/migrate-equipment-schema.ts`:

- Detects old-shape rows via `head|chest|legs|feet` field presence
- Transforms: `mainHand` → `tool`, accessories preserved, armor slots discarded (no exosuit equivalent)
- Idempotent: skips rows already in new shape
- Not run automatically — manual one-time script before first deploy with new code

### Task 4: player_storage Table and CRUD Queries

`packages/database/src/schema/storage.ts`:
- `player_storage` table: `characterId` (PK, FK → characters, cascade delete), `items JSONB[]`, `maxSlots integer (default 50)`, `createdAt`, `updatedAt`
- Exported types: `PlayerStorage`, `NewPlayerStorage`

`packages/database/src/queries/storage.ts`:
- `getPlayerStorage(db, characterId)` — returns `PlayerStorage | undefined`
- `createPlayerStorage(db, data)` — inserts new row, returns full record
- `updatePlayerStorage(db, characterId, items)` — updates items + updatedAt timestamp
- `getOrCreatePlayerStorage(db, characterId)` — convenience function for first-access pattern

## Verification Results

1. `nx run database:build` — PASSED (all 4 tasks, fresh build)
2. `grep "exosuit" inventories.ts` — PASSED
3. `grep "modules:" inventories.ts` — PASSED (shows `InventoryItemJson[]` type and `{ modules: [] }` default)
4. `grep -c "head|chest|legs|feet" inventories.ts` — PASSED (returns 0)
5. `grep "updateInventoryFull" queries/inventory.ts` — PASSED

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed type error in migration script**
- **Found during:** Task 3 verification build
- **Issue:** `NewEquipmentJson` using `unknown` for field types was not assignable to Drizzle's typed `EquipmentJson` in `.set({ equipment: newEquipment })`
- **Fix:** Added `as any` cast with eslint-disable comment — appropriate for a migration script operating on legacy data with intentionally loose types
- **Files modified:** `packages/database/src/migrations/migrate-equipment-schema.ts`
- **Commit:** cad6feb (included in same commit)

## Commits

| Hash | Message |
|------|---------|
| 99c0ae8 | feat(25-03): update EquipmentJson to exo-suit model |
| 89519f9 | feat(25-03): add updateInventoryFull atomic function |
| cad6feb | chore(25-03): add one-time equipment schema migration script |
| b0a543d | feat(25-03): add player_storage table schema and CRUD queries |

## Self-Check

**Files:**
- [x] `packages/database/src/schema/inventories.ts` — contains exosuit, modules[], tool, accessory1, accessory2
- [x] `packages/database/src/queries/inventory.ts` — contains updateInventoryFull
- [x] `packages/database/src/migrations/migrate-equipment-schema.ts` — exists
- [x] `packages/database/src/schema/storage.ts` — exists with player_storage table
- [x] `packages/database/src/queries/storage.ts` — exists with CRUD functions
- [x] `packages/database/src/schema/index.ts` — exports storage
- [x] `packages/database/src/index.ts` — exports storage queries

**Commits:**
- [x] 99c0ae8 — exists
- [x] 89519f9 — exists
- [x] cad6feb — exists
- [x] b0a543d — exists

## Self-Check: PASSED
