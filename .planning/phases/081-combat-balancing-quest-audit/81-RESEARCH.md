# Phase 81: Combat Balancing & Quest Audit - Research

**Researched:** 2026-02-23
**Domain:** Combat damage balancing, level scaling, quest item obtainability verification
**Confidence:** HIGH

## Summary

Phase 81 requires rebalancing combat to follow a gradual fight pattern (4-8 hits to kill) and implementing level-gap damage scaling (15% per level beyond 5-level gap), while ensuring all quest-required items are obtainable from the world. The current damage formula exists in `packages/game-logic/src/combat/damage.ts` but lacks level-gap multipliers beyond the basic 5% per level modifier. Creature health values span 40-250 HP across 17 creatures, with player damage from abilities ranging 10-35 base damage. Quest item obtainability can be audited by cross-referencing quest objectives against creature loot tables and resource spawn definitions.

**Primary recommendation:** Build spreadsheet-based combat simulator first, then tune creature stats backward from desired TTK (4-8 hits), implement level-gap multiplier, verify abilities maintain 20%+ DPS advantage over theoretical auto-attacks.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety for balance calculations | Prevents formula errors at compile time |
| Vitest | 4.x | Balance formula unit tests | Already in project, test-driven balance tuning |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Google Sheets / Excel | Combat simulation spreadsheet | Initial balance testing before code implementation |
| Math.random() | Damage variance | Already used in calculateDamage (±10% variance) |
| Node.js scripts | Audit automation | Quest item obtainability verification |

**Installation:**
No new packages needed — all tools already in project.

## Architecture Patterns

### Recommended Project Structure
```
packages/game-logic/src/combat/
├── damage.ts                 # Core damage formulas
├── damage.test.ts            # Balance verification tests
└── balance-simulation.ts     # NEW: Simulation utilities

scripts/
└── audit-quest-items.ts      # NEW: Quest obtainability checker
```

### Pattern 1: Backward TTK Design
**What:** Design creature stats backward from desired time-to-kill instead of forward from arbitrary stat values.
**When to use:** When rebalancing existing combat to meet specific TTK targets (4-8 hits).
**Example:**
```typescript
// Source: Game Design Concepts - Level 16: Game Balance
// https://gamedesignconcepts.wordpress.com/2009/08/20/level-16-game-balance/

// BACKWARD DESIGN: Start with desired outcome
const desiredHitsToKill = 6; // Middle of 4-8 range
const playerDamagePerHit = 25; // Average ability damage
const creatureTargetHealth = desiredHitsToKill * playerDamagePerHit; // = 150 HP

// Then tune creature toughness to account for armor reduction
const effectiveDamageAfterArmor = playerDamagePerHit * 0.7; // ~30% reduction
const adjustedHealth = desiredHitsToKill * effectiveDamageAfterArmor; // = 105 HP
```

### Pattern 2: Monte Carlo Simulation for Balance Testing
**What:** Run thousands of simulated combats with randomness to catch edge cases and verify balance across level ranges.
**When to use:** Before shipping balance changes, to verify no one-shot scenarios exist except at 10+ level gaps.
**Example:**
```typescript
// Source: UserWise - The Mathematics of Game Balance
// https://blog.userwise.io/blog/the-mathematics-of-game-balance

interface SimulationResult {
  hitsToKill: number;
  timeToKill: number;
  playerDied: boolean;
  levelGap: number;
}

function simulateCombat(
  playerLevel: number,
  creatureLevel: number,
  iterations: number = 1000
): SimulationResult[] {
  const results: SimulationResult[] = [];

  for (let i = 0; i < iterations; i++) {
    let creatureHealth = getCreatureHealth(creatureLevel);
    let playerHealth = 100;
    let hits = 0;

    while (creatureHealth > 0 && playerHealth > 0) {
      // Player attacks
      const damage = calculateDamage({
        baseDamage: 15,
        attackerLevel: playerLevel,
        defenderLevel: creatureLevel,
        // ... stats
      });
      creatureHealth -= damage.damage;
      hits++;

      // Creature counter-attacks
      const counterDamage = calculateDamage({
        baseDamage: 10,
        attackerLevel: creatureLevel,
        defenderLevel: playerLevel,
        // ... stats
      });
      playerHealth -= counterDamage.damage;
    }

    results.push({
      hitsToKill: hits,
      timeToKill: hits * 1.5, // Assuming 1.5s per attack
      playerDied: playerHealth <= 0,
      levelGap: creatureLevel - playerLevel,
    });
  }

  return results;
}

// Verify balance: 95% of results should be 4-8 hits for same-level creatures
const sameLevel = simulateCombat(10, 10).filter(r => r.hitsToKill >= 4 && r.hitsToKill <= 8);
expect(sameLevel.length).toBeGreaterThan(950); // 95% success rate
```

