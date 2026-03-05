# Phase 124: Automation Production Chain - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Create crafting recipes for deployable automation structures (extractors, beacons, planetary extractors, refineries) that produce items whose IDs match the existing automation panel's deploy action. Introduce a new 'automation' crafting discipline with its own proficiency track. The existing item IDs are fixed: `deployable_extractor`, `deployable_survey_beacon`, `deployable_planetary_extractor`, `deployable_refinery`.

</domain>

<decisions>
## Implementation Decisions

### New Discipline: Automation
- Add **'automation' as a 4th crafting discipline** alongside equipment, consumables, and reagents
- Full proficiency track: independent XP, levels, and quality tier rolls — consistent with other disciplines
- **Same XP curve** as other disciplines: `level = floor(sqrt(xp / 100)) + 1`, capped at 50
- Quality tiers on deployables mean **better yield/efficiency**: Refined = +15% resource yield, Masterwork = +30% yield
- Timer range: **30-60s** — longer than equipment (15-30s) to reflect infrastructure investment
  - Extractor ~30s, Beacon ~40s, Planetary Extractor ~50s, Refinery ~60s

### Recipe Ingredient Design
- Deployable recipes use **processed reagents** from Phase 123's crafting chains (thermal alloy, circuit matrix, etc.)
- Cost is **2-3x equipment recipe cost** in ingredient value — deployables are major investments
- **Rare/exotic reagents for top tiers**: planetary extractor needs quantum residue, refinery needs anomaly catalyst + nexus core fragment
- **No fuel in recipe** — recipe produces the empty deployable; player fuels separately after placing via automation panel
- Always produces **exactly 1 deployable** per craft — no bonus quantity from proficiency

### Unlock Progression
- Unlock conditions **match existing item level requirements**: extractor=10, beacon=20, planetary=30, refinery=40
- **Character level + proficiency level** dual gate — requires both character level AND automation discipline proficiency
- **Level-only unlock type** — no POI or quest conditions for deployable recipes
- **Available to all factions** — no faction restrictions on deployable recipes; automation is universal infrastructure

### XP Tiers
- XP per craft **matches item tier**: Extractor (T2) = 25 XP, Beacon (T3) = 50 XP, Planetary Extractor (T4) = 50 XP, Refinery (T5) = 50 XP
- XP decay still applies if recipe tier is far below proficiency level (inherited from Phase 123)

### Item Description Updates
- Update existing `deployable_` item descriptions to reflect they are now **craftable via the Automation discipline**

### Claude's Discretion
- Exact ingredient lists per recipe (anchored at 2-3x equipment cost, using processed reagents)
- Exact proficiency level requirement for each recipe's dual gate
- How to integrate the 'automation' discipline into `CraftingDiscipline` type and `CraftingProficiencyJson`
- Default proficiency data update for the new discipline

</decisions>

<specifics>
## Specific Ideas

- The 4 deployable item IDs are fixed and must not change: `deployable_extractor`, `deployable_survey_beacon`, `deployable_planetary_extractor`, `deployable_refinery`
- Quality on deployables translates to yield/efficiency bonuses, not stat percentages like equipment
- Crafting a refinery should feel like an endgame achievement — rare reagents + long timer + high cost

</specifics>

<deferred>
## Deferred Ideas

- Faction-specific deployable variants (e.g., Helix extractor with different stats) — could be a future specialization phase
- Bonus deployable production at high proficiency — decided against, but could revisit if economy needs it

</deferred>

---

*Phase: 124-automation-production-chain*
*Context gathered: 2026-03-05*
