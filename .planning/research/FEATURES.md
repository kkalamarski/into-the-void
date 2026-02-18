# Feature Research: Entity System (v1.8)

**Domain:** Entity system — creatures, plants, minerals, artifacts in a multiplayer 2D sci-fi survival MMO
**Researched:** 2026-02-18
**Confidence:** HIGH (codebase direct inspection + lore alignment); MEDIUM (survival game patterns via web research)

---

## Context: What Already Exists

The entity system builds on a partial foundation. Understand what is already in place before adding the new layer.

| Component | Current State | Relevance to Entity System |
|-----------|---------------|---------------------------|
| `Entity`, `Creature`, `Mineral` interfaces | In `shared-types/core/entity.ts` | Foundation types exist. `Creature` has health, level, behavior. `Mineral` has yield/tier. Both need new fields (loot tables, fertility, respawn). |
| `CreatureBehavior` type | `'passive' \| 'neutral' \| 'aggressive' \| 'defensive'` | Does NOT match lore's 4-class model (Herbivore/Omnivore/Predator/Maniac). Must be updated. |
| `EntityRegistry` | Stub in `shared-types/game/entity-registry.ts` with 4 creatures, 4 minerals | Placeholder data. Needs full expansion to ~35 definitions matching lore biomes. |
| `BiomeSpawnConfig` in `world-gen/generation/spawn.ts` | Per-biome creature/mineral lists with weights and densities | This is the spawning engine. Works. Does not handle Plants or Artifacts yet. Only 8 old biome types; lore now has 10. |
| `ZonesService` | Loads zones, spawns entities from `SpawnPoint`, `despawnEntity()`, `spawnEntity()` | Respawn mechanism: `SpawnPoint.respawnTime` exists but respawn tick loop does NOT exist. Must be built. |
| `GameService.handleInteraction()` | Dispatches on entity type: `mineral` deactivates immediately (no yield logic), `creature` sets `inCombat` only | Interaction logic is stub-level. Harvest, combat, loot all need real implementation. |
| `Perception` stat | In `CharacterStats` (durability, toughness, power, haste, vigor, recovery, perception, resilience) | Perception gates entity visibility — the `???` display requires reading this stat. Foundation exists in stats system. |
| `getBiome()` / biome types | 8 biome types in `world-gen`, 10 biomes in lore (missing: Miasma Marshes → `miasma_marshes`, Petrified Expanse → `petrified_expanse`) | Biome mismatch must be resolved. Entity definitions must reference correct biome IDs. |
| Entity rendering (health bars) | Basic entity rendering exists in Phaser client | Health bars rendered. No perception gating, no `???` display, no loot animation. |

**Key insight:** The spawn, zone, and interaction infrastructure exists in skeletal form. v1.8 fills in the content (35 definitions), the AI tick (wander loop), the loot system (weighted drops), and the perception gate (???). No architectural rebuild needed — targeted extension of existing systems.

---

## Lore Alignment: 4 Behavior Classes

Lore defines exactly four behavioral classes. The existing `CreatureBehavior` type (`passive`, `neutral`, `aggressive`, `defensive`) does not match these. All implementation must use lore-accurate behavior names.