### Pattern 3: Level-Gap Damage Multiplier
**What:** Apply exponential damage scaling beyond a threshold level difference to prevent griefing but allow progression.
**When to use:** Always when attacker and defender levels differ by more than 5 levels.
**Example:**
```typescript
// Source: GameDev.net - RPG Combat Formulas Discussion
// https://www.gamedev.net/forums/topic/660352-formulas-math-and-theories-for-rpg-combatleveling-systems/

function applyLevelGapMultiplier(baseDamage: number, levelDiff: number): number {
  const THRESHOLD = 5; // No multiplier within 5 levels
  const MULTIPLIER_PER_LEVEL = 0.15; // 15% per level beyond threshold (from STATE.md)

  if (Math.abs(levelDiff) <= THRESHOLD) {
    return baseDamage; // No change within threshold
  }

  const excessLevels = Math.abs(levelDiff) - THRESHOLD;
  const multiplier = 1 + (excessLevels * MULTIPLIER_PER_LEVEL);

  // Advantage: multiply damage if attacker higher
  // Disadvantage: divide damage if attacker lower
  return levelDiff > 0
    ? baseDamage * multiplier
    : baseDamage / multiplier;
}

// Example: Level 20 attacks Level 10 (10 level gap)
// excessLevels = 10 - 5 = 5
// multiplier = 1 + (5 * 0.15) = 1.75
// Deals 75% MORE damage (but still not one-shot due to creature HP scaling)
```

### Pattern 4: Quest Item Audit Script
**What:** Automated verification that all quest objectives have obtainable sources.
**When to use:** Before declaring quest system complete, run as CI check.
**Example:**
```typescript
// Source: Building a Quest System - Reactive Quest Tracking
// https://medium.com/hackernoon/building-a-quest-system-cf7f1d3da132

interface AuditResult {
  questId: string;
  objectiveIndex: number;
  targetId: string;
  obtainable: boolean;
  sources: string[]; // Where item can be obtained
}

function auditQuestItems(): AuditResult[] {
  const results: AuditResult[] = [];

  for (const quest of QuestRegistry.getAll()) {
    for (let i = 0; i < quest.objectives.length; i++) {
      const obj = quest.objectives[i];

      if (obj.objectiveType === 'gather') {
        const sources: string[] = [];

        // Check creature loot tables
        for (const [lootTableId, entries] of CREATURE_LOOT_TABLES) {
          if (entries.some(e => e.itemId === obj.itemId)) {
            sources.push(`creature_loot:${lootTableId}`);
          }
        }

        // Check resource nodes (future)
        // Check POI rewards (future)

        results.push({
          questId: quest.id,
          objectiveIndex: i,
          targetId: obj.itemId,
          obtainable: sources.length > 0,
          sources,
        });
      }
    }
  }

  return results;
}

// Usage: Fail build if any quest items are unobtainable
const audit = auditQuestItems();
const unobtainable = audit.filter(r => !r.obtainable);
if (unobtainable.length > 0) {
  console.error('Unobtainable quest items:', unobtainable);
  process.exit(1);
}
```

