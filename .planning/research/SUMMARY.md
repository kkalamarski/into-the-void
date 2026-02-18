# Project Research Summary

**Project:** Into the Void — Character Stats System
**Domain:** Multiplayer 2D sci-fi survival MMO — 8 primary stats, level scaling, equipment bonuses, stat panel HUD
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

The character stats system for Into the Void is a well-defined evolution of existing code — not a greenfield build. Every package needed already exists in the installed stack, and the majority of integration hooks (combat functions, equipment bonuses, HUD display, socket delivery) are already in place. The core work is a type rename and shape migration: replacing the legacy 5-stat `PlayerStats` (strength, agility, endurance, intelligence, perception) with the lore-aligned 8-stat `CharacterStats` (Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience), wiring those stats into 8 existing gameplay hooks, and surfacing them to players in a HUD stat panel.

The recommended approach is to build strictly bottom-up: shared types first, then pure game-logic functions, then server orchestration, then client display. This order is mandatory because TypeScript compilation propagates — shared-types must exist before game-logic can import types, which must exist before game-server can call functions, which must exist before the web client can wire events. The `computeCharStats()` pure function in `game-logic` is the single most important deliverable: it is called by combat, by the stat panel, and eventually by creature AI. Building it correctly and testing it independently before wiring it into anything else is the critical path.

The primary risks are correctness risks, not architectural risks. Three stand out: (1) the old `PlayerStats` fields appear in `combat/damage.ts` and `combat/turn-order.ts` — missing either reference will produce silent wrong behavior rather than a compile error; (2) the JSONB shape change for existing character rows needs a one-time migration script or existing characters carry stale old-stat-name data; (3) stats must never be computed on the client — the server is authoritative, and client-side stat derivation is a cheat vector.

## Key Findings

### Recommended Stack

The stat system requires zero new packages. All capability — TypeScript types, pure computation, JSONB persistence, WebSocket delivery, Zustand display — already exists in the installed stack. This is a type evolution and code addition within established patterns.

**Core technologies:**
- TypeScript ^5.4.0: `CharacterStats` interface and `ItemEffect` discriminated union types — no runtime library needed for math this simple
- `@into-the-void/shared-types` (workspace): replaces `PlayerStats` with `CharacterStats`; adds `CharStatsPayload` for socket delivery — same package, type evolution only
- `@into-the-void/game-logic` (workspace): new `computeCharStats()` pure function — mirrors the `validateMovement` pattern (pure, tested, importable by both server and client)
- `@into-the-void/database` (workspace): JSONB shape change only via `$type<StatsJson>()` update; no SQL schema migration required, only a one-time data migration script for existing rows
- Zustand 4.5.7 + Immer ^11.1.4: new `statsStore.ts` as a dedicated separate store — mirrors `inventoryStore` pattern to prevent unnecessary Phaser re-renders from stat update events
- Socket.IO ^4.7.0: new `stats:update` server event delivers `CharStatsPayload`; emitted on auth and every equip/unequip event
- React 18 + react-icons ^5.5.0 + @floating-ui/react ^0.27.18: new `StatsPanel.tsx` HUD component; all libraries already installed

**Key architectural decision:** A single `CharacterStats` type shared by both player characters and creatures. The combat milestone requires creatures to fight using the same `calculateDamage()` formulas — if creatures have a different stat model, combat requires two separate code paths. One type, same 8 stats, parameterized scaling constants for creature vs player scaling.

### Expected Features

**Must have (table stakes):**
- `computeBaseStats(level)` pure function — the critical path dependency; every other feature requires this to exist first
- `CharacterStats` type replacing `PlayerStats` — type safety enforced by TypeScript across the entire codebase; compile errors at every reference site that needs updating
- Final stat computation (`base + equipment bonuses`) wired into 8 existing gameplay hooks: Durability → maxHealth, Toughness → damage reduction, Power → base damage, Haste → move speed, Vigor → maxEnergy, Recovery → energy regen rate, Perception → detection range, Resilience → hazard resistance
- Stat panel UI (HUD overlay, toggle 'C') showing base / equipment bonus / total for all 8 stats with inline name descriptions
- Level-up stat delta notification — server sends delta payload; client shows "+5 Durability" overlay for 3 seconds
- Creature stats using the same formula — `computeBaseStats(level, 'creature')` with separate scaling constants; `calculateDamage()` accepts creature stats without a separate code path

**Should have (differentiators):**
- Stat breakdown showing base vs equipment contribution ("Toughness 45 = 30 base + 15 from Armor Module") — teaches players how the system works; validated by Path of Exile community demand for this feature
- Soft-caps on derived effects (e.g., max 75% damage reduction from Toughness) — prevents extreme power gaps at high levels; must be documented in stat panel as tunable constants
- Item tooltip stat bonus display with delta comparison (green/red +/- vs currently equipped item)
- Lore-named stat tooltips inline ("Resilience: reduces hazard tick damage") — unfamiliar stat names require explanation

