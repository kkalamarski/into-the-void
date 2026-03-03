# Phase 114: Integration and Lore Verification - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify all entity and item definitions from Phases 110-113 are properly registered (EntityRegistry/ItemRegistry), have ENTITY_IDS/ITEM_IDS constants, are exported from definition indexes, and are cross-checked against lore. Fix registry orphans. Expand world-bible.md to cover new content. This phase does NOT add new gameplay entities or items.

</domain>

<decisions>
## Implementation Decisions

### Lore review depth
- Full ecological audit: names, descriptions, abilities, AND biome placement
- Dual source of truth: `lore/world-bible.md` AND Phase 109 faction identity design gate documents
- Biome placement and ecological sense matter more than strict faction theming — overlap between factions is acceptable where biome logic supports it
- When a lore conflict is found, flag it and ask the user — do NOT auto-fix, as some apparent conflicts may be intentional cross-faction design

### Lore expansion
- Add new world-bible entries directly into `lore/world-bible.md` for all entities/items that lack coverage
- Full detail entries: name, description, habitat, behavior, faction relationship — matching the depth of existing world-bible entries
- For faction items: suits get full manufacturer/origin flavor text tied to their faction; modules and tools get faction association tags only (no detailed manufacturing lore)

### Claude's Discretion
- Registry verification approach (test-based vs script-based)
- Order of verification steps
- How to structure the lore review report
- Handling of edge cases in biome-creature placement logic

</decisions>

<specifics>
## Specific Ideas

- Phase 109 design gate documents serve as supplementary lore authority alongside the world bible
- "Loose faction identity" — a swamp creature is a swamp creature regardless of which faction's territory it inhabits
- Suits are signature faction equipment and deserve richer lore treatment than utility items (modules/tools)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 114-integration-and-lore-verification*
*Context gathered: 2026-03-03*