### Anti-Patterns to Avoid
- **Forward-only design:** Setting creature stats arbitrarily without simulating actual combat outcomes leads to unpredictable TTK.
- **Linear damage scaling:** Using simple level difference percentage (current: 5% per level) creates problems at extreme gaps — exponential scaling with threshold is safer.
- **Manual quest audits:** Human-checked spreadsheets get out of sync with code; automate verification.
- **Ignoring ability cooldowns in DPS calculations:** Abilities should be measured as DPS-over-rotation including cooldowns, not burst damage in isolation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combat simulation | Custom battle simulator from scratch | Spreadsheet Monte Carlo + unit tests | Spreadsheets allow rapid iteration by designers without code changes; unit tests verify edge cases |
| Damage formula solver | Manual balance tuning by feel | Backward TTK design with target outcomes | Prevents "feels balanced" from leading to 2-hit or 20-hit scenarios |
| Quest completability tracking | Manual quest testing checklist | Automated audit script cross-referencing registries | Quest/loot changes break manual checklists; script stays accurate |
| Level scaling curves | Hardcoded multiplier tables | Parameterized formula with threshold constant | Single formula adapts to all level gaps; easier to tune one constant than 50 table entries |

**Key insight:** Combat balance is math-driven, not feel-driven. Spreadsheets and automated tests catch problems designers miss in playtesting because humans are bad at statistical edge cases.

## Common Pitfalls

### Pitfall 1: One-Shot Scenarios from Compounding Multipliers
**What goes wrong:** Level-gap multiplier (1.75x at 10 levels), critical hits (2x), and ability damage scaling (1.2x) multiply together, creating unexpected one-shots.
**Why it happens:** Designers tune each system in isolation without simulating combined effects.
**How to avoid:** Run Monte Carlo simulations with all multipliers enabled. Cap maximum single-hit damage at 50% of target max health.
**Warning signs:** Players report "random deaths" or "unfair damage spikes" despite "balanced" formulas.

### Pitfall 2: Ability Spam Meta (Abilities Too Weak)
**What goes wrong:** Players discover that auto-attacking is better DPS than using abilities because ability damage doesn't justify energy cost + cooldown.
**Why it happens:** Abilities tuned without considering cooldown downtime. A 35 damage ability on 8s cooldown is worse than 15 damage every 1.5s (26.7 DPS vs 10 DPS over 8s window).
**How to avoid:** Calculate ability DPS as `(totalDamage / (cooldown + castTime))` and compare against sustained auto-attack DPS. Target 20%+ advantage for abilities.
**Warning signs:** Players only use abilities to finish low-health enemies; optimal rotation is "wait for cooldowns, spam auto-attack."

### Pitfall 3: Creature Health Doesn't Scale with Damage Formula Changes
**What goes wrong:** Update damage formula (add level-gap multiplier), forget to rebalance creature health → all creatures die in 1-2 hits.
**Why it happens:** Creature stats and damage formulas live in different files, no automated verification.
**How to avoid:** After any damage formula change, run simulation tests that verify TTK targets (4-8 hits) across all creature tiers. Create `damage.test.ts` cases for each creature species.
**Warning signs:** Sudden player complaints about "game too easy" after patch.

### Pitfall 4: Quest Items Gated Behind High-Level Content
**What goes wrong:** Low-level quest requires item only dropped by high-level creature → new players cannot complete quest.
**Why it happens:** Loot tables designed independently from quest objectives; no cross-reference verification.
**How to avoid:** Audit script checks quest objective level requirements against creature/resource level ranges. Flag mismatches.
**Warning signs:** Players report "bugged quest" or "can't find quest item."

### Pitfall 5: Ignoring Armor Reduction in TTK Calculations
**What goes wrong:** Design for "6 hits to kill" based on 25 damage abilities, but armor reduces damage to 18 → actual TTK is 8+ hits.
**Why it happens:** TTK calculated from raw damage without accounting for defense formula (`damage - effectiveArmor`).
**How to avoid:** Always simulate with defender toughness values. Use post-mitigation damage in TTK calculations.
**Warning signs:** Simulations match target TTK but actual gameplay feels "too slow."

## Code Examples

Verified patterns from current codebase:

