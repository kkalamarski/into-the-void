# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.6 Inventory & Items — Phase 27: Client State & Inventory Panel UI

## Current Position

Phase: 27 of 29 (Client State & Inventory Panel UI) — COMPLETE
Plan: 3 of 3 complete
Status: Phase 27 complete — all 3 plans done
Last activity: 2026-02-17 — Phase 27 Plan 03 complete: ItemTooltip component, setKeyboardEnabled, tooltip integration in InventoryPanel

Progress: [████████░░░░░░░░░░░░] 47% (27/29 phases complete; 9/16 v1.6 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 81 (Phases 1-24 complete + Phase 25 Plans 01-04 + Phase 26 Plans 01-04 + Phase 26 Plan 02)
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

**Recent Trend:**
- Trend: Stable, averaging 2-4 plans per phase

| Phase 25 P02 | 391s | 3 tasks | 8 files |
| Phase 25 P04 | 183s | 3 tasks | 4 files |
| Phase 26 P04 | 77s | 2 tasks | 2 files |
| Phase 26 P01 | 129s | 3 tasks | 3 files |
| Phase 26 P02 | 195s | 3 tasks | 3 files |
| Phase 26 P03 | 116s | 3 tasks | 3 files |
| Phase 27 P01 | 127s | 3 tasks | 4 files |
| Phase 27 P02 | 754s | 3 tasks | 6 files |
| Phase 27 P03 | 115 | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.6 research]: Equipment JSONB must migrate from `head/chest/legs/feet` to `{ exosuit, modules[], tool, accessory1, accessory2 }` before any server handlers or UI are written
- [v1.6 research]: `updateInventoryFull` single atomic DB call required — two-call pattern is a confirmed duplication exploit vector (Arc Raiders Feb 2026)
- [v1.6 research]: `inventory:update` must use `client.emit()` exclusively — never `server.to(zoneId).emit()`; entity despawn is zone-wide, inventory update is private
- [v1.6 research]: `inventoryStore.ts` must be a separate Zustand store from `gameStore` — inventory changes must not trigger Phaser canvas re-renders
- [v1.6 research]: Action bar uses instance-ID references, not slot-position references; stale references auto-invalidate on every `inventory:update`
- [v1.6 research]: Hotbar slot assignments persist to `localStorage` (client preference, not authoritative game state)
- [25-01]: ItemCategory uses 6 lore-mandated types (suit|module|tool|consumable|world-item|reagent) — differs from shared-types which has 7
- [25-01]: ItemRarity uses 5 tiers (common|rare|epic|exotic|legendary) — no 'uncommon' per lore; ilvl formula confirmed as tier*10*multiplier with 1.0/1.2/1.5/1.8/2.2
- [25-03]: EquipmentJson migrated to exo-suit model (exosuit/modules[]/tool) — old head/chest/legs/feet fields removed
- [25-03]: updateInventoryFull uses single .set({ items, equipment }) call — prevents two-write race window duplication exploit
- [25-02]: World-items carry no effects array — biome materials are plain data, not behavior-carrying items (effects field is optional in ItemDefinition)
- [25-02]: Stim buff items use string stat names (scan_speed, endurance, combat_speed, all_performance) for forward compatibility with stat system to be designed in later phases
- [25-02]: World-item rarity distribution deliberately uneven — anomaly zone drops are exotic, ancient fragments legendary, matching lore tier system
- [25-03]: Migration script casts newEquipment as any for Drizzle JSONB — appropriate for one-time data migration with legacy unknown types
- [Phase 25]: validateEquip rejects non-equippable categories (consumable/world-item/reagent) explicitly — prevents misuse of equip endpoint
- [Phase 25]: resolveEffect exhaustive never check emits console.warn for unknown types — forward compatible with new effect types
- [26-04]: speedMultiplier stacks multiplicatively across modules so compound speed bonuses are accurate; all other stats additive
- [26-04]: Timed stat_buff effects from consumables excluded from effectiveStats — tracked in player state, not derived from equipment
- [26-01]: InventoryEquipment uses exosuit/modules[]/tool/accessory1/accessory2 — matches EquipmentJson DB schema; old EquipmentSlot type removed from shared-types
- [26-01]: All equip/unequip operations use updateInventoryFull single atomic call; addItem uses updateInventoryItems (items-only write, no equip change)
- [26-01]: removeItem returns removedItem so callers can spawn ground entities with correct itemId on drop
- [26-02]: claimEntity is synchronous — must execute before any await to prevent TOCTOU race on simultaneous pickup by two players
- [26-02]: ItemEntity.name uses ItemDefinition.displayName (not .name) — items package field is displayName, not name
- [26-02]: inventory:update emissions are private (client.emit); entity:spawn/despawn are zone-wide (server.to(zoneId).emit)
- [26-03]: PlayerService injects InventoryService directly (no forwardRef needed — InventoryService has no PlayerService dependency)
- [26-03]: case 'item' in handleInteraction delegates fully to handleItemPickup — avoids duplicating claim/write logic; single source of truth for atomic pickup
- [26-03]: InteractionResult.inventory is optional — entity:update still broadcasts zone-wide; inventory:update only emitted when non-null
- [27-01]: inventoryStore is separate Zustand store from gameStore — inventory updates must not trigger Phaser canvas re-renders
- [27-01]: inventory:reorder always responds with inventory:update regardless of moveSlot outcome — ensures pendingReorder is always cleared on client
- [27-01]: GameGateway uses player.id (not player.characterId) — Player shared-type exposes id field only
- [Phase 27]: InventoryPanel uses non-optimistic reorder: pendingReorder blocks UI until server inventory:update clears it via setInventory
- [Phase 27]: Slot array built from maxSlots count with slot-index lookup — empty slots render as null entries in fixed-size grid
- [Phase 27]: @floating-ui/react installed at workspace root (single root package.json Nx monorepo); ItemTooltip wraps reference div to preserve SortableSlot drag behavior

### Pending Todos

None.

### Blockers/Concerns

**Design decisions needed before Phase 28 begins:**
- Module type compatibility rules (whether module types are mutually exclusive, e.g. max 2 Speed modules per suit) — not specified in lore; needs design decision before server validation is written
- ilvl formula (tier x rarity multiplier: 1.0/1.2/1.5/1.8/2.2) — implemented in computeIlvl (25-01) and displayed in ItemTooltip (Phase 27-03); lore validation still pending

**Carried from v1.3:**
- Server-side elevation validation not wired (client-side complete, server uses old validation)
- Low priority — only relevant if elevation interacts with item pickup range

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 27-03-PLAN.md — Phase 27 complete
Resume file: None

**Next action:** Execute Phase 28

---
*Last updated: 2026-02-17 after Phase 27 Plan 03 complete*
