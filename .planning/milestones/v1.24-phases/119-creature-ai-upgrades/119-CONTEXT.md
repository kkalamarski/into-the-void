# Phase 119: Creature AI Upgrades - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Each creature behavior archetype gains one new meaningful behavior: herbivores trigger Stampede when 3+ flee simultaneously, omnivores have a 30% chance to Pack Call nearby allies, predators deal 2x damage on first Ambush strike from stealth, and maniacs enter Frenzy below 30% HP doubling attack speed. Creature death/state cleanup must not leak memory.

</domain>

<decisions>
## Implementation Decisions

### Stampede (Herbivores)
- Line charge shape — herbivores bolt in a directional corridor, damaging players in the path
- Brief ~1s wind-up before charge: ground dust/tremor effect gives observant players a dodge window
- Heavy damage: 2x creature level (kinetic)
- After stampede: herbivores scatter to random nearby positions, then resume normal idle behavior after cooldown
- Stampede triggers when 3+ herbivores are provoked simultaneously

### Ambush (Predators)
- Fully invisible in stealth — predators are completely hidden until they attack or a high-Perception player gets close
- Perception detection: warning danger icon near predator's position + faint red outline on the creature. Player can choose to engage or avoid
- Ambush hit visual: brief red flash at screen edges + oversized damage number to sell the impact
- No re-stealth — once revealed, predator stays visible for the encounter. Ambush is a one-time opener
- 2x damage on first strike against unsuspecting player (Perception above 150 avoids the doubled hit)

### Frenzy (Maniacs)
- Visual: red tint color overlay + pulsing glow that syncs with faster attack speed
- Trigger cue: brief screen-edge red flash + floating text "[Creature] enters Frenzy!" to alert nearby players
- 2x attack speed (double) when below 30% HP
- Risk/reward trade-off: frenzied maniacs also take 25% more damage — Frenzy is dangerous but also an opportunity to burst them down
- State cleanup on death is critical — no orphaned Frenzy Map data

### Pack Call (Omnivores)
- Range: ~10 tiles (same screen) — only omnivores visible on the player's screen can be called
- Max 2 reinforcements per Pack Call — prevents snowball in dense zones
- Called omnivores instantly switch to combat state targeting the player — no travel animation, punishment is swift
- 30% chance to trigger when an omnivore is provoked
- Notification: combat log entry only ("[Creature] calls for help!") — subtle, player discovers through experience

### Claude's Discretion
- Exact dust/tremor particle implementation for Stampede wind-up
- Perception threshold detection radius and check frequency
- Frenzy pulsing glow animation timing
- Pack Call eligibility checks (exclude already-in-combat omnivores, etc.)
- Combat tick integration details for doubled attack speed

</decisions>

<specifics>
## Specific Ideas

- Stampede should feel like a real herd charge — directional, weighty, punishing careless provocation of groups
- Ambush reveal with Perception should feel rewarding — "I spotted it before it got me" moment
- Frenzy risk/reward: experienced players should recognize Frenzy as a window to burst the maniac down, not just a threat
- Pack Call should be subtle enough that new players are surprised the first time, then learn to check surroundings before engaging omnivores

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 119-creature-ai-upgrades*
*Context gathered: 2026-03-04*
