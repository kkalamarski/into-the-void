# Pitfalls Research

**Domain:** Equipment Stats System Refactoring
**Researched:** 2026-02-21
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Duration Zero Workaround Becoming Technical Debt

**What goes wrong:**
Using `stat_buff` with `duration: 0` as a permanent stat modifier creates a semantic mismatch between "buff" (temporary) and "permanent equipment bonus." This workaround appears in 43 item definitions in the codebase. When the new `stats` effect type is introduced, these 43+ items need migration, but developers may forget to update them all, creating a mixed system where some items use the old pattern and others use the new one.

**Why it happens:**
The original effect system was designed for consumables (temporary buffs), but was repurposed for equipment stats before a proper permanent stat system existed. `duration: 0` became the quick fix because it was easier than adding a new effect type.

**How to avoid:**
1. Create exhaustive migration script that scans all item definitions
2. Add TypeScript type guard that flags `stat_buff` with `duration: 0` as deprecated
3. Run linting/validation in CI to prevent new `duration: 0` items
4. Use grep audit before declaring migration complete: `grep -r "duration: 0" packages/items/src/definitions/`

**Warning signs:**
- Mixed effect types in tooltips (some items show stats, others show "buffs")
- Inconsistent stat aggregation (some stats counted twice, others missing)
- UI confusion between temporary and permanent bonuses

**Phase to address:**
Phase 1 (Type Foundation) — Define new `stats` effect type and mark `stat_buff` with `duration: 0` as deprecated.

---

### Pitfall 2: Two Stat Systems Running in Parallel Without Clear Authority

**What goes wrong:**
The codebase has both `CharacterStats` (8 canonical stats: durability, toughness, power, haste, vigor, recovery, perception, resilience) and `ComputedStats` (7 legacy stats: armor, speedMultiplier, hazardResistance, etc.). Both systems aggregate equipment independently. The `armor` effect writes to `ComputedStats.armor` but doesn't connect to `CharacterStats.toughness`, creating a disconnect. Combat uses `CharacterStats.power/toughness`, but some legacy code may reference `ComputedStats.armor`, causing inconsistent damage calculations.

**Why it happens:**
`ComputedStats` was created first for specific mechanics (movement speed, hazard resistance). When combat was redesigned around the 8-stat canonical system, `ComputedStats` wasn't removed. Now both systems coexist, and equipment effects can target either system without clear rules.

**How to avoid:**
1. Audit all combat/gameplay code to identify which system is authoritative for each mechanic
2. Create migration path: map `armor` effect → `toughness` stat, `speedMultiplier` → `haste`, etc.
3. Document in `ARCHITECTURE.md` which system owns which mechanics
4. Deprecate `ComputedStats` fields that are redundant with `CharacterStats`
5. Single source of truth: `CharacterStats` for all combat/stat calculations, derive display values from it

**Warning signs:**
- Combat damage calculations reference both `stats.toughness` and `computedStats.armor`
- Tooltip shows different stat values than combat log
- Equipment swap updates one stat system but not the other
- Grep reveals: `effectiveStats(equipment)` called separately from `computeCharStats(level, equipment)`

**Phase to address:**
Phase 2 (Migration) — Map legacy effects to new stat system, deprecate `ComputedStats` redundant fields, establish single source of truth.

---

### Pitfall 3: Effect Resolution Order Creating Non-Deterministic Stat Values

**What goes wrong:**
When multiple items modify the same stat, the aggregation order matters for multiplicative effects. If Speed Module applies `+20% speed` and Haste Suit applies `+15% speed`, does the player get 1.0 * 1.20 * 1.15 = 1.38x or (1.0 + 0.20 + 0.15) = 1.35x? The current `effectiveStats()` function uses `stats.speedMultiplier *= value` (multiplicative), while `computeCharStats()` uses `stats[key] += value` (additive). This inconsistency means different stats aggregate differently without clear rules.

**Why it happens:**
The Composite Pattern tutorial recommends separating "raw bonuses" (additive) from "final bonuses" (multiplicative), but this wasn't implemented. All bonuses currently dump into the same aggregation logic, and developers choose additive vs. multiplicative per-effect without systematic rules.

**How to avoid:**
1. Define aggregation rules per stat type (documented in code):
   - Flat stats (durability, power, toughness): additive
   - Multipliers (speed, crit chance): additive percentages, then multiply final result
   - Example: base 100, +20%, +15% → 100 * (1 + 0.20 + 0.15) = 135