**Defer (v2+):**
- Perception visual detection radius circle in Phaser canvas — high complexity, medium value; requires Phaser rendering work
- Faction-specific stat bonuses (Verdant: +Resilience; Helix: +Power; Nexus: +Perception) — requires faction standing system which is not yet designed
- Soft stat allocation via faction advancement — late-game differentiation layer, not foundational

**Anti-features (do not build):**
- Stat point allocation on level-up — breaks linear scaling balance model; equipment provides build variety instead
- Persistent consumable buffs stored in character DB — complex expiry logic, exploit vector; session-only buffs in server memory only
- Multiplicative equipment bonus stacking — exponential power curves, unbalanceable in multiplayer context; additive stacking only
- Client-computed stats — cheat vector; client receives authoritative `CharStatsPayload` from server and renders it, never derives stats locally

### Architecture Approach

The architecture follows a strict layered pattern: shared types at the bottom, pure game-logic computation in the middle, server orchestration on top, client display at the top. A new `StatsService` in game-server orchestrates computation (loads character + equipment from in-memory maps, calls the pure function, emits `stats:update`). The client receives the computed breakdown via a new dedicated `statsStore` Zustand store and a new `StatsPanel.tsx` component renders it. The server never trusts client-provided stat values.

**Major components:**
1. `packages/shared-types/src/core/stats.ts` (NEW) — canonical types: `PrimaryStatId`, `BaseStats`, `StatBreakdown`, `CharStatsPayload`; also updates `ServerEvents` with `stats:update`
2. `packages/game-logic/src/stats/` (NEW module) — `STAT_DEFINITIONS` constant + `computeCharStats()` pure function; zero DB or socket dependencies; fully unit-testable
3. `apps/game-server/src/game/stats.service.ts` (NEW) — NestJS service orchestrating computation and `stats:update` emission; called after auth and every equip/unequip event
4. `apps/web/src/store/statsStore.ts` (NEW) — dedicated Zustand + immer store wired to `stats:update`; separate from `gameStore` to prevent Phaser re-renders
5. `apps/web/src/components/StatsPanel.tsx` (NEW) — HUD overlay rendering stat breakdown table; built last in the dependency chain

**Key constraint:** Stats must not be added to `gameStore`. The `gameStore` is subscribed to by the Phaser game instance; adding `CharStatsPayload` there triggers unnecessary Phaser render cycles on every equip event. The `inventoryStore` separation exists for this exact reason — `statsStore` follows the identical pattern.

### Critical Pitfalls

1. **Client-authoritative stat computation** — If the client derives stats locally from level + equipment, any stat value can be forged. Prevention: server emits `CharStatsPayload` on every auth + equip change; `statsStore` holds server truth; client never calls `computeCharStats()` locally.

2. **Adding stats to `gameStore` instead of a dedicated store** — The Phaser game instance subscribes to `gameStore`; stat updates on every equip event trigger unnecessary Phaser render cycles. Prevention: create `statsStore.ts` as a dedicated Zustand store with immer, identical in structure to `inventoryStore.ts`. This rationale is already documented in the codebase's `inventoryStore` separation.

3. **Missing stat references in `combat/damage.ts` and `turn-order.ts`** — The old `PlayerStats` fields (`strength`, `agility`, `endurance`) appear in `calculateDamage()` and initiative calculation. If `DamageParams` accepts `Partial<PlayerStats>`, TypeScript will not error on the rename — it silently ignores missing partial fields. Prevention: grep for all old stat names before marking the type migration complete; update `DamageParams` to `Partial<BaseStats>` explicitly.

4. **JSONB shape migration for existing character rows** — PostgreSQL JSONB is schema-less. Existing rows with old stat field names will coexist with new code that writes the new shape. The application will not error on read — it will return `undefined` for new stat names on old rows, silently producing wrong combat results. Prevention: write a one-time migration script (following `migrate-equipment-schema.ts` pattern) that remaps old stat keys to new keys for all existing character rows before deployment.

5. **Non-atomic inventory operations during equip** — From the inventory pitfalls research (Part 3 of PITFALLS.md): `updateInventoryItems` and `updateEquipment` are separate DB calls today. A crash between them leaves an item in both columns. When stats are wired to equipment, this corruption also produces wrong effective stats. Prevention: all equip operations must use a single `UPDATE inventories SET items = $1, equipment = $2` call — established in the inventory milestone, verify it remains in place.

## Implications for Roadmap

Based on combined research, the character stats milestone has a clear 3-phase internal structure driven by the TypeScript dependency chain. The build order is non-negotiable.

### Phase 1: Type Foundation and Pure Computation