### Current Damage Formula (Pre-Balance)
```typescript
// Source: packages/game-logic/src/combat/damage.ts (lines 62-107)
export function calculateDamage(params: DamageParams): {
  damage: number;
  critical: boolean;
} {
  const {
    baseDamage,
    attackerLevel,
    defenderLevel,
    attackerStats = {},
    defenderStats = {},
    weaponDamage = 0,
    armorReduction = 0,
    critChance = 0.05,
    critMultiplier = 2.0,
  } = params;

  // Base damage from weapon + power
  let damage = baseDamage + weaponDamage;
  damage += (attackerStats.power ?? 10) * 0.5;

  // CURRENT: Level difference modifier (-10% to +10% per level, clamped at ±50%)
  // NEEDS CHANGE: Add level-gap multiplier beyond 5-level threshold
  const levelDiff = attackerLevel - defenderLevel;
  const levelMod = 1 + Math.max(-0.5, Math.min(0.5, levelDiff * 0.05));
  damage *= levelMod;

  // Critical hit check
  const critRoll = Math.random();
  const actualCritChance = critChance + (attackerStats.haste ?? 10) * 0.005;
  const critical = critRoll < actualCritChance;

  if (critical) {
    damage *= critMultiplier;
  }

  // Apply armor reduction
  const effectiveArmor = armorReduction * (1 + (defenderStats.toughness ?? 10) * 0.02);
  damage = Math.max(1, damage - effectiveArmor);

  // Add some randomness (±10%)
  damage *= 0.9 + Math.random() * 0.2;

  return {
    damage: Math.round(damage),
    critical,
  };
}
```

### Creature Health Values (Current State)
```typescript
// Source: packages/entities/src/definitions/creatures.ts
// Tier I: 40-80 HP (levels 1-6)
// Tier II: 60-120 HP (levels 4-18)
// Tier III: 90-180 HP (levels 8-28)
// Tier IV: 200-250 HP (levels 18-35)

// Example: Void Crawler (starter creature)
baseHealth: 50,
levelRange: [1, 5],

// Example: Void Horror (endgame creature)
baseHealth: 250,
levelRange: [20, 35],
```

### Ability Damage Values (Current State)
```typescript
// Source: packages/game-logic/src/ability/definitions.ts
// Basic abilities: 10-15 base damage
// Medium abilities: 18-25 base damage
// Heavy abilities: 28-35 base damage

// Example: Basic Strike (1.5s cooldown)
energyCost: 10,
cooldownMs: 1500,
effects: [{ type: 'damage', baseDamage: 15, scaling: 1.0 }],

// Example: Plasma Burst (8s cooldown)
energyCost: 25,
cooldownMs: 8000,
effects: [{ type: 'damage', baseDamage: 35, scaling: 1.2 }],
```

