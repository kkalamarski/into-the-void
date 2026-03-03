# Phase 116: Stat Caps - Research

**Researched:** 2026-03-03
**Domain:** Game balance — diminishing returns and stat capping in computeCharStats()
**Confidence:** HIGH

## Summary

Phase 116 adds a two-tier stat cap system to the existing 8-stat character stats pipeline. The current `computeCharStats()` function in `packages/game-logic/src/stats/char-stats.ts` produces raw additive stats (base + equipment + buffs) with no upper bound. This phase introduces a post-processing step: soft cap at 200 (0.5x returns above), hard cap at 400 effective. The function is pure and has no side effects, making it an ideal place to insert DR as a final transformation.

The stats pipeline has exactly one authoritative computation path — `computeCharStats()` — called from 6+ locations in the game server (gateway emitStats, combat.service, ability.service, ai.service). All consumers receive `CharacterStats` objects. By applying DR inside `computeCharStats()` itself, all downstream consumers automatically get capped values with zero integration risk.

**Primary recommendation:** Implement `applyDiminishingReturns()` as a pure function that transforms a single raw stat value to an effective value, then call it for every stat key at the end of `computeCharStats()` before returning. Ship raw values alongside effective values in `CharStatsPayload` so the client can show DR tooltips.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Stat values shift to yellow when in DR territory (effective > 200)
- Stat values shift to red/orange when hard-capped at 400 effective
- "CAPPED" text label appears next to the stat only at the hard cap — no label for soft cap DR territory
- All stats show a subtle marker/tick at the 200 threshold on any stat bar or progress indicator, even before crossing it — gives awareness that a threshold exists
- Stats panel shows effective value only — clean, uncluttered
- Tooltip with raw vs effective breakdown appears only on stats currently in DR territory (above 200)
- Tooltip format is terse: just "Raw: X | Effective: Y" — no explanatory text
- Stats under 200 have no DR tooltip (raw = effective, nothing to show)
- At hard cap: same terse format "Raw: X | Effective: 400" — no special CAPPED label in tooltip (the panel label handles that)
- Brief toast notification fires when equipping an item pushes a stat past the 400 hard cap — warns the player stats are being wasted
- Toast only triggers at the hard cap, NOT when entering DR territory at 200
- Item comparison tooltips show effective stat delta after DR, not raw bonus — e.g., "+30 Power" becomes "+15 Power (DR)" when the stat is in DR territory
- Organic discovery only — no tutorial, no first-time popup, no help icon
- The exact DR formula (0.5x above 200, cap 400) is intentionally opaque — not revealed anywhere in-game

### Claude's Discretion
- Exact yellow/red/orange color values (should fit existing CSS variable palette)
- How the subtle 200-threshold marker looks (tick, line, gradient boundary)
- Toast notification styling and duration
- How "(DR)" annotation looks in item comparison tooltips
- Implementation of the stat bar marker for the 200 threshold

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAPS-01 | Stat soft cap at 200 with diminishing returns (every point above 200 counts as 0.5) | `applyDiminishingReturns()` pure function; formula: `min(raw, 200) + max(0, raw - 200) * 0.5` capped at 400 |
| CAPS-02 | Stat hard cap at 400 preventing infinite scaling | `Math.min(400, effectiveValue)` after DR calculation |
| CAPS-03 | Diminishing returns applied as post-processing in computeCharStats() covering all consumers | DR applied at end of `computeCharStats()` before return; all 6+ server callers automatically get capped stats |
| CAPS-04 | Stats panel UI shows soft cap indicator when a stat exceeds 200 | Yellow color on stat value via CSS class; `CharStatsPayload` extended with `raw` field so client can detect DR |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | existing | Unit testing for applyDiminishingReturns() | Already configured in packages/game-logic/vitest.config.ts |
| @floating-ui/react | existing | Stat DR tooltips in EquipmentPanel | Already used by ItemTooltip component |
| zustand | existing | statsStore state management | Already manages CharStatsPayload |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons/gi | existing | Stat icons in EquipmentPanel | Already imported for stat display |

### Alternatives Considered
None — this phase uses only existing project dependencies.

## Architecture Patterns

### Pattern 1: Pure Post-Processing in computeCharStats()

**What:** Apply DR as the final step before returning from `computeCharStats()`, transforming each stat independently.

**When to use:** Always — this is the single authoritative stat computation path.

**Current code structure (char-stats.ts line 81-139):**
```typescript
export function computeCharStats(level, equipment, target, activeBuffs): CharacterStats {
  // 1. Base stats from level scaling
  // 2. Equipment bonuses (additive)
  // 3. Buff modifiers (additive)
  return stats; // <-- INSERT DR HERE
}
```

**After DR integration:**
```typescript
export function computeCharStats(level, equipment, target, activeBuffs): CharacterStats {
  // 1. Base stats
  // 2. Equipment bonuses
  // 3. Buff modifiers
  // 4. Apply diminishing returns (NEW)
  for (const key of STAT_KEYS) {
    stats[key] = applyDiminishingReturns(stats[key]);
  }
  return stats;
}
```

