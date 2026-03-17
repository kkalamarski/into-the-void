# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.25 — Crafting

**Shipped:** 2026-03-06
**Phases:** 4 | **Plans:** 11 | **Commits:** ~25

### What Was Built
- CraftingService with atomic ingredient consumption, timer enforcement, faction gating, one-active-craft limit, disconnect cleanup
- 39 recipes across 4 disciplines (Equipment, Consumables, Reagents, Automation) with 5 processed reagent intermediates
- Quality tier system (Standard/Refined/Masterwork) with proficiency-based probability rolls and XP decay
- 9 faction-exclusive specialty recipes (3 per Verdant/Helix/Nexus)
- 4 automation deployable structure recipes bridging crafting and automation systems
- Crafting panel UI with three-column layout, discipline tabs, ingredient availability, progress bar
- Mini HUD crafting indicator for active craft visibility when panel closed

### What Worked
- Phase decomposition was clean: foundation → content → integration → UI mapped naturally to the domain
- Quality as runtime modifier (not separate item IDs) kept the item registry simple
- XP decay function (power curve with grace zone and floor) prevented trivial grinding while keeping progression rewarding
- Reusing the automation discipline as a 4th crafting discipline cleanly bridged the two systems

### What Was Inefficient
- REQUIREMENTS.md traceability table again not updated during execution — all 31 requirements showed "Pending" at completion
- Phase 123 marked as "Not started" in ROADMAP progress table despite having 4/4 plans complete — same tracking inconsistency as v1.24
- Milestone audit skipped (no v1.25-MILESTONE-AUDIT.md) — yolo mode bypassed but should be considered for larger milestones

### Patterns Established
- Crafting discipline pattern: recipes organized by discipline with independent proficiency tracking per category
- Recipe definition as static data in shared package: both server validation and client display use same definitions
- Quality as inventory slot modifier: no item ID proliferation, stat multiplier applied at runtime

### Key Lessons
1. Traceability table updates should be automated or done per-phase — two consecutive milestones had this gap
2. The "anywhere crafting" decision (no stations) simplified both implementation and UX significantly
3. Small milestones (4 phases, 1 day) ship faster with less coordination overhead — good for focused feature additions

### Cost Observations
- Model mix: ~90% sonnet (executor), ~10% inherit (planner/research)
- Profile: balanced
- Notable: 4 phases completed in a single day with auto_advance pipeline

---

## Milestone: v1.24 — Balance & Automation

**Shipped:** 2026-03-05
**Phases:** 7 | **Plans:** 20 | **Commits:** 75

### What Was Built
- 4 damage types (Thermal/Cryo/Bio/Kinetic) with per-creature resistance profiles across all 83+ creatures
- Stat caps with diminishing returns above 200 and hard cap at 400
- Full ability rebalance: 13 abilities with real defensive mechanics (shield absorb, flat DR, reflect, stun, hazard immunity)
- Creature AI upgrades: Stampede (herbivores), Pack Call (omnivores), Ambush (predators), Frenzy (maniacs)
- Biome hazard system: 5 hazard groups, tiered severity, protection gear, consumables, HUD indicator
- Automation tech tree: T2-T5 deployable structures with AutomationService, tick loop, DB persistence, client panel

### What Worked
- Phase dependency graph allowed parallelization (Phases 119/120/121 could overlap after shared types landed)
- BIOME_RESISTANCE_PROFILES lookup table avoided per-creature override complexity (all 77 creatures use biome-based profiles)
- Synchronous processTick() pattern in both HazardService and AutomationService kept tick budget under control
- Income/sink balance sheet as mandatory design artifact before automation code prevented runaway economy

### What Was Inefficient
- REQUIREMENTS.md traceability table not updated as phases completed — 41 of 53 requirements showed "Pending" despite all work being done
- Phase 116 (Stat Caps) had 0/TBD plans in roadmap despite having 3 plans on disk — tracking inconsistency

### Patterns Established
- Sync-first service tick pattern: Map-based state, synchronous tick processing, async DB flush on longer interval
- Biome-level profiles for creature data: lookup by primary biome instead of per-creature overrides
- Design artifact gates before implementation (FACTION-IDENTITY.md in v1.23, balance sheet in v1.24)

### Key Lessons
1. Requirements traceability should be updated as part of plan execution, not deferred to milestone completion
2. Resistance applied AFTER armor reduction keeps the two systems independent — good layering principle
3. PvP deployable looting (no owner check) needs revisiting — shipped as-is but may not match intended gameplay

### Cost Observations
- Model mix: ~90% sonnet (executor), ~10% inherit (planner/research)
- Profile: balanced
- Notable: 7 phases in 3 days with yolo mode and auto_advance enabled

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.25 | 4 | 11 | Crafting discipline pattern, quality as runtime modifier |
| v1.24 | 7 | 20 | Sync tick pattern for game services, design artifact gates |

### Top Lessons (Verified Across Milestones)

1. Design artifact gates before implementation prevent rework and ensure consistent vision
2. Sync-first tick processing with async DB flush is the correct pattern for game server services
3. Requirements traceability tables need per-phase updates — manual end-of-milestone catch-up has failed twice consecutively
4. Small focused milestones (3-4 phases) complete in a single day and ship cleaner than large sprawling milestones