**Rationale:** Shared types must be established before any other package or app can compile. The pure computation function is the critical path dependency — everything else plugs into it. This phase has no UI, no server changes, no socket events. It is entirely package-level work that can be unit-tested independently before any integration begins.

**Delivers:** `CharacterStats` / `BaseStats` types in shared-types; `computeCharStats()` pure function in game-logic with full unit tests; `STAT_DEFINITIONS` constant with level-scaling values; updated `ItemEffect` union types for stat bonuses (`durability_bonus`, `toughness_bonus`, etc.); `ComputedStats` updated to use the 8-stat structured model; one-time JSONB data migration script written alongside the type change.

**Addresses:** `computeBaseStats(level)` pure function, `CharacterStats` type replacing `PlayerStats`, creature stat reuse (same function, different scaling constants).

**Avoids pitfalls:** Missing stat references in combat functions (audited at this phase before any downstream code is written); JSONB migration script written before any production deployment.

**Research flag:** Standard patterns — no deeper research needed. Pure function math and TypeScript type evolution are well-documented. The `validateMovement` function in game-logic is the direct structural template.

### Phase 2: Server Wiring and Socket Delivery

**Rationale:** Server orchestration depends on Phase 1 types being complete. `StatsService` imports `computeCharStats()` from game-logic, reads from `PlayerService` and `InventoryService` (both already exist), and emits a new `stats:update` event. The `ServerEvents` interface is updated here. The JSONB migration script is executed in this phase. Combat functions are updated to use the new stat names.

**Delivers:** `StatsService` NestJS service; `stats:update` added to `ServerEvents`; `game.gateway.ts` updated to call `computeAndEmit` after auth and all equip/unequip events; `game.module.ts` updated to register `StatsService`; `game-logic/src/combat/damage.ts` updated with new stat name references; `combat/turn-order.ts` updated (`agility` → `haste`); JSONB data migration script executed for existing character rows.

**Addresses:** Stat effects wired into all 8 gameplay hooks; creature stats via same formula; level-up stat delta in server event payload.

**Avoids pitfalls:** Client-authoritative stat computation (server is sole computation site); non-atomic inventory operations (verify equip path uses single DB write); missing combat stat references (updated in this phase, not deferred).

**Research flag:** Standard patterns — NestJS service injection, Socket.IO event emission, Drizzle transaction patterns all have existing examples in codebase. `PlayerService` and `InventoryService` are direct structural templates.

### Phase 3: Client Display

**Rationale:** Client display can only be built after the `stats:update` socket event exists and delivers data (Phase 2). The `statsStore` wires the socket event to Zustand state. `StatsPanel.tsx` renders what the store holds. This phase is pure UI work and can be iterated independently once the event is flowing.

**Delivers:** `statsStore.ts` Zustand + immer store wired to `stats:update`; `StatsPanel.tsx` HUD overlay component with toggle; stat name tooltips using inline descriptions; level-up notification overlay; stat icons from already-installed react-icons gi set.

**Addresses:** Stat panel UI (8 stats, 3 columns: base / bonus / total); level-up delta notification; stat name tooltips for lore-named stats; stat breakdown showing base vs equipment contribution.

**Avoids pitfalls:** Stats added to `gameStore` triggering Phaser re-renders (explicitly separate store); client computing stats locally (store holds server-delivered `CharStatsPayload`, renders it directly).

**Research flag:** Standard patterns — Zustand store with immer, React component, HUD styling. `inventoryStore.ts` is the direct structural template. `HUD.tsx` and `ChatPanel.tsx` are the panel reference patterns.

### Phase Ordering Rationale

- Phase 1 before Phase 2: TypeScript compilation enforces this — server code cannot import non-existent types from shared-types.
- Phase 2 before Phase 3: The `stats:update` socket event must exist before the client store can wire to it.
- Combat function update happens in Phase 2, not deferred to Phase 3: combat using the wrong stat names produces silent wrong results, not compile errors.
- JSONB data migration executes in Phase 2, before any production deployment of new code that writes the new shape.
- `StatsPanel.tsx` is built last: it depends on every other layer being stable; building it earlier creates a component that renders nothing and obscures integration problems.

### Research Flags