**Why this pattern:** All 6+ callers in game-server (`emitStats`, `combat.service` x2, `ability.service` x4, `ai.service` x1) get DR-capped stats without any changes.

### Pattern 2: Extended CharStatsPayload for Client DR Display

**What:** Add a `raw` field to `CharStatsPayload` so the client can compare raw vs effective and show DR indicators.

**Current CharStatsPayload (shared-types/src/game/stats.ts):**
```typescript
export interface CharStatsPayload {
  level: number;
  total: CharacterStats;     // effective (will now include DR)
  base: CharacterStats;      // base from level
  equipment: CharacterStats; // equipment delta
}
```

**Extended:**
```typescript
export interface CharStatsPayload {
  level: number;
  total: CharacterStats;     // effective (DR-capped)
  base: CharacterStats;      // base from level
  equipment: CharacterStats; // equipment delta
  raw: CharacterStats;       // NEW: raw total before DR
}
```

**Why:** The client needs `raw` to detect which stats are in DR territory (`raw[stat] > 200`) and to display "Raw: X | Effective: Y" tooltips. The `equipment` field stays as raw delta (uncapped) since it represents the contribution from gear.

### Pattern 3: computeCharStats Returns Both Raw and Effective

**What:** `computeCharStats()` needs to return both raw and effective stats so `emitStats` in game.gateway.ts can populate both fields.

**Options:**
1. **Recommended:** Add a second function `computeCharStatsWithDR()` that returns `{ raw: CharacterStats, effective: CharacterStats }` — used by `emitStats`. The original `computeCharStats()` returns effective-only for all other callers.
2. **Alternative:** Have `computeCharStats()` always return a tuple. More invasive.

**Recommended approach:** Keep `computeCharStats()` returning effective stats (covers all combat/AI callers with zero changes). Add a wrapper `computeCharStatsRaw()` that returns raw stats (pre-DR) for the single `emitStats` call site that needs it.

Actually simpler: in `emitStats` (game.gateway.ts), compute stats twice — once as "raw" (before `computeCharStats` applies DR) and once as "total" (after DR). Since `computeCharStats` will always apply DR, the raw version can be computed by a separate `computeRawCharStats()` that skips the DR step, or by running the DR-less path.

**Simplest approach:** Extract the raw computation into a helper, then `computeCharStats` = raw + DR. The gateway calls raw for the `raw` payload field, and `computeCharStats` for the `total` field.

### Anti-Patterns to Avoid
- **Applying DR in multiple places:** DR MUST be in `computeCharStats()` only. Never apply it in combat.service, ability.service, or client-side.
- **Capping individual contributions:** DR applies to the TOTAL stat, not to individual equipment pieces or buffs.
- **Mutating the formula for creatures:** Creatures use `target='creature'` — DR should apply equally to creatures (prevents creature stat inflation at high levels).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stat tooltips | Custom tooltip from scratch | @floating-ui/react (already used in ItemTooltip) | Positioning, flip, shift all handled |
| Toast notifications | New toast system | Existing `alertStore` with `addAlert()` | Already handles auto-dismiss, stacking, 5s duration |
| DR color indicators | Inline style conditions | CSS classes + CSS variables | Consistent with existing panel styling |

## Common Pitfalls

### Pitfall 1: Equipment Delta Misrepresentation After DR
**What goes wrong:** If `equipment` field in `CharStatsPayload` shows DR-adjusted deltas, the breakdown "(base+equipment)" won't add up to the displayed total.
**Why it happens:** DR is non-linear — `DR(base + equip) != DR(base) + DR(equip)`.
**How to avoid:** Keep `equipment` field as raw delta (uncapped). The stats panel shows effective `total` only. The breakdown tooltip shows "Raw: X | Effective: Y" for the total, not per-contribution.
**Warning signs:** Players see `(100+50)` breakdown but total shows `225` instead of `150`.

### Pitfall 2: Double-Capping in Combat Calculations
**What goes wrong:** If both `computeCharStats()` and `calculateDamage()` apply caps, damage is reduced twice.
**Why it happens:** Developers add DR "just to be safe" in the damage formula.
**How to avoid:** DR lives in `computeCharStats()` ONLY. `calculateDamage()` receives already-capped stats and uses them as-is.
**Warning signs:** Combat damage drops unexpectedly for high-stat characters.

### Pitfall 3: Client Stat Parity Breaks
**What goes wrong:** `extractItemStats()` and `computeEquipmentDelta()` in `stat-helpers.ts` return raw bonuses. If the item comparison tooltip needs to show effective deltas, it must account for DR context.
**Why it happens:** Item tooltip comparison currently shows raw `+X stat` without knowing the player's current total.
**How to avoid:** The item comparison tooltip needs the player's current effective stat to compute the DR-adjusted delta. Pass current stats context to the comparison function.
**Warning signs:** Tooltip shows "+30 Power" but equipping only adds +15 effective.

### Pitfall 4: Level-Up Stats Cross DR Threshold
**What goes wrong:** Level-up notification shows stat deltas that don't match visible changes because DR was applied.
**Why it happens:** `statsStore.ts` computes `levelUpDeltas` from `base` stats which don't have DR.
**How to avoid:** Compute level-up deltas from effective totals (DR-applied) instead of base stats, or accept that level-up shows raw gains.
**Warning signs:** "Leveled up! +10 Power" but Power only went from 225 to 229 in the panel.

