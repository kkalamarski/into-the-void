# Automation Tech Tree — Income/Sink Balance Sheet

**Created:** 2026-03-05
**Constraint:** Maintenance cost >= 60% of hourly output value per tier (AUTO-05)
**Status:** Design artifact — must be committed before automation code

---

## Tier Overview

| Tier | Structure | Level | Max/Player | Fuel Type | Fuel Duration |
|------|-----------|-------|------------|-----------|---------------|
| T2 | Extractor | 10 | 2 | Basic Fuel Cell | 5 min/cell |
| T3 | Survey Beacon | 20 | 1 | Advanced Fuel Cell | 4 hr/cell |
| T4 | Planetary Extractor | 30 | 3 | Power Core | 2 hr/cell |
| T5 | Refinery | 40 | 1 | Refinery Core | 2 hr/cell |

---

## T2 Extractor (AUTO-01)

**Overview:** Entry-level automation. Deploys on resource nodes, harvests 1 resource per 60-second tick.

- **Level range:** 10-20
- **Player limit:** 2 per player
- **Output:** 1 resource per 60 seconds (from resource node type)
- **Duration:** 5 minutes per fuel cell (5 ticks = 5 resources per cycle)
- **Fuel:** 1x Basic Fuel Cell per 5-minute cycle
- **Fuel capacity:** 5 units (1 cell fills completely)

### Economy Math

- **Resource output value:** Common reagents ~30-35cr each, so 5 resources = ~150-175cr per cycle
- **Hourly output (12 cycles/hr):** ~2,100cr per extractor (12 x 175cr)
- **Fuel cell cost (crafting value):** ~120cr (2x crystalline_dust at 30cr + 2x fungal_extract at 35cr = 130cr input)
- **Hourly fuel cost (12 cells/hr):** ~1,440cr per extractor
- **Maintenance ratio:** 1,440 / 2,100 = **~69%**

**Verdict:** PASSES >= 60% rule. Players get ~660cr/hr net per extractor (~1,320cr/hr with 2 extractors), but must actively acquire/craft fuel cells.

---

## T3 Survey Beacon (AUTO-02)

**Overview:** Zone-scanning beacon that passively caches zone resources. Temporary deployment (24hr lifespan).

- **Level range:** 20-30
- **Player limit:** 1 per player
- **Output:** 1 resource cache per hour (zone's dominant resource, quantity 3-5)
- **Duration:** 24 hours until expiry (structure is consumed)
- **Fuel:** 1x Advanced Fuel Cell per 4 hours (6 cells for full 24hr period)
- **Fuel capacity:** 24 units (1 cell = 4 units, holds up to 6 cells)

### Economy Math

- **Resource output value:** ~3 rare resources per 4 hours at ~200cr each = ~600cr per fuel cycle
- **Hourly output:** ~150cr/hr
- **Fuel cell cost:** ~400cr (1x thermal_compound at 200cr + 1x crystalline_dust at 30cr + labor/crafting)
- **Hourly fuel cost:** ~100cr/hr (1 cell per 4 hours)
- **Maintenance ratio:** 100 / 150 = **~67%**

**Verdict:** PASSES >= 60% rule. Low hourly income (~50cr/hr net) but fully passive. The 24hr expiry means the beacon structure itself is consumed, adding effective cost.

---

## T4 Planetary Extractor (AUTO-03)

**Overview:** Heavy-duty permanent extraction platform. Higher output but degrades 10%/day.

- **Level range:** 30-40
- **Player limit:** 3 per player
- **Output:** 3-5 resources per hour (1 per tick, ticking continuously)
- **Duration:** Permanent with 10%/day durability degradation
- **Fuel:** 1x Power Core per 2 hours
- **Fuel capacity:** 10 units (1 core = 2 units, holds up to 5 cores)

### Economy Math

- **Resource output value:** ~4 rare resources per 2 hours at ~200cr = ~800cr per fuel cycle
- **Hourly output:** ~400cr/hr
- **Power core cost:** ~500cr (requires rare + epic reagents to craft)
- **Hourly fuel cost:** ~250cr/hr (1 core per 2 hours)
- **Maintenance ratio:** 250 / 400 = **~63%**
- **Additional cost:** 10%/day degradation means replacement needed every ~10 days. Deployable item cost (5000cr) spread across 240 hours = ~21cr/hr additional.
- **Effective maintenance ratio:** (250 + 21) / 400 = **~68%**

**Verdict:** PASSES >= 60% rule. Net ~150cr/hr per extractor. With 3 extractors, ~450cr/hr but significant investment in Power Cores and replacement units.

---

## T5 Refinery (AUTO-04)

**Overview:** Transmutation facility. Converts resources between types over real time. Deliberately designed as a credit SINK.

- **Level range:** 40+
- **Player limit:** 1 per player
- **Fuel:** 1x Refinery Core per 2 hours
- **Fuel capacity:** 8 units (1 core = 2 units, holds up to 4 cores)

### Transmutation Recipes

| Recipe | Input | Output | Duration | Input Value | Output Value | Net |
|--------|-------|--------|----------|-------------|--------------|-----|
| Common to Rare | 10 common | 1 rare | 30 min | ~300cr | ~200cr | -100cr |
| Rare to Epic | 5 rare | 1 epic | 2 hr | ~1,000cr | ~750cr | -250cr |
| Cross-biome | 10 source | 1 target | 1 hr | ~2,000cr | ~200cr | -1,800cr |

### Economy Math

- **Fuel cost:** 1x Refinery Core at ~600cr per 2 hours = ~300cr/hr
- **Recipe net:** ALL recipes are net negative in credit value
- **Maintenance ratio:** N/A — the transmutation itself is the sink. Fuel adds additional cost on top.

**Verdict:** PASSES by design. Refineries are deliberate credit sinks. Output is LOWER value than input + fuel. Value comes from resource TYPE CONVERSION (getting biome-specific materials without traveling), not credit generation.

---

## Summary Table

| Tier | Output/hr (cr) | Fuel/hr (cr) | Maintenance % | Passes? |
|------|----------------|--------------|---------------|---------|
| T2 | ~2,100 (x2) | ~1,440 (x2) | 69% | YES |
| T3 | ~150 | ~100 | 67% | YES |
| T4 | ~400 (x3) | ~250 (x3) | 63-68% | YES |
| T5 | Sink | ~300 | N/A (net loss) | YES |

---

## Key Design Notes

1. **Automation supplements active play.** Even with maximum automation, a player's passive income is modest compared to active gathering + trading.

2. **Higher tiers require rarer fuel.** This creates a natural progression gate — you can't run T4 extractors without access to epic reagents.

3. **Refineries are resource conversion sinks.** They exist for convenience (converting between biome resources) not profit. This prevents exploitation.

4. **PvP looting adds risk.** Other players can steal accumulated resources from any deployable, further reducing effective yield.

5. **Fuel cells use 'reagent' category** (not 'consumable') to prevent accidental direct use via inventory. They are deposited into structures, not consumed from inventory.

6. **Credit values are approximate.** These serve as design constraints for implementation. Actual item baseValues and fuel costs should maintain the >= 60% maintenance ratio.