### Creature Combat (Current Attack Pattern)
```typescript
// Source: apps/game-server/src/game/combat.service.ts (lines 175-279)
// Creatures attack on interval based on haste stat
// Base interval: 1000ms at haste 50 (configurable via calculateAttackInterval)

const creatureStats = computeCharStats(creature.level, emptyEquipment, 'creature');
const attackInterval = calculateAttackInterval(creatureStats.haste);

// Check if enough time has passed since last attack
const now = Date.now();
if (now - session.lastAttackAt < attackInterval) {
  return null;
}

// Calculate damage: Creature Power vs Player Toughness
const damageResult = calculateDamage({
  baseDamage: 10,
  attackerLevel: creature.level,
  defenderLevel: player.level,
  attackerStats: creatureStats,
  defenderStats: playerStats,
  weaponDamage: creature.level * 2, // Creature "weapon" scales with level
  armorReduction: playerStats.toughness,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed damage values | Formula-based with stats | Phase 45 (combat system) | Enables equipment-driven progression |
| Linear level scaling (5% per level) | Needs threshold-based exponential | Phase 81 (this phase) | Prevents one-shots, allows meaningful level gaps |
| Manual quest testing | Should be automated audit | Phase 81 (this phase) | Catches broken quests before players do |
| Feel-based balance | Should be simulation-driven | Phase 81 (this phase) | Math proves balance, playtesting fine-tunes feel |

**Deprecated/outdated:**
- **Simple percentage scaling:** Current `levelDiff * 0.05` is capped at ±50%, doesn't apply multiplier beyond threshold.
- **Manual creature stat tuning:** Setting `baseHealth` values without TTK simulations leads to unpredictable balance.

## Open Questions

1. **Should level-gap multiplier apply to both damage dealt AND taken?**
   - What we know: Current formula only affects outgoing damage via `levelMod`.
   - What's unclear: If high-level creature attacks low-level player, should player take MORE damage? Or should it be asymmetric (offense only)?
   - Recommendation: Apply symmetrically for PvE consistency. Low-level players fighting high-level creatures should take increased damage to discourage power-leveling abuse.

2. **What is the desired TTK range for bosses/elite creatures?**
   - What we know: Requirements specify 4-8 hits for "typical creature."
   - What's unclear: No boss/elite creatures exist yet. Should elites be 2x TTK (8-16 hits)?
   - Recommendation: Plan for 2-3x health multiplier for elite variants, but defer to future phase after basic balance is complete.

3. **How should ability cooldown-per-DPS scaling work across tiers?**
   - What we know: Abilities range from 1.5s to 20s cooldowns, damage 10-35 base.
   - What's unclear: Should high-cooldown abilities have proportionally higher damage, or diminishing returns?
   - Recommendation: Target linear DPS scaling (long cooldown = proportionally more damage) for simple balance. Test with simulation.

4. **Should quest item drop rates be guaranteed or probabilistic?**
   - What we know: Current loot tables use `chance: 0.05` to `0.85` probabilities.
   - What's unclear: Quest items with low drop rates (<10%) frustrate players. Should quest items have 100% drop chance?
   - Recommendation: Quest-flagged items should have guaranteed 1x drop from quest-relevant creatures. Keep probabilistic drops for optional/bonus items.

## Sources

### Primary (HIGH confidence)
- **Into the Void Codebase:**
  - `packages/game-logic/src/combat/damage.ts` — Current damage formula implementation
  - `packages/entities/src/definitions/creatures.ts` — Creature health and level ranges
  - `packages/game-logic/src/ability/definitions.ts` — Ability damage values and cooldowns
  - `apps/game-server/src/game/combat.service.ts` — Creature attack loop and player combat
  - `packages/game-logic/src/loot/creature-loot.ts` — Loot table definitions (quest item sources)
  - `packages/quests/src/definitions/tutorial.ts` — Current quest objectives

- **Project Documentation:**
  - `.planning/REQUIREMENTS.md` — COMB-01 through COMB-05, QUEST-07/08 specifications
  - `.planning/STATE.md` — Decision: 15% damage multiplier per level beyond 5-level gap

### Secondary (MEDIUM confidence)
- [Game Design Concepts - Level 16: Game Balance](https://gamedesignconcepts.wordpress.com/2009/08/20/level-16-game-balance/) — Backward TTK design methodology
- [UserWise - The Mathematics of Game Balance](https://blog.userwise.io/blog/the-mathematics-of-game-balance) — Monte Carlo simulation for balance testing
- [GameDev.net - RPG Combat Formulas](https://www.gamedev.net/forums/topic/660352-formulas-math-and-theories-for-rpg-combatleveling-systems/) — Level scaling formula patterns
- [Tung's Word Box - Simplest Non-Problematic Damage Formula](https://tung.github.io/posts/simplest-non-problematic-damage-formula/) — Attack-defense balance theory
- [Building a Quest System - Reactive Tracking](https://medium.com/hackernoon/building-a-quest-system-cf7f1d3da132) — Quest completion monitoring patterns

### Tertiary (LOW confidence)
- [MMORPG.com - Time to Kill Balance Discussion](https://forums.mmorpg.com/discussion/498765/time-to-kill-and-action-combat-mmos-where-the-balance-here) — Community perspectives on TTK (not authoritative, but informative)
- [Bio Break - MMO Combat System Factors](https://biobreak.wordpress.com/2016/03/23/8-factors-that-make-or-break-mmo-combat-systems/) — General MMO combat design considerations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All tools already in project, no external dependencies needed
- Architecture: HIGH — Patterns verified against existing codebase structure
- Pitfalls: HIGH — Based on current formula analysis and common game balance issues
- Level-gap multiplier: MEDIUM — Formula structure known (15% per level), exact tuning needs simulation
- Quest item audit: HIGH — Clear registry cross-reference pattern, straightforward implementation
- Ability DPS balance: MEDIUM — Current abilities exist, but no baseline auto-attack DPS to compare against

**Research date:** 2026-02-23
**Valid until:** 30 days (stable game design patterns, but balance tuning is iterative)
