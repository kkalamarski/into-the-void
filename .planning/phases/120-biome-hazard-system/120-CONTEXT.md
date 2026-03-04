# Phase 120: Biome Hazard System - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Hazardous biomes drain HP and apply stat debuffs to players without correct protective gear. Protection gear and consumables counter specific hazard types. The HUD shows active hazard status and protection level. Hub zones are exempt. A 3-second grace period buffers zone entry.

Gear item definitions and trader inventory stocking are in scope. Biome visual overhauls, new creature behaviors in hazard zones, and crafting recipes for protection gear are NOT in scope.

</domain>

<decisions>
## Implementation Decisions

### Hazard Type Identity
- Hybrid approach: all hazard types share the HP drain mechanic, but each type applies a different strategic stat debuff (targeting combat-relevant stats that force tactical adaptation, not just intuitive mappings)
- 4-5 grouped hazard types covering the 10 biomes: Chemical (Toxic Wastes, Miasma Marshes), Thermal (Volcanic Reaches, Frozen Reaches), Physical (Crystalline Wastes, Petrified Expanse), Biological (Fungal Depths), Anomalous (Anomaly Zones)
- Exact stat debuff per group is Claude's discretion, but must be strategic (e.g., affecting accuracy, vision range, combat stats) rather than purely intuitive
- Tier II biomes apply stat debuff only, Tier III adds HP drain + debuff, Tier IV (Anomaly) uses a unique stacking mechanic where effects escalate the longer a player stays — creating "get in, get out" pressure

### Protection Model
- Percentage-based protection: each gear piece provides a protection percentage against a specific hazard type
- Linear reduction: 50% protection = 50% less HP drain and 50% less debuff intensity
- Additive stacking: consumables add flat protection % on top of gear protection (gear 60% + consumable 30% = 90%)
- 100% protection = fully immune — correct full loadout means zero hazard effects, rewarding gear investment
- No residual damage at max protection — players can farm hazard zones comfortably once properly geared

### HUD Hazard Indicator
- Contextual popup: only appears when player enters a hazard zone, slides in on entry, disappears when leaving
- Universal hazard icon with color-coding per hazard group (not unique icons per type) — e.g., green for Chemical, red for Thermal, blue for Physical, purple for Anomalous
- Shows: hazard type icon + protection percentage fill bar — minimal and clean
- No pre-entry warning: players discover hazards by entering them; the 3-second grace period is the safety net
- Hidden in safe/hub zones to reduce HUD clutter

### Hazard Feedback & Feel
- Subtle screen tint matching hazard color while in zone — atmospheric but not distracting
- Dramatic 3-second entrance: screen tint fades in gradually over the grace period, HUD indicator slides in with a warning flash, building tension before the first damage tick
- Forgiving-but-clear punishment: HP drain is visible and concerning but not panic-inducing; players have time to recognize the danger and retreat
- Floating damage numbers on each hazard tick, consistent with existing combat damage display — players see exactly what's happening
- No screen shake, no vignette pulse — the tint + floating numbers are sufficient feedback

### Claude's Discretion
- Exact hazard group → stat debuff assignments (within the "strategic" constraint)
- Specific protection percentages per gear tier/rarity
- Consumable duration balancing (5-minute baseline from HAZD-07)
- HUD popup animation style and positioning within existing HUD layout
- Tick rate and exact damage formula per tier
- How the Tier IV stacking mechanic scales over time
- Sound design for hazard entry/ticks (if applicable)

</decisions>

<specifics>
## Specific Ideas

- Tier IV Anomaly Zones should feel fundamentally different — the stacking mechanic means even geared players can't stay indefinitely, creating expedition-style gameplay
- Grace period entrance should feel cinematic: the world "announcing" danger through the gradual tint + HUD slide-in
- The lore's Chloro-Filtration Suit (Verdant, Rare) is explicitly designed for Toxic/Miasma environments — gear definitions should align with existing lore faction specializations
- Protection system should encourage faction-specific gear advantages without locking content behind faction walls (any faction can buy protection, but faction-aligned gear is better)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 120-biome-hazard-system*
*Context gathered: 2026-03-04*
