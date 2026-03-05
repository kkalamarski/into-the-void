# Phase 116: Stat Caps - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce diminishing returns on character stats in computeCharStats() — soft cap at 200 (0.5x returns above), hard cap at 400 effective — with visual feedback in the stats panel and item tooltips. No new stats, no rebalancing of existing gear values.

</domain>

<decisions>
## Implementation Decisions

### DR indicator style
- Stat values shift to yellow when in DR territory (effective > 200)
- Stat values shift to red/orange when hard-capped at 400 effective
- "CAPPED" text label appears next to the stat only at the hard cap — no label for soft cap DR territory
- All stats show a subtle marker/tick at the 200 threshold on any stat bar or progress indicator, even before crossing it — gives awareness that a threshold exists

### Raw vs effective display
- Stats panel shows effective value only — clean, uncluttered
- Tooltip with raw vs effective breakdown appears only on stats currently in DR territory (above 200)
- Tooltip format is terse: just "Raw: X | Effective: Y" — no explanatory text
- Stats under 200 have no DR tooltip (raw = effective, nothing to show)
- At hard cap: same terse format "Raw: X | Effective: 400" — no special CAPPED label in tooltip (the panel label handles that)

### Cap overflow feedback
- Brief toast notification fires when equipping an item pushes a stat past the 400 hard cap — warns the player stats are being wasted
- Toast only triggers at the hard cap, NOT when entering DR territory at 200
- Item comparison tooltips show effective stat delta after DR, not raw bonus — e.g., "+30 Power" becomes "+15 Power (DR)" when the stat is in DR territory
- This lets players make informed gear choices without having to equip-and-check

### DR explanation to player
- Organic discovery only — no tutorial, no first-time popup, no help icon
- Players see the color change and tooltip when it happens naturally
- The exact DR formula (0.5x above 200, cap 400) is intentionally opaque — not revealed anywhere in-game
- Players learn through experimentation and community knowledge

### Claude's Discretion
- Exact yellow/red/orange color values (should fit existing CSS variable palette)
- How the subtle 200-threshold marker looks (tick, line, gradient boundary)
- Toast notification styling and duration
- How "(DR)" annotation looks in item comparison tooltips
- Implementation of the stat bar marker for the 200 threshold

</decisions>

<specifics>
## Specific Ideas

- Two-tier color system: yellow = diminished, red = capped. Familiar RPG convention.
- Item tooltips should be actionable — showing effective delta means players can compare gear without mental math
- Toast only at hard cap keeps notification fatigue low

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 116-stat-caps*
*Context gathered: 2026-03-03*