## Code Examples

### applyDiminishingReturns() Implementation
```typescript
// packages/game-logic/src/stats/char-stats.ts

/** Soft cap threshold — full value below this */
const SOFT_CAP = 200;

/** Diminishing returns multiplier above soft cap */
const DR_MULTIPLIER = 0.5;

/** Hard cap — maximum effective stat value */
const HARD_CAP = 400;

/**
 * Apply diminishing returns to a single stat value.
 * - Below 200: full value (1:1)
 * - Above 200: half value (0.5:1)
 * - Hard capped at 400 effective
 *
 * Pure function. No side effects.
 */
export function applyDiminishingReturns(raw: number): number {
  if (raw <= SOFT_CAP) return raw;
  const base = SOFT_CAP;
  const excess = (raw - SOFT_CAP) * DR_MULTIPLIER;
  return Math.min(HARD_CAP, base + excess);
}
```

### DR Integration Point in computeCharStats()
```typescript
// At end of computeCharStats(), before return:
const STAT_KEYS: Array<keyof CharacterStats> = [
  'durability', 'toughness', 'power', 'haste',
  'vigor', 'recovery', 'perception', 'resilience',
];

for (const key of STAT_KEYS) {
  stats[key] = applyDiminishingReturns(stats[key]);
}

return stats;
```

### Toast on Hard Cap (Client)
```typescript
// In statsStore.ts setStats handler, after setting state:
if (state.stats !== null) {
  for (const { key } of STAT_DISPLAY_ORDER) {
    const prevRaw = state.stats.raw?.[key] ?? 0;
    const newRaw = payload.raw[key];
    const newEffective = payload.total[key];
    // Toast when a stat newly hits the hard cap (400 effective)
    if (newEffective >= 400 && prevRaw < /* raw that produces 400 */ 600) {
      // Raw 600 = 200 + (600-200)*0.5 = 200+200 = 400
      // Actually: any raw where effective == 400 means raw >= 600
      alertStore.addAlert(`${key} is at maximum effectiveness`, 'warning');
    }
  }
}
```

### DR Color Classes in CharStatRow
```typescript
function CharStatRow({ statKey, label, base, equipment, total, raw }: CharStatRowProps) {
  const isDR = raw > 200;
  const isCapped = total >= 400;
  const colorClass = isCapped ? 'char-stat--capped' : isDR ? 'char-stat--dr' : '';

  return (
    <div className={`char-stat-row ${colorClass}`}>
      <Icon className="char-stat-icon" />
      <span className="char-stat-label">{label}</span>
      <span className="char-stat-total">{total}</span>
      {isCapped && <span className="char-stat-cap-label">CAPPED</span>}
    </div>
  );
}
```

## Open Questions

1. **Should DR apply to creatures?**
   - What we know: Creatures use `target='creature'` in `computeCharStats()`. Current highest creature level is likely ~40-50, with base stats reaching 200+ at high levels.
   - What's unclear: Whether creature stats should also be capped or only player stats.
   - Recommendation: Apply DR uniformly to both players and creatures. The DR formula is in `computeCharStats()` which serves both. If creatures need exemption, add a flag to skip DR for `target='creature'`. However, capping creature stats prevents runaway scaling at high levels, which is desirable for balance.

2. **Raw value that hits hard cap**
   - What we know: Effective = min(400, 200 + (raw - 200) * 0.5). To hit 400: 200 + (raw - 200) * 0.5 = 400 => raw = 600.
   - Resolution: Raw >= 600 produces effective 400. Toast triggers when raw crosses 600 (not 400).

## Sources

### Primary (HIGH confidence)
- `packages/game-logic/src/stats/char-stats.ts` — current computeCharStats implementation (lines 81-139)
- `packages/game-logic/src/stats/stat-helpers.ts` — extractItemStats and computeEquipmentDelta
- `packages/shared-types/src/game/stats.ts` — CharStatsPayload interface
- `apps/game-server/src/game/game.gateway.ts` — emitStats (lines 1656-1681)
- `apps/web/src/ui/panels/EquipmentPanel.tsx` — CharStatRow component and stat display
- `apps/web/src/store/statsStore.ts` — client stat state management
- `apps/web/src/store/alertStore.ts` — toast notification system
- `apps/web/src/styles/global.css` — CSS variable palette (--color-warning: #ffaa44, --color-danger: #ff4444)

### Secondary (MEDIUM confidence)
- `apps/game-server/src/game/combat.service.ts` — 2 call sites of computeCharStats
- `apps/game-server/src/game/ability.service.ts` — 4 call sites of computeCharStats
- `apps/game-server/src/game/ai.service.ts` — 1 call site of computeCharStats

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies already in project
- Architecture: HIGH - single computation path, clear integration point
- Pitfalls: HIGH - analyzed all call sites and identified concrete risks

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain, no external dependencies)

---
*Phase: 116-stat-caps*
*Research completed: 2026-03-03*
