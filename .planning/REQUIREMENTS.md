# Requirements: Into the Void

**Defined:** 2026-03-03
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.24 Requirements

Requirements for Balance & Automation milestone. Each maps to roadmap phases.

### Foundation

- [x] **FNDN-01**: DamageType union (Thermal/Cryo/Bio/Kinetic) exported from shared-types and consumed by game-logic damage pipeline
- [x] **FNDN-02**: DamageResistances interface on CreatureDefinition as a required field with neutral defaults
- [x] **FNDN-03**: Shield and damage_reduction variants added to AbilityEffect discriminated union
- [x] **FNDN-04**: DeployableEntity interface in shared-types for automation structures
- [x] **FNDN-05**: AiTickResult extended with stampede, packCall, ambush, frenzied signal fields

### Stat Caps

- [ ] **CAPS-01**: Stat soft cap at 200 with diminishing returns (every point above 200 counts as 0.5)
- [ ] **CAPS-02**: Stat hard cap at 400 preventing infinite scaling
- [ ] **CAPS-03**: Diminishing returns applied as post-processing in computeCharStats() covering all consumers
- [ ] **CAPS-04**: Stats panel UI shows soft cap indicator when a stat exceeds 200

### Damage Types

- [x] **DMGT-01**: calculateDamage() accepts damageType and defenderResistances, applies resistance multiplier (0.5x-1.5x)
- [ ] **DMGT-02**: All 83+ creatures have explicit resistance values populated per biome theme (ice creatures resist Cryo, volcanic resist Thermal, etc.)
- [x] **DMGT-03**: Resistance capped at 70% reduction maximum (0.3x floor) — no creature is immune
- [ ] **DMGT-04**: Damage type label shown in combat log entries
- [ ] **DMGT-05**: Color-coded floating damage numbers per type (Thermal=orange, Cryo=cyan, Bio=green, Kinetic=white)
- [x] **DMGT-06**: Gear items that boost specific damage type output (damage_type_bonus effect on items)
- [ ] **DMGT-07**: Creature resistance distribution matches biome lore (Frozen Expanse creatures resist Cryo, vulnerable to Thermal)

### Ability Rebalance

- [ ] **ABIL-01**: Plasma Burst base damage reduced from 35 to 28 with bonus +50% to targets above 80% HP (opener niche)
- [ ] **ABIL-02**: Thermal Lance assigned Thermal damage type with bonus vs frozen biome creatures
- [ ] **ABIL-03**: Cryo Blast assigned Cryo damage type with bonus vs volcanic biome creatures
- [ ] **ABIL-04**: Electrocute DoT spreads to creatures within 2 tiles (chain lightning, anti-pack niche)
- [ ] **ABIL-05**: Overload Pulse range increased to 2, hits all creatures in range (AOE clear niche)
- [ ] **ABIL-06**: Precision Shot reveals stealthed predators in 6-tile cone for 5s (anti-ambush niche)
- [ ] **ABIL-07**: Void Drain heal increased from 15 to 25 (anti-maniac sustain niche)
- [ ] **ABIL-08**: Concussive Strike stuns target for 1s, 3s against maniacs in Frenzy (CC niche)
- [ ] **ABIL-09**: Emergency Shield changed to absorb pool (80 damage within 8s) instead of toughness buff
- [ ] **ABIL-10**: Regeneration Protocol buffed to 80 HP over 10s + removes 1 biome hazard debuff
- [ ] **ABIL-11**: Magnetic Field changed to reflect 30% of ranged damage for 8s
- [ ] **ABIL-12**: Fortify Systems changed to flat 15% damage reduction for 10s
- [ ] **ABIL-13**: Energy Barrier changed to immunity to biome hazard effects for 20s

### Creature AI

- [ ] **CRAI-01**: Stampede behavior for herbivores — when 3+ flee, deal 50% HP as kinetic damage in path
- [ ] **CRAI-02**: Pack Call behavior for omnivores — when provoked, 30% chance to summon 1-2 nearby allies (cap 3)
- [ ] **CRAI-03**: Ambush behavior for predators — first attack from stealth deals 2x damage; high Perception (>150) detects before aggro
- [ ] **CRAI-04**: Frenzy behavior for maniacs — below 30% HP, attack speed doubles but defense halves
- [ ] **CRAI-05**: Zone-level pre-processing pass in AiService for group behaviors (Stampede, Pack Call) before per-creature FSM loop
- [ ] **CRAI-06**: Frenzy visual state change (color overlay) visible to players in EntityRenderer
- [ ] **CRAI-07**: Frenzy state cleaned up on creature death (no state leak)

### Biome Hazards

- [ ] **HAZD-01**: HazardService with per-player hazard state cache (sync read in tick, updated on biome entry/gear change)
- [ ] **HAZD-02**: HP drain in hazardous biomes without protection gear (max 8% base HP per tick, ~30-45s survival window)
- [ ] **HAZD-03**: Stat debuffs in extreme biomes without protection gear
- [ ] **HAZD-04**: Tiered hazard severity: Tier II = stat debuff only, Tier III = HP drain + debuff, Tier IV = stacking drain
- [ ] **HAZD-05**: Specific gear items counter specific biome hazards (hazardProtection field on item effects)
- [ ] **HAZD-06**: Hazard counter gear available in faction trader inventories before any biome hazard tick is enabled
- [ ] **HAZD-07**: Hazard-specific consumables providing 5-minute timed protection
- [ ] **HAZD-08**: HUD indicator showing active hazard type and counter stat progress
- [ ] **HAZD-09**: Hub zones exempt from all hazard processing
- [ ] **HAZD-10**: 3-second grace period on first hazard tick after biome entry