No phases require a dedicated `/gsd:research-phase` call. The research files have produced specific, verified implementation details with confirmed file paths and function signatures.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Pure TypeScript type work, pure function math. `validateMovement` in game-logic is the direct template.
- **Phase 2:** NestJS service injection, Socket.IO event types. `PlayerService` and `InventoryService` are direct templates.
- **Phase 3:** Zustand + immer store, React HUD component. `inventoryStore.ts` and `HUD.tsx` are direct templates.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All claims verified by direct file audit. Zero new dependencies identified. Every package version confirmed in package.json. All integration point files confirmed at specific paths. |
| Features | HIGH | Codebase integration map verified — all 8 stat hooks confirmed in existing source files. Competitor analysis (WoW Classic, Diablo III, Path of Exile) cross-referenced against project lore. Soft-cap values are placeholder constants requiring balance testing — documented as such. |
| Architecture | HIGH | All architectural claims verified against actual source files. `inventoryStore` separation pattern verified as direct template. `gameStore` Phaser Game instance subscription confirmed. `effectiveStats()` bonuses map confirmed to route unknown string keys — equipment stat bonuses flow through existing code without changes. |
| Pitfalls | HIGH | Stats-specific pitfalls derived from architecture patterns verified in source. Inventory pitfalls (non-atomic writes) confirmed as real codebase issues from prior research. Movement and chunk streaming pitfalls retained from prior research as supporting context. |

**Overall confidence:** HIGH

### Gaps to Address

- **Soft-cap values are placeholder constants:** The specific values (e.g., "75% max damage reduction from Toughness") are design decisions, not research findings. These require balance testing after the system is implemented. Implement as named constants in `STAT_DEFINITIONS`, not hardcoded values, so they can be tuned without code changes.

- **Level-scaling formula values require gameplay validation:** The `BASE_STATS_LEVEL_1` and `STAT_PER_LEVEL` constants proposed in the research are reasonable starting points but need playtest validation. Implement as named constants for easy tuning.

- **Stat naming ambiguity — Resilience vs Toughness:** Both names sound defensive. Resilience = environmental hazard resistance; Toughness = physical damage armor. The distinction is lore-correct but may confuse players. Confirm with project owner before finalizing — only the display strings and `PrimaryStatId` union need changing, not the combat code.

- **Faction-specific stat bonuses:** Lore-grounded future feature. When the faction system is built, `STAT_DEFINITIONS` needs a `factionBonuses` field. Design the `StatDefinition` interface to accommodate this slot without restructuring `computeCharStats()`.

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `packages/shared-types/src/core/player.ts` — `PlayerStats` (5 stats), `Player` interface fields confirmed
- `packages/database/src/schema/characters.ts` — `StatsJson` JSONB shape (5 fields), default values confirmed
- `packages/database/src/schema/species.ts` — `SpeciesStatsJson { baseHealth, baseDamage, armor, speed }` confirmed
- `packages/game-logic/src/inventory/stats.ts` — `ComputedStats`, `effectiveStats()` pure function, bonuses map string-key routing confirmed
- `packages/game-logic/src/combat/damage.ts` — `attackerStats.strength`, `defenderStats.endurance` old stat references confirmed
- `packages/game-logic/src/combat/turn-order.ts` — `stats?.agility` initiative reference confirmed
- `packages/items/src/types.ts` — `ItemEffect` discriminated union with `stat_buff` effect type confirmed
- `packages/game-logic/src/inventory/effects.ts` — `resolveEffect()` exhaustive switch pattern confirmed
- `apps/web/src/ui/hud/HUD.tsx` — existing stats section with `react-icons/gi` usage confirmed
- `apps/web/src/store/gameStore.ts` — Phaser Game instance in store (confirmed rationale for separate statsStore)
- `apps/web/src/store/inventoryStore.ts` — direct structural template for statsStore confirmed
- `apps/game-server/src/game/player.service.ts` — `ConnectedPlayer` in-memory map pattern confirmed
- `apps/game-server/src/game/inventory.service.ts` — InventoryService in-memory pattern confirmed
- `apps/game-server/src/game/game.gateway.ts` — event handler injection pattern confirmed
- `lore/world-bible.md` — biome tier system, faction identity, exo-suit lore, all 8 stat names grounded

### Secondary (MEDIUM confidence — web research)

- WoW Classic linear level scaling and armor cap: https://pavcreations.com/level-systems-and-character-growth-in-rpg-games/
- Path of Exile stat breakdown player demand: https://www.pathofexile.com/forum/view-thread/2713434/page/1
- Linear vs multiplicative progression balance: https://sinisterdesign.net/designing-rpg-mechanics-for-scalability/
- RPG stat design taxonomy (primary, secondary, derived): https://blog.writtenrealms.com/stats/
- Diablo III character screen breakdown approach: https://diablo.fandom.com/wiki/Character_Screen
- Gabriel Gambetta client-side prediction (movement pitfalls context): https://www.gabrielgambetta.com/client-side-prediction-live-demo.html

### Tertiary (MEDIUM confidence — design inference)

- Soft-cap values (75% damage reduction cap, etc.) — design starting points derived from WoW Classic armor cap precedent; require balance testing
- Level-scaling formula constants — mathematically derived from level range analysis; require gameplay validation

---
*Research completed: 2026-02-18*
*Ready for roadmap: yes*
