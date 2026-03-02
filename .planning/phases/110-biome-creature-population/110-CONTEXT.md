# Phase 110: Biome Creature Population - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fill all 16 biomes to 4-6 creatures each with behavioral variety (herbivore, omnivore, predator archetypes represented). Every new creature is atomically wired across definition, ENTITY_IDS, BIOME_SPAWN_CONFIGS, and CREATURE_LOOT_TABLES. Critical gap: toxic_wastes needs to go from 1 creature to 4-5. void_rift needs 6 creatures total representing max-tier threat.

</domain>

<decisions>
## Implementation Decisions

### Creature Identity & Themes
- Alienness scales with biome tier: Tier I creatures are recognizable (insect/animal-like), Tier IV are deeply alien. New creatures follow this escalation
- toxic_wastes ecosystem is chemical adaptation themed — creatures evolved around acid pools and toxic gases, corrosion-resistant shells, chemical sprayers, sludge dwellers. Industrial hazmat feel
- Naming convention: evocative names capturing creature identity freely — e.g., "Corrosion Maw", "Sludge Weaver", "Acid Bloom" — still [adjective]_[noun] format but adjective doesn't have to be the biome name
- Same-tier biomes may share 1 creature when it makes ecological sense (precedent: Void Horror in ancient_ruins and starfall_crater). Reduces total creature count needed
- Aquatic biomes keep ocean-themed naming — marine biology vocabulary (reef, current, tidal) with void twists. Not abstract void-themed
- void_rift's 2 new apex creatures should be corrupted variants of recognizable creatures from lower-tier biomes. Players recognize what they used to be — worldbuilding payoff

### Archetype Balance
- Soft guideline for herbivore+omnivore+predator trio per biome — aim for it but allow exceptions where biome personality justifies it (e.g., void_rift may skip herbivores)
- Theme-driven balance: hostile biomes (toxic_wastes, void_rift) skew predator/maniac heavy. Neutral biomes (void_plains, tidal_pools) skew herbivore/omnivore. Archetype mix reflects zone danger
- Maniacs (suicidal aggression) added to each Tier III+ biome as mini-boss encounters — low spawn weight, significantly higher stats, notable loot. Encountering one should feel like an event
- Behavioral variety through flavor text and lore descriptions only — mechanically all creatures use the 4 base AI archetypes (herbivore/omnivore/predator/maniac). Behavioral depth is a future phase concern
- Clear difficulty gradient within each biome: obvious entry-level creature (low level, herbivore, easy) and apex creature (high level, predator/maniac, hard). Players learn the biome through escalating encounters
- Staggered level progression: new creatures fill gaps in level ranges so players encounter different enemies as they level up through a biome
- Every biome must reach at least 4 creatures — even biomes already at 3-4 get additions to meet the minimum

### Loot Philosophy
- 1-2 new biome-specific materials per biome that only drop from new creatures. Gives players reason to hunt specific biomes
- Maniacs have guaranteed rare/epic drop unique to them — something players specifically hunt maniacs for. Clear reward for the mini-boss encounter
- Archetype-specific loot categories: herbivores drop organic/harvesting materials, predators drop combat components (claws, fangs, armor fragments), omnivores drop a mix
- void_rift apex creatures have the best drops in the entire game — legendary-tier materials that gate endgame crafting. Above current Dimensional Aberration drops

### Population & Spawning
- Population targets varied by biome richness: rich/complex biomes (void_rift, deep_trenches, ancient_ruins) get 6 creatures, simpler biomes (void_plains, frozen_expanse) get 4
- Creature density rebalanced per biome alongside new creature additions — some zones may need fewer spawns now that each spawn is more varied
- Rarity pyramid for spawn weights: herbivores common (high weight), omnivores medium, predators uncommon, maniacs rare (low weight). Clear encounter hierarchy
- Full rebalance of existing creatures' spawn weights to fit the rarity pyramid — not just adding new creatures around existing weights

### Claude's Discretion
- Exact creature names and descriptions per biome (within evocative naming convention and tier-appropriate alienness)
- Specific stat values (baseHealth, baseXp, respawnSeconds) for each new creature
- Which lower-tier creatures to use as basis for void_rift corrupted variants
- Which creature to share across same-tier biomes and where sharing makes ecological sense
- Exact spawn weight numbers for the rarity pyramid
- New biome-specific material names and drop rates
- Density adjustments per biome

</decisions>

<specifics>
## Specific Ideas

- toxic_wastes creatures should feel like chemical adaptation: corrosion-resistant shells, chemical sprayers, sludge dwellers — industrial hazmat aesthetic
- void_rift apex creatures should be recognizably corrupted versions of lower-tier creatures — players notice the connection
- Tier III+ maniacs should feel like mini-boss events: rare spawn, tough fight, guaranteed special loot
- Each biome should have a clear "entry creature" (easy) to "apex creature" (hard) gradient
- Loot should tell the player what kind of creature they killed: herbivore drops feel different from predator drops

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 110-biome-creature-population*
*Context gathered: 2026-03-02*