### Automation

- [ ] **AUTO-01**: Deployable extractor items (T2, Levels 10-20) — place on resource node, auto-gathers 1 resource/60s for 5 min, limit 2 per player
- [ ] **AUTO-02**: Survey beacon items (T3, Levels 20-30) — marks zone for passive resource cache, 1 beacon limit, 24-hour degradation
- [ ] **AUTO-03**: Planetary extractor deployables (T4, Levels 30-40) — permanent POI deployment, 3-5 resources/hr passive, 3 per player limit, 10%/day degradation
- [ ] **AUTO-04**: Resource refinery system (T5, Levels 40+) — convert 10 common → 1 rare (30 min), 5 rare → 1 epic (2 hr), cross-biome transmutation (10:1, 1 hr)
- [ ] **AUTO-05**: Recurring maintenance costs for all automation tiers (>= 60% of hourly output value)
- [ ] **AUTO-06**: Income/sink balance sheet documented as design artifact before any automation code is written
- [ ] **AUTO-07**: Deployable persistence in database (new deployables table)
- [ ] **AUTO-08**: AutomationService with 60s global tick, in-memory accumulation, 5-min DB flush
- [ ] **AUTO-09**: Automation panel in client HUD for deploying, collecting, and refueling

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Dynamic Events

- **EVNT-01**: Void storms and acid rain timed hazard pulses
- **EVNT-02**: Automation-creature interaction (Stampede damages deployed structures)

### Advanced Combat

- **ACBT-01**: Ability synergy combos (chain effects from type interactions)
- **ACBT-02**: Adaptive creature learning AI

### Economy

- **ECON-01**: Crafting recipes using refined automation output
- **ECON-02**: Per-biome extractor efficiency modifiers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Player resistance stats per damage type | WoW abandoned this — creates mandatory gear sets per encounter |
| Damage type immunity (0x multiplier) | Creates hard player lock-out; cap at 70% (0.3x floor) |
| New ability definitions | Rebalance existing 21; don't add new ones |
| Crafting system | Automation is gathering-focused; crafting is separate milestone |
| PvP balance tuning | PvE first; PvP in future milestone |
| Vulnerability > 1.5x | D&D 2024 removed most vulnerabilities; 2x trivializes fights |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDN-01 | Phase 115 | Complete |
| FNDN-02 | Phase 115 | Complete |
| FNDN-03 | Phase 115 | Complete |
| FNDN-04 | Phase 115 | Complete |
| FNDN-05 | Phase 115 | Complete |
| CAPS-01 | Phase 116 | Pending |
| CAPS-02 | Phase 116 | Pending |
| CAPS-03 | Phase 116 | Pending |
| CAPS-04 | Phase 116 | Pending |
| DMGT-01 | Phase 117 | Complete |
| DMGT-02 | Phase 117 | Pending |
| DMGT-03 | Phase 117 | Complete |
| DMGT-04 | Phase 117 | Pending |
| DMGT-05 | Phase 117 | Pending |
| DMGT-06 | Phase 117 | Complete |
| DMGT-07 | Phase 117 | Pending |
| ABIL-01 | Phase 118 | Pending |
| ABIL-02 | Phase 118 | Pending |
| ABIL-03 | Phase 118 | Pending |
| ABIL-04 | Phase 118 | Pending |
| ABIL-05 | Phase 118 | Pending |
| ABIL-06 | Phase 118 | Pending |
| ABIL-07 | Phase 118 | Pending |
| ABIL-08 | Phase 118 | Pending |
| ABIL-09 | Phase 118 | Pending |
| ABIL-10 | Phase 118 | Pending |
| ABIL-11 | Phase 118 | Pending |
| ABIL-12 | Phase 118 | Pending |
| ABIL-13 | Phase 118 | Pending |
| CRAI-01 | Phase 119 | Pending |
| CRAI-02 | Phase 119 | Pending |
| CRAI-03 | Phase 119 | Pending |
| CRAI-04 | Phase 119 | Pending |
| CRAI-05 | Phase 119 | Pending |
| CRAI-06 | Phase 119 | Pending |
| CRAI-07 | Phase 119 | Pending |
| HAZD-01 | Phase 120 | Pending |
| HAZD-02 | Phase 120 | Pending |
| HAZD-03 | Phase 120 | Pending |
| HAZD-04 | Phase 120 | Pending |
| HAZD-05 | Phase 120 | Pending |
| HAZD-06 | Phase 120 | Pending |
| HAZD-07 | Phase 120 | Pending |
| HAZD-08 | Phase 120 | Pending |
| HAZD-09 | Phase 120 | Pending |
| HAZD-10 | Phase 120 | Pending |
| AUTO-01 | Phase 121 | Pending |
| AUTO-02 | Phase 121 | Pending |
| AUTO-03 | Phase 121 | Pending |
| AUTO-04 | Phase 121 | Pending |
| AUTO-05 | Phase 121 | Pending |
| AUTO-06 | Phase 121 | Pending |
| AUTO-07 | Phase 121 | Pending |
| AUTO-08 | Phase 121 | Pending |
| AUTO-09 | Phase 121 | Pending |

**Coverage:**
- v1.24 requirements: 53 total
- Mapped to phases: 53
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 — traceability populated after roadmap creation (Phases 115-121)*
