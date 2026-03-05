# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

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
| v1.24 | 7 | 20 | Sync tick pattern for game services, design artifact gates |

### Top Lessons (Verified Across Milestones)

1. Design artifact gates before implementation prevent rework and ensure consistent vision
2. Sync-first tick processing with async DB flush is the correct pattern for game server services