2. Implement two-pass aggregation:
   - Pass 1: Collect all flat bonuses (sum)
   - Pass 2: Collect all percentage bonuses (sum), apply to Pass 1 result
3. Add test suite with known equipment combinations and expected stat totals

**Warning signs:**
- Tooltip shows "113 Power" but server calculates 115
- Equipping two items with same bonus gives inconsistent results vs. equipping them in reverse order
- Multiplicative effects compound unexpectedly (four 1.1x modifiers = 1.46x instead of expected 1.4x)

**Phase to address:**
Phase 3 (Aggregation Rules) — Define and implement systematic stat aggregation with test coverage.

---

### Pitfall 4: Client-Side Stat Calculation Diverging from Server Authority

**What goes wrong:**
`ItemTooltip.tsx` calculates stat bonuses client-side via `extractStatBonuses()` and `computeStatDeltas()`, while `computeCharStats()` runs server-side with the authoritative calculation. If these implementations diverge (e.g., server adds buff support, client doesn't; or aggregation logic differs), tooltips show incorrect deltas. Players equip an item expecting "+15 Power" but actually get "+12 Power" because server calculation differs.

**Why it happens:**
Tooltip needs to show comparison deltas before equipping (UX requirement), so client must calculate stats locally. But maintaining two implementations of the same logic creates drift. No shared code between client `extractStatBonuses()` and server `computeCharStats()`.

**How to avoid:**
1. Move stat calculation logic to `@into-the-void/game-logic` package (isomorphic)
2. Export pure functions: `calculateItemStats(item)`, `aggregateStats(items, base)`
3. Server and client both import from shared package
4. Add integration test: server calculates stats, client calculates same equipment, assert equality
5. CI fails if client/server stat calculations diverge

**Warning signs:**
- "Why did my Power only go up by 10 when the tooltip said +15?" bug reports
- Grep shows: `resolveEffectsForTrigger()` called in both client and server with different processing
- Manual testing reveals tooltip deltas don't match actual stat changes

**Phase to address:**
Phase 4 (Shared Calculation) — Refactor stat calculation into shared package, add parity tests.

---

### Pitfall 5: Missing Items with No Stats Creating Silent Failures

**What goes wrong:**
52 items have `effects: []` (no stat bonuses). When the stat system refactor happens, these items remain empty but should potentially have stats based on their rarity/tier. The validation system doesn't flag "missing stats" as an error because `effects: []` is technically valid. Players loot a Rare-tier suit expecting stat bonuses, but it has none because it was created before stats were mandatory.

**Why it happens:**
Items were created incrementally. Early items had no effects defined. Later, the stat system was built, but old items weren't backfilled. No schema validation enforces "equippable items must have stats."

**How to avoid:**
1. Add schema validation: `if (item.equipSlot) { assert item.effects.length > 0 }`
2. Run validation in `ItemRegistry.register()` to catch at startup
3. Create backfill script: analyze item tier/rarity, suggest stat bonuses based on ilvl
4. Manual review required: some items may intentionally have no stats (special mechanics)
5. Add unit test: `all equippable items should have at least one stat effect`

**Warning signs:**
- Grep reveals: `effects: []` in 52 item definitions
- Players report "this Epic suit is worse than my Common suit"
- Tooltip shows no stat bonuses for equippable items

**Phase to address:**
Phase 5 (Content Audit) — Validate all items, backfill missing stats, enforce schema rules.

---

### Pitfall 6: Effect Type Explosion Without Systematic Design

**What goes wrong:**
The `ItemEffect` discriminated union has 11 effect types. Adding the new `stats` effect makes it 12. Without a systematic design, every new stat mechanic adds a new effect type: `type: 'crit_chance'`, `type: 'dodge'`, `type: 'lifesteal'`, etc. This violates the "magic numbers" anti-pattern — using inconsistent effect types across similar functions. Eventually, `resolveEffect()` becomes a 50-case switch statement, and developers forget to handle new effects in all consumption sites (tooltips, combat, UI breakdowns).

**Why it happens:**
Effect types started specific (`heal`, `armor`, `speed`) before a general pattern emerged. Now adding new stats requires choosing: create new effect type or extend existing `stats`? No documented guidance exists.

**How to avoid:**
1. Use the general `stats` effect for all CharacterStats bonuses (8 canonical stats)
2. Reserve specific effect types for non-stat mechanics (`heal`, `emergency_reboot`)
3. Document in `types.ts`: "Use `stats` effect for all stat bonuses. Only create new effect type for unique non-stat mechanics."
4. Add TypeScript comment: `/** @deprecated Use stats effect instead */` on legacy types
5. Lint rule: flag new effect types that could be `stats` effects

**Warning signs:**
- New PR adds `type: 'critical_chance'` instead of using `stats: { critChance: 10 }`
- `resolveEffect()` switch statement grows beyond 15 cases
- Developers ask "should I add a new effect type or use stats?"

**Phase to address:**
Phase 1 (Type Foundation) — Document effect type usage guidelines, consolidate redundant types into `stats`.

---

### Pitfall 7: Stat Aggregation Not Handling Buffs + Equipment Simultaneously

**What goes wrong:**
`computeCharStats()` aggregates equipment stats and active buffs separately at the end. If buff logic changes (e.g., buffs become multiplicative instead of additive), or equipment/buff interaction rules emerge (e.g., "equipment bonuses apply before buff multipliers"), the current flat aggregation breaks. Example: +10 Power from equipment, +20% Power buff — should result in (base + 10) * 1.20, but current code does (base + 10 + 20% of base).

**Why it happens:**
Equipment stats and buffs were implemented in separate phases. They aggregate identically (additive), but no design doc specifies interaction rules. As game complexity grows, naive addition may not match game design intent.

**How to avoid:**
1. Define buff/equipment interaction order in game design doc:
   - Base stats (from level)
   - Equipment flat bonuses (additive)
   - Equipment percentage bonuses (multiplicative)
   - Buff flat bonuses (additive)
   - Buff percentage bonuses (multiplicative)
2. Implement two-tier aggregation in `computeCharStats()`
3. Add test cases covering equipment + buff combinations
4. Document in `char-stats.ts` with explicit comments

**Warning signs:**
- Buff tooltip says "+20% Power" but actual damage increase doesn't match expected value
- Stacking equipment + buffs gives unexpected results
- Damage calculation uses `(base + equipment + buff)` when design wants `(base + equipment) * (1 + buff)`

**Phase to address:**
Phase 3 (Aggregation Rules) — Define interaction rules, implement multi-tier aggregation.

---

### Pitfall 8: 100+ Item Migration Without Rollback Strategy

**What goes wrong:**
Refactoring 100+ items from `stat_buff` with `duration: 0` to new `stats` effect is a bulk migration. If the migration script has bugs (e.g., misses items, applies wrong multipliers, corrupts data), and the changes are committed, rolling back requires manual reversion or restore from backup. In a live game, this means downtime or corrupted player inventories.

**Why it happens:**
Developers focus on "forward migration" (old → new) without planning "rollback" (new → old). Migration scripts are often one-off tools without version control or testing. The GameChanger case study emphasized practice runs on staging and detailed runbooks, but this discipline is often skipped for "simple" data migrations.

**How to avoid:**
1. Create idempotent migration script (running twice produces same result)
2. Test on staging environment first (practice run)
3. Generate rollback script before running migration (captures old state)
4. Use git diff to review all item changes before committing
5. Create snapshot/backup of item definitions before migration
6. Add validation step post-migration: ensure all items still parse correctly

**Warning signs:**
- Migration script is a one-off shell script without tests
- No staging test run planned
- Rollback strategy is "restore from git"
- Migration touches 100+ files in one commit without review

**Phase to address:**
Phase 2 (Migration) — Create tested migration script, run on staging, prepare rollback, add validation.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `stat_buff` with `duration: 0` for permanent stats | No need to create new effect type | Semantic confusion, 43+ items need migration, two meanings for one type | Never — creates migration debt |
| Keeping both `CharacterStats` and `ComputedStats` | Avoid breaking existing code | Two sources of truth, inconsistent calculations, complex debugging | Only during transition phase with deprecation plan |
| Client-side stat calculation separate from server | Faster tooltip rendering, no network call | Drift between client/server, incorrect tooltips, player confusion | Only if shared calculation code is impractical (it's not) |
| `effects: []` for items not yet designed | Ship placeholder items quickly | Missing stats on equippable items, player confusion, incomplete content | MVP only, with validation preventing this in production |
| Adding specific effect types instead of using `stats` | Feels more explicit/clear | Effect type explosion, 50-case switch statements, maintenance burden | Only for truly unique mechanics (healing, special abilities) |
| Manual migration of item definitions | Simple for small counts | Error-prone at scale, no validation, hard to rollback | Acceptable for <10 items, script required for >10 |
| Hardcoding aggregation logic in multiple places | Quick to implement | Inconsistency, bugs when logic changes, high maintenance | Never — use shared functions |

## Integration Gotchas

Common mistakes when connecting stat systems to gameplay.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Combat damage calculation | Referencing both `CharacterStats.toughness` and `ComputedStats.armor` | Use only `CharacterStats` as single source of truth, derive armor from toughness if needed |
| Tooltip stat display | Calculating stats differently than server | Import shared calculation from `@into-the-void/game-logic` |
| Buff system integration | Adding buffs to stats without considering equipment | Define aggregation order (base → equipment → buffs) |
| Effect resolution | Using switch statement in multiple files | Centralize in `resolveEffect()`, import everywhere |
| Item validation | No validation that equippable items have stats | Add schema validation in `ItemRegistry.register()` |
| Stat UI breakdown | Hardcoding stat names in UI | Use `STAT_DISPLAY_ORDER` constant, iterate dynamically |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recalculating stats on every item hover | Tooltip lag, frame drops | Memoize/cache stat calculations, only recalc on equipment change | >50 items in inventory with rapid hovering |
| Broadcasting `stats:update` on every stat change | Network spam, server CPU | Batch stat updates, emit once per equipment transaction | >100 concurrent players equipping items |
| Iterating all equipped items per stat query | Slow stat lookups | Precompute stats, store aggregated result | >20 equipped items with module slots |
| Resolving effects on every render | React re-render storms | `useMemo()` for stat calculations | Complex UI with many stat displays |
| No caching in `ItemRegistry.get()` | Repeated item lookups | Cache item definitions on first access | >1000 items in registry |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-provided stat values | Client sends "I have 9999 Power", server accepts | Server always calculates stats from authoritative equipment data, never trust client |
| Stat overflow/underflow | Client crafts item combo creating INT_MAX stats, breaks combat | Clamp stat values to reasonable ranges (0-10000) |
| Race condition on equipment swap | Player exploits rapid equip/unequip to duplicate stat bonuses | Use transactional equipment updates, validate final state |
| Inconsistent validation client/server | Client allows equipping item, server rejects, creates desync | Share validation logic from `@into-the-void/game-logic` |
| Missing level requirement check server-side | Client bypasses level check, equips high-level items | Server must revalidate `item.requiredLevel <= player.level` |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tooltip shows wrong stat deltas | Player equips item expecting +15 Power, gets +12 | Use shared calculation, add integration test |
| No indication which stat system is active | Player sees "Armor: 50" but unclear if it affects damage | Show stat breakdown: "Toughness 80 → Damage Reduction 32%" |
| Inconsistent stat naming | "Power" in UI, "strength" in code, "attack" in tooltip | Use canonical names from `CharacterStats` everywhere |
| No explanation why stats changed | Stats update after equipment swap, player confused | Show diff UI: "Power: 50 → 65 (+15 from new tool)" |
| Empty items appear valid | Player loots Rare suit, no stats, feels broken | Validate items have stats, add visual indicator for incomplete items |
| Tooltip comparison wrong when no item equipped | Shows "+10 Power vs Equipped" but nothing equipped | Only show comparison if slot has equipped item |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Stat system refactor:** Often missing validation that all items were migrated — verify `grep -r "duration: 0"` returns zero results
- [ ] **Effect aggregation:** Often missing test coverage for edge cases — verify tests cover: empty equipment, all slots filled, buffs + equipment, level scaling
- [ ] **Shared calculation:** Often missing parity tests — verify server and client calculations produce identical results for same input
- [ ] **Item migration:** Often missing rollback script — verify migration is reversible and tested on staging
- [ ] **Schema validation:** Often missing runtime checks — verify `ItemRegistry` rejects invalid items at startup
- [ ] **UI breakdown:** Often missing real-time updates — verify stat UI updates immediately on equipment change
- [ ] **Combat integration:** Often missing edge cases — verify damage calculation handles zero/negative stats gracefully
- [ ] **Tooltip accuracy:** Often missing comparison logic for all slot types — verify tooltips show correct deltas for all equipment slots

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duration zero workaround persists after migration | MEDIUM | 1. Run grep audit to find remaining cases. 2. Create targeted migration for stragglers. 3. Add CI lint to prevent regression. |
| Two stat systems create calculation bug | HIGH | 1. Trace through combat code to find which system is authoritative. 2. Deprecate non-authoritative system. 3. Add logging to detect future divergence. |
| Client/server stat calculation diverges | MEDIUM | 1. Add integration test to detect divergence. 2. Refactor both to use shared code. 3. Deploy hotfix if live. |
| Item migration corrupts data | HIGH | 1. Rollback to pre-migration commit. 2. Restore item definitions from backup. 3. Fix migration script. 4. Re-run on staging. |
| Missing stats on items | LOW | 1. Run backfill script to add stats based on ilvl/rarity. 2. Manual review for special items. 3. Add schema validation to prevent recurrence. |
| Effect type explosion | MEDIUM | 1. Audit all effect types, identify redundant ones. 2. Migrate to general `stats` effect. 3. Document guidelines. |
| Non-deterministic stat aggregation | MEDIUM | 1. Add debug logging to track aggregation order. 2. Write tests with known combinations. 3. Fix aggregation logic to be deterministic. |
| Tooltip shows wrong values | LOW | 1. Add logging to compare client vs. server calculations. 2. Use shared calculation code. 3. Deploy client hotfix. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duration zero workaround (P1) | Phase 1 (Type Foundation) | New `stats` effect type exists, `stat_buff` with `duration: 0` flagged as deprecated |
| Two stat systems (P2) | Phase 2 (Migration) | `ComputedStats` redundant fields removed, only `CharacterStats` referenced in combat code |
| Effect resolution order (P3) | Phase 3 (Aggregation Rules) | Tests verify same result regardless of equipment order, documented aggregation logic |
| Client/server divergence (P4) | Phase 4 (Shared Calculation) | Integration test passes: `serverStats(eq) === clientStats(eq)` |
| Missing item stats (P5) | Phase 5 (Content Audit) | Schema validation rejects equippable items with `effects: []`, all items pass validation |
| Effect type explosion (P6) | Phase 1 (Type Foundation) | Documentation clarifies when to use `stats` vs. new effect type, lint rule added |
| Buffs + equipment (P7) | Phase 3 (Aggregation Rules) | Tests cover equipment + buff combinations, documented interaction rules |
| Migration without rollback (P8) | Phase 2 (Migration) | Rollback script exists, migration tested on staging, validation confirms success |

## Sources

**Official Documentation:**
- [RPG Programming Pitfalls #1: Stat System](https://randompotion.com/2023/08/14/rpg-programming-pitfalls-1-stat-system/) — Pitfalls of naive stat systems (copy-paste code, scaling difficulties)
- [How to Deal with Modifiable Stats in RPGs](https://refreshertowelgames.wordpress.com/2024/02/17/how-to-comfortably-deal-with-modifiable-stats/) — Stat stacking complexity, modifier architecture
- [Composite Pattern for RPG Attributes](https://code.tutsplus.com/using-the-composite-design-pattern-for-an-rpg-attributes-system--gamedev-243t) — Calculation order confusion, hierarchical organization
- [Making Sense of Gameplay Effect Durations](https://www.quodsoler.com/blog/making-sense-of-gameplay-effect-durations) — Instant vs. duration vs. infinite effects, misuse problems
- [Game Programming Anti-Patterns](https://ruoyusun.com/2021/02/25/game-programming-anti-patterns.html) — Inconsistent magic numbers, hidden cost operations

**Refactoring and Migration:**
- [GameChanger Big Refactor](https://tech.gc.com/how-we-improved-user-experience-by-doing-the-big-refactor/) — Data model overhaul strategy, mirroring technique, cutover execution
- [Backward Compatibility: Versioning, Migrations, and Testing](https://medium.com/@QuarkAndCode/backward-compatibility-versioning-migrations-and-testing-b69637ca5e3d) — Maintaining backward compatibility during migrations
- [Semantic Versioning for Games](https://idemax.medium.com/mastering-semantic-versioning-with-git-flow-a-guide-for-games-apps-and-web-development-dc45e7e3c633) — Breaking changes in game development

**Architecture and Synchronization:**
- [Sources of Truth and Caching](https://www.gamedevblog.com/2023/02/sources-of-truth-for-coders.html) — Single source of truth in game programming
- [Game Server Synchronization](https://engineering.monstar-lab.com/en/post/2021/02/09/Game-server-Synchronization/) — Client-server stat calculation synchronization

**Codebase Analysis:**
- Current implementation in `packages/game-logic/src/stats/char-stats.ts` — Stat aggregation logic
- Current implementation in `packages/game-logic/src/inventory/stats.ts` — Legacy `ComputedStats` system
- Current implementation in `packages/game-logic/src/inventory/effects.ts` — Effect resolution
- Current implementation in `apps/web/src/components/ItemTooltip.tsx` — Client-side stat calculation
- Item definitions in `packages/items/src/definitions/` — 43 instances of `duration: 0` workaround, 52 items with `effects: []`

---
*Pitfalls research for: Equipment Stats System Refactoring*
*Researched: 2026-02-21*