| Lore Class | Threat Level | Attack Condition | Current Type (wrong) | Correct Type |
|-----------|-------------|------------------|---------------------|-------------|
| Herbivore | Low | Cornered only / young threatened | `'passive'` | `'herbivore'` |
| Omnivore | Moderate | Significantly larger AND hungry | `'neutral'` | `'omnivore'` |
| Predator | High | Hungry + viable prey identified | `'aggressive'` | `'predator'` |
| Maniac | Extreme | Any perceived entity, always | `'defensive'` | `'maniac'` |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Survival MMO players universally expect these behaviors. Missing any of them makes the world feel empty, static, or broken.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| **4 entity types: Creature, Plant, Mineral, Artifact** | Survival games (Minecraft, ARK, No Man's Sky, Tibia) always provide distinct entity categories that feel different to interact with. Creatures move and fight back. Plants are harvested passively. Minerals deplete on interaction. Artifacts are collectible rarities. Players parse these categories by instinct. | LOW | `EntityType` in `entity.ts` already has `creature`, `mineral`; add `plant`, `artifact`. |
| **~35 entity definitions covering all 10 biomes** | Each biome must feel unique. Encountering the same creatures in every zone makes the world feel copy-pasted. Lore specifies unique flora/fauna per biome. 10 creatures, 10 plants, 10 minerals, 5 artifacts = 35 definitions is minimum viable content for distinct biome identity. | MEDIUM | `EntityRegistry` already exists as the data store. `BiomeSpawnConfig` already exists per biome. Definitions are data, not code — moderate content work. |
| **Biome-specific spawning** | Players expect creatures to match their environment: bioluminescent fauna in Luminous Canopy, silicon-armored creatures in Volcanic Reaches, blind vibration-sensing creatures in Fungal Depths. Biome identity depends on this. | LOW | `BiomeSpawnConfig` in `world-gen/generation/spawn.ts` already implements this. Needs 2 new biome entries (Miasma Marshes, Petrified Expanse) and updated creature IDs. |
| **Weighted random loot drops** | Players expect killing creatures or harvesting resources to yield items. Without drops, there is no resource loop, no progression, no reason to interact with entities. Loot tables are fundamental to every survival game from Minecraft to DayZ. The standard approach is weighted random selection from a per-entity drop table. | MEDIUM | Item system with 100 items and `ItemRegistry` already built. `ZonesService.spawnEntity()` can spawn ground item entities. Ground items with `despawnAt` already modeled in `ItemEntity`. Weighted pick function already in `world-gen/generation/spawn.ts`. |
| **Entity health and depletion** | Creatures must be damageable and killable. Minerals must deplete over harvests (not disappear in one hit). Players expect feedback: damage numbers, health bar changes, resource node "cracking" or visually depleting. | LOW (server) / MEDIUM (client visual) | `Creature.health/maxHealth` already in type. `Mineral.yield/maxYield` already in type. `GameService.handleInteraction()` needs real damage/depletion logic. `ZonesService.updateEntity()` exists. |
| **Entity respawn system** | When entities die or are depleted, they must come back. Static non-respawning entities would be exhausted by the player population within hours. Respawn timers (1-5 min for common creatures, 2-5 min for minerals, longer for artifacts) are the genre standard. | MEDIUM | `SpawnPoint.respawnTime` exists. BUT the respawn tick loop does NOT exist — `ZonesService` has no timer-based entity reactivation. This is the primary new server component needed. |
| **Creature idle wander movement** | Creatures standing perfectly still look wrong and feel dead. Players expect passive creatures to graze, patrol a small area, or move randomly. This is table stakes for any creature system — even Minecraft skeletons wander at night. Wander patterns make the world feel alive. | MEDIUM | No movement system for entities exists currently. Server-side position updates for entities must be added. Should be periodic (every 3-5s) and short-range (2-4 tiles from spawn point) to avoid performance problems. |
| **Perception/level gating with ??? display** | In survival MMOs (WoW's skull icon, EverQuest's con system, Pantheon's Perception system), players receive visual cues about whether an entity is within their ability to engage safely. "???" for entities that exceed the player's Perception/level is an expected pattern that communicates danger, rewards exploration, and drives character progression. | MEDIUM | `CharacterStats.perception` exists in the stats system. Entity display logic lives in Phaser client. Requires: server sends entity level/tier in zone state, client compares against player Perception stat, renders `???` for out-of-range entities. |
| **Interaction feedback (harvest yield, loot drop)** | When a player harvests a mineral, they expect to see items added to inventory. When a creature dies, they expect to see loot appear on the ground or go directly to inventory. No visual/audio feedback = players doubt the interaction worked. | LOW | `InventoryService.addItem()` exists. Ground item spawning via `ZonesService.spawnEntity()` exists. Socket events exist. Need: loot resolution on entity death + item spawn + inventory update broadcast. |

---

### Differentiators (Competitive Advantage)

Features that fit Into the Void's specific lore and sci-fi identity. These go beyond standard survival game patterns and make the entity system feel unique to Terminus.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **4-class lore-accurate creature behavior AI** | The Herbivore/Omnivore/Predator/Maniac system from the world bible is more nuanced than the standard "passive/aggressive" binary of most survival games. Herbivores flee when cornered (defensive only). Omnivores calculate size differential before attacking. Predators are satiated vs hungry (conditional threat). Maniacs attack everything without survival instinct. This creates emergent player experiences: a satiated predator can be approached, a cornered herbivore is more dangerous than players expect. | MEDIUM | State machine per creature type: Herbivore (idle, flee, fight-if-cornered). Omnivore (idle, wander, size-check, hunt). Predator (idle, stalk, hunger-timer, hunt). Maniac (always aggro, no flee state). Implemented as a server-side tick — NOT pathfinding, just directional updates and aggro flag. |
| **Fertility zone modifier (Barren/Normal/Lush)** | Biome-level fertility zones modulate spawn density: Lush zones have 1.5x entity density, Barren zones have 0.5x. This creates within-biome variation — two chunks of Luminous Canopy feel different, with some feeling dense and teeming vs sparse and foreboding. Players discover these zones through exploration rather than a map UI. Aligned with lore's aggressive adaptation and symbiotic complexity of Terminus biology. | LOW | `BiomeSpawnConfig.creatureDensity/mineralDensity` already drives spawn count. Add a `fertilityMultiplier` per chunk derived from the existing noise layer (reuse elevation or moisture). No new infrastructure — one line in spawn density calculation. |
| **Perception-gated discovery with scan unlock** | Rather than just showing `???` forever, players with Perception investment can "scan" an unknown entity to permanently unlock its codex entry — species name, behavior class, loot preview. This creates an explorer progression path: research-tool players level Perception to catalogue Terminus fauna, matching Verdant Dynamics' xenobiology research theme and the lore's emphasis on corporate knowledge extraction. | HIGH | Requires: codex data store (per-character or account-level discovered entities), scan action on examine interaction, unlock event. High complexity for v1.8 — flag as future feature. The `???` display is table stakes; the scan/unlock is the differentiator. |
| **Artifact entities as one-time world discoveries** | Artifacts do not respawn. Finding one is a permanent event per zone instance. This creates scarcity and genuine discovery moments — the feeling of "I found something no one in this zone has seen." Aligns with lore's Ancient ruins theme (artifacts are remnants of the Ancients, their absence after collection means you found the last piece). | LOW | `SpawnPoint.respawnTime = -1` (or `Infinity`) for artifact spawn points. `ZonesService.despawnEntity()` marks inactive; respawn tick skips `respawnTime === -1`. Simple flag, large experiential payoff. |
| **Biome-tier creature level brackets matching survival tiers** | Lore defines 4 survival tiers (I-IV). Creature level ranges must be bracketed to match: Tier I biomes (Luminous Canopy, Coastal Shallows, Scarred Badlands) spawn creatures level 1-10. Tier II (Miasma Marshes, Petrified Expanse) spawn 10-20. Tier III (Volcanic Reaches, Crystalline Wastes, Fungal Depths, Frozen Reaches) spawn 20-35. Tier IV (Anomaly Zones) spawn 35+. This makes biome danger legible — stepping into a higher tier feels immediately different. | LOW | Level ranges already in `BiomeSpawnConfig` per creature entry. Restructuring them to match lore tiers is a data change, not a code change. |
| **Plant-specific interaction: passive harvest vs proximity trigger** | Plants in lore are described as reactive — the Luminous Canopy brightens when approached. Some have proximity triggers (gas-releasing pods in Miasma Marshes). Implementing two plant interaction modes — passive harvest (approach and gather) vs proximity trigger (approaching causes a spore cloud status effect) — creates environmental depth. Players must learn which plants are safe to approach. | HIGH | Proximity trigger requires server-side zone-tick proximity check for players near plant entities. Status effect system needed. High complexity — the passive harvest plant is v1.8 table stakes; proximity trigger is a differentiator for future milestone. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full pathfinding for creature AI** | Players expect creatures to navigate around obstacles, not walk into walls. Pathfinding makes AI feel smart. | A* or Dijkstra on a per-entity basis in a multiplayer server tick is catastrophically expensive at scale. 50 creatures across 10 zones running A* at 60fps = immediate performance ceiling. This is the most documented pitfall in server-side MMO entity AI (Minecraft server entity lag). | Simple directional wander: creatures move in a random cardinal direction, try an alternative direction if blocked. For aggro: move toward player on each server tick (4-8 ticks/sec) — simple delta toward target. Players accept imprecise creature movement. The Tibia model (creatures track toward player without full pathfinding) is the proven pattern for this scale. |
| **Real-time creature combat with turn-by-turn actions** | Players expect action-RPG-style combat where creature decision-making happens every frame, abilities fire on cooldowns, etc. | Full real-time combat simulation per creature on the server is an engine architecture decision that requires a dedicated combat tick with state machines per entity, cooldown tracking, ability queues. This is a separate milestone, not entity system scope. | Creature combat in v1.8 is: creature deals damage on each server tick when in aggro range. Damage is fixed per creature type with minor randomness. Full turn-based or ability-based combat is a future milestone. Entity system provides the AI behavior states (flee/hunt/ignore) — damage resolution is kept simple. |
| **Infinite entity density (spawn everywhere)** | Dense creature populations feel alive. Players in survival games like to feel surrounded by wildlife. | High entity counts per zone are the primary cause of server tick performance degradation. Each entity requires position updates, behavior ticks, proximity checks. At >30 entities per zone, server tick time starts suffering. The fix (entity AI optimizer, reducing visible mob range) negates the purpose. | Density caps per zone: 15 creatures max, 10 minerals max, 5 plants max, 2 artifacts max per chunk. The fertility zone modifier allows chunks to feel denser or sparser within these caps. Quality of encounter over quantity of entities. |
| **Creature memory / grudge system** | Players ask for creatures that "remember" being attacked, track players across zones, persist aggro. | Cross-zone entity state persistence requires entity state to survive zone cache eviction (currently zones are LRU cached with 5-minute TTL). Persisting creature aggro in the database is premature complexity. Cross-zone tracking defeats the zone boundary as a safe retreat mechanic. | Aggro radius is per-zone and session only. Creatures de-aggro when player leaves zone or creature returns to spawn leash radius. This is the standard model (WoW, Tibia leash radius). |
| **Random rare creature spawns (boss equivalent) in every zone** | Players want rare named creatures for high-value loot — makes exploration exciting. | Without a full notification or map system, random rare spawns are invisible to players most of the time and are killed instantly by the first player to encounter them, creating spawn camping. | Defer rare/boss spawns to a dedicated "boss system" milestone. In v1.8, rarity is handled through Artifact entities (one-time discoveries) and loot table rarity weights. Named bosses require their own design and player communication system. |
| **Creature taming/domestication** | Common survival game request (ARK: Survival Evolved, Palworld). Players want pets. | Taming requires a creature state machine addition (tamed/wild), persistent creature ownership data, movement mode changes (follow player), client rendering changes. This is a full parallel system to build, not an entity system feature. | Out of scope for v1.8. Note in backlog: Verdant Dynamics faction quest line could introduce creature taming as a faction-specific progression feature. The lore supports it ("bioengineering native species for industrial purposes"). |

---

## Feature Dependencies

```
[Entity Definitions (~35)] — data in EntityRegistry + BiomeSpawnConfig
    └──feeds──> [Biome-specific spawning] (already working)
    └──feeds──> [Loot tables per entity] (new: drop table field in EntityRegistry)
    └──feeds──> [Level brackets per biome tier] (data only)

[BiomeType expansion] — add miasma_marshes, petrified_expanse to BiomeType enum
    └──required by──> [Entity definitions] (definitions reference biome IDs)
    └──required by──> [BiomeSpawnConfig] (new entries needed)

[Respawn tick loop] — new: interval timer in ZonesService
    └──requires──> [SpawnPoint.respawnTime] (already exists, populated)
    └──enables──> [Creature respawn after death]
    └──enables──> [Mineral respawn after depletion]
    └──excludes──> [Artifact respawn] (respawnTime = -1, intentionally skipped)

[Creature behavior AI tick] — new: server-side entity update loop
    └──requires──> [4-class behavior types] (update CreatureBehavior type)
    └──requires──> [Entity position update in ZonesService] (extend updateEntity())
    └──feeds──> [Client entity position sync] (new socket event: entity:moved)

[Loot resolution] — on creature death / mineral depletion
    └──requires──> [Loot tables in EntityRegistry] (new field per entity definition)
    └──requires──> [Weighted pick function] (already in world-gen/random, reuse)
    └──requires──> [ItemRegistry] (already built with 100 items)
    └──feeds──> [Ground item spawn via ZonesService.spawnEntity()]
    └──feeds──> [Inventory update via InventoryService.addItem()]

[Perception gating / ??? display]
    └──requires──> [CharacterStats.perception] (already in stats system)
    └──requires──> [Entity level field in zone state payload] (must be sent to client)
    └──requires──> [Client Phaser rendering: ??? override] (conditional name render)

[Fertility zones]
    └──requires──> [Noise layer access in spawn.ts] (already has SeededRandom, can derive)
    └──enhances──> [Biome-specific spawning] (density multiplier on creature/mineral count)

[Artifact one-time discovery]
    └──requires──> [Respawn tick loop] (to skip respawnTime === -1 entities)
    └──enhances──> [Perception gating] (artifact reveals name only with sufficient Perception)
```

### Dependency Notes

- **BiomeType expansion is the critical path:** Every entity definition references a biome ID. The two missing biomes (`miasma_marshes`, `petrified_expanse`) must be added to the `BiomeType` enum and `BIOME_SPAWN_CONFIGS` before any definitions using them can be written.
- **Respawn tick loop must be built before creature/mineral content matters:** Without respawn, every entity that gets harvested or killed creates a permanently dead spawn point. The loop is not complex (setInterval on `ZonesService`, checks `entity.active === false && Date.now() > respawnAt`), but it is a prerequisite for testing entity flow.
- **Loot tables are independent of behavior AI:** Loot resolution on death can be implemented before the wander AI tick. These are separate subsystems with the same trigger (entity death/depletion).
- **Perception gating depends on stats system (already built in previous phase):** The `CharacterStats.perception` field exists. The gating only requires the client to receive entity level in the zone state and compare it to the player's Perception value. Server-side the stat is already computable.
- **Creature behavior AI is purely server-side:** The client does not simulate creature movement — it renders entity positions received from the server. The AI tick runs on the game-server and broadcasts position changes via socket.

---

## MVP Definition

### Launch With — v1.8 Entity System

Minimum to make the world feel populated with entities that behave, respawn, and drop loot.

- [ ] **`BiomeType` updated** — Add `miasma_marshes` and `petrified_expanse` to enum. Add `BiomeSpawnConfig` entries for both. Update biome generation thresholds.
- [ ] **`CreatureBehavior` updated** — Replace `'passive' | 'neutral' | 'aggressive' | 'defensive'` with `'herbivore' | 'omnivore' | 'predator' | 'maniac'` matching lore classification.
- [ ] **~35 entity definitions** — 10 creatures, 10 plants, 10 minerals, 5 artifacts. Each with: id, name, biomes[], levelRange, behavior (creatures), loot table (weighted drops), baseHealth/yield, respawnTime. All sourced from/aligned with lore biome descriptions.
- [ ] **Plant and Artifact entity types** — Add `PlantConfig` and `ArtifactConfig` interfaces to `EntityRegistry`. Add `'plant'` and `'artifact'` to `EntityType` in `entity.ts`. Add `Plant` and `Artifact` entity interfaces.
- [ ] **Loot table field on entity definitions** — `lootTable: Array<{ itemId: string; weight: number; quantityMin: number; quantityMax: number }>` per creature and mineral definition. Artifacts use guaranteed fixed drops.
- [ ] **Loot resolution on entity death/depletion** — `GameService.handleInteraction()` resolves loot table on creature death: pick items via weighted random, spawn as ground item entities via `ZonesService.spawnEntity()`. Mineral harvest reduces `mineral.yield`; at 0, mark inactive + schedule respawn.
- [ ] **Respawn tick loop** — `ZonesService` runs `setInterval` (every 5s) checking all inactive entities. If `entity.respawnAt < Date.now()` and `entity.respawnTime !== -1`, reactivate entity (restore health/yield, set `active = true`, broadcast to zone). Artifacts (`respawnTime === -1`) are permanently skipped.
- [ ] **Entity behavior tick (wander + aggro)** — Server-side tick (every 3-4s) per creature. Herbivore: random direction move (2 tile max from spawn), flee if player within 2 tiles. Omnivore: idle, move toward player if player is lower level AND omnivore is "hungry" (time-based flag). Predator: move toward nearest player if within aggro range (5 tiles). Maniac: always move toward nearest player. Position broadcast via `entity:moved` event.
- [ ] **Fertility zone modifier** — Per-chunk `fertilityMultiplier` derived from noise (reuse moisture layer: `< 0.3 → 0.5x, 0.3-0.7 → 1x, > 0.7 → 1.5x`). Applied to `creatureDensity` and `mineralDensity` in `generateSpawnPoints()`.
- [ ] **Perception gating client-side** — Zone state includes entity `level` (already on `Creature.level`). Client compares entity level to player `perception` stat. If `entity.level > player.perception * 3`, render entity name as `???` and hide level display. Below threshold: display normal name and level.
- [ ] **Artifact one-time spawning** — Artifact spawn points have `respawnTime: -1` in `SpawnPoint`. Respawn tick loop skips these. Once artifact is picked up, its spawn is permanently inactive (per zone instance lifetime).

### Add After Validation (v1.x — content and polish pass)

- [ ] **Creature aggro sound/visual cue** — Client-side: render aggro indicator (exclamation mark sprite or red outline) when a creature enters attack state toward the player. No server change needed — derive from entity state in zone update.
- [ ] **Harvest progress animation** — Client-side: mineral/plant shows depletion visual (cracking, color shift) proportional to `yield / maxYield`. Pure client, no server change.
- [ ] **Codex entry on first discovery** — Track discovered entity IDs per character. On first sighting of an entity above Perception threshold, unlock its codex entry (name, behavior class, loot hint). Requires a small DB column (discovered_entities JSON array on character row).
- [ ] **Scan action for ??? entities** — Players with research tools can scan `???` entities to reveal them. Interact + research tool = scan attempt. Successful scan (based on Perception vs entity level) unlocks codex entry.
- [ ] **Creature level scaling to zone** — Spawned creature level is randomized within `levelRange`. Add zone-level modifier: deeper zones (higher coordinate distance from 0,0) shift the level range upward by 1-3 levels. Makes exploration into unknown territory meaningfully harder.

### Future Consideration (v2+)

- [ ] **Full creature pathfinding (A\*)** — Only viable with server-side spatial indexing and entity count limits enforced. Requires dedicated performance testing. Not v1.8.
- [ ] **Creature taming (Verdant faction feature)** — Lore supports it. Full separate milestone. Requires creature ownership, follow behavior, persistent tamed-creature data.
- [ ] **Proximity trigger plants (spore cloud, acid)** — Miasma Marshes plants should have proximity triggers. Requires status effect system. Defer to hazard/status-effect milestone.
- [ ] **Dynamic creature ecosystems (predator eats herbivore)** — Prey-predator population dynamics within zones. Conceptually rich, architecturally complex. Future milestone.
- [ ] **Named boss entities** — Rare spawn, high-value loot, zone notification. Requires boss-specific AI, spawn announcement, loot table design. Separate milestone.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| BiomeType expansion (2 missing biomes) | HIGH (blocks all entity definitions) | LOW | P1 |
| CreatureBehavior lore-accurate types | HIGH (lore compliance, AI states) | LOW | P1 |
| ~35 entity definitions (content) | HIGH (world feels alive) | MEDIUM | P1 |
| Plant and Artifact entity types | HIGH (entity diversity) | LOW | P1 |
| Loot tables + resolution on death | HIGH (core resource loop) | MEDIUM | P1 |
| Respawn tick loop | HIGH (world repopulates) | LOW | P1 |
| Creature wander/behavior AI tick | MEDIUM (world feels alive) | MEDIUM | P1 |
| Fertility zone modifier | MEDIUM (within-biome variety) | LOW | P1 |
| Perception gating / ??? display | MEDIUM (progression + danger signal) | LOW | P1 |
| Artifact one-time spawning | MEDIUM (discovery moments) | LOW | P1 |
| Creature aggro visual cue | MEDIUM (player safety signal) | LOW | P2 |
| Harvest depletion animation | LOW (polish) | LOW | P2 |
| Codex discovery tracking | LOW (exploration reward) | MEDIUM | P2 |
| Scan action for ??? entities | LOW (advanced Perception use) | HIGH | P3 |
| Creature level zone scaling | LOW (depth reward) | LOW | P2 |

**Priority key:**
- P1: Must have for v1.8 entity system milestone
- P2: Should have, add in first post-launch patch
- P3: Nice to have, future milestone

---

## Competitor Feature Analysis

| Feature | Tibia | Minecraft | ARK: Survival Evolved | Our Approach |
|---------|-------|-----------|----------------------|--------------|
| Creature behavior model | 4 states: chase, wander, runaway, dead. Flee HP threshold per creature. | 3 types: passive, neutral, hostile. Simple proximity aggro. | Complex: tame/wild, many attack modes, flee. | 4 lore classes: herbivore/omnivore/predator/maniac. Behavior varies by class not proximity alone. |
| Spawn system | Fixed spawn points with respawn timer. Players camp spawns. | Chunk-based dynamic spawning (mobs spawn in dark areas). | Spawn regions, respawn on death. Dino level tied to region. | Spawn points in chunk with respawn timer. Fertility modifier adds density variation. |
| Loot model | Per-creature loot table with weighted items. Ground loot despawns. | Per-creature loot table, direct-to-inventory option. | Harvesting body with tools for resources. Separate inventory loot. | Weighted drop table per entity. Ground item spawn with despawn timer. Optional direct-to-inventory on pickup. |
| Entity gating (danger signaling) | Skull icon for much-stronger creatures. Color-coded level indicator. | No level display — visual cues only (size, appearance). | Creature level visible always. Region tier communicated via biome. | Perception stat gates name/level visibility. `???` for entities above threshold. Clear progression signal. |
| Plant interaction | Static resource nodes. No plant behavior. | 2-block range, right-click to harvest. Grow over time. | Passive resource nodes. Some trigger nearby creatures. | Passive harvest (approach + interact). Proximity triggers deferred to v2. |
| Respawn | Fixed timers, well-known (spawn camping meta). | Instant in dark areas. No memory of killed mobs. | Respawn after time, same region. Difficulty scales. | Zone-based timer (1-5 min). Randomized within range. Artifacts: no respawn. |
| AI movement (server-side) | Tile-based pathfinding toward player. Leash radius. | Client-side mob AI with server validation. | Server-side with pathfinding. Performance capped by dino count. | Simplified directional AI tick (no A*). Leash radius from spawn. Acceptable for 2D tile world. |

---

## Existing Code Integration Map

Every new entity system feature maps to an existing integration point. No new architecture.

| Feature | Integration Point | Change Type |
|---------|------------------|-------------|
| Plant/Artifact entity types | `entity.ts`: extend `EntityType`, add `Plant`, `Artifact` interfaces | Type extension |
| Lore-accurate behavior types | `entity.ts`: `CreatureBehavior` type update | Breaking type change — audit all uses |
| Entity definitions (35) | `entity-registry.ts`: expand creature/mineral, add plant/artifact records | Data addition |
| Biome expansion (2 biomes) | `shared-types/game/biome.ts`: `BiomeType` enum; `world-gen/generation/biome.ts` and `spawn.ts`: new entries | Config + data |
| Loot table field | `entity-registry.ts`: add `lootTable` field to `CreatureConfig`, `MineralConfig`, `ArtifactConfig` | Type extension |
| Loot resolution | `game.service.ts`: `handleInteraction()` creature/mineral branch | Logic addition |
| Respawn loop | `zones.service.ts`: `setInterval` in `onModuleInit()` | New method |
| Behavior AI tick | `zones.service.ts`: separate `setInterval` for entity position updates | New method + new socket event |
| Fertility modifier | `world-gen/generation/spawn.ts`: `generateSpawnPoints()` density multiplier | Algorithm change (1 line) |
| Perception gating | Client Phaser scene: entity name render conditional | Client rendering logic |
| Artifact no-respawn | `zones.service.ts` respawn loop: `if (spawnPoint.respawnTime === -1) continue` | Guard clause |

---

## Sources

- Direct codebase inspection: `packages/shared-types/src/core/entity.ts`, `packages/shared-types/src/game/entity-registry.ts`, `packages/world-gen/src/generation/spawn.ts`, `packages/world-gen/src/generation/biome.ts`, `apps/game-server/src/zones/zones.service.ts`, `apps/game-server/src/game/game.service.ts`
- Into the Void lore: `lore/world-bible.md` — Creature Behavioral Classifications (Herbivore/Omnivore/Predator/Maniac), biome descriptions with per-biome fauna/flora/hazards, survival tier table
- Survival game entity AI (state machine patterns): https://developers-heaven.net/blog/game-ai-behavior-trees-state-machines-and-pathfinding/
- Tibia creature behavior (chase/wander/runaway/dead + flee threshold + leash): https://tibiantis-notes.github.io/Creature
- Loot table design (weighted random, tier batching, anti-patterns): https://www.gamedeveloper.com/design/loot-drop-best-practices
- Respawn timer design (variable randomization, spawn camping mitigation): https://forums.mmorpg.com/discussion/391074/preffered-spawn-system
- Server-side entity AI performance pitfalls (mob count vs tick time): https://help.sparkedhost.com/en/article/how-to-fix-minecraft-server-tick-lag-from-entities-1m5a7g2/
- Pantheon Perception system (Perception as exploration gating): https://www.mmorpg.com/developer-journals/feature-spotlight-perception-system-2000105610
- Fertility/lush-barren density patterns: https://survivingtheaftermath.fandom.com/wiki/Biomes
- Wandering AI tutorial (random path + directional fallback): https://arongranberg.com/astar/documentation/stable/wander.html

---

*Feature research for: Entity System — Into the Void survival MMO v1.8*
*Researched: 2026-02-18*
*Confidence: HIGH for codebase integration map (directly verified); HIGH for lore alignment (world-bible sourced); MEDIUM for competitor behavior patterns (web research, cross-referenced with Tibia dev documentation); MEDIUM for performance thresholds (entity count caps derived from Minecraft community research, not specific to this stack)*
