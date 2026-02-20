# Research Summary: Active Combat Abilities System

**Domain:** Active ability system for 2D multiplayer sci-fi survival MMO
**Researched:** 2026-02-20
**Overall confidence:** HIGH

## Executive Summary

Active combat abilities for Into the Void build entirely on existing infrastructure with **no new external dependencies required**. The system extends the current action bar, energy resource, and combat services to enable item-granted abilities with cooldowns, buffs, and visual feedback.

**Key architectural insight:** Item-granted abilities (instead of skill trees) is a **differentiator** that aligns with the existing item system and creates meaningful equipment progression. Players change loadouts to access different abilities rather than allocating skill points.

**Critical finding:** Most MMO ability system pitfalls revolve around **time synchronization** (client-server cooldown desync), **memory management** (abandoned cooldowns on disconnect), and **missing global cooldown** (ability spam). These are all preventable with proper architecture patterns.

**Table stakes vs nice-to-have:** 13 table stakes features are expected by players (cooldown visualization, tooltips, range validation). 10 differentiator features add unique value (item-granted abilities, dynamic action bar). 15 anti-features should be explicitly avoided (channeled abilities, cast times, ground-targeted AOE don't fit 2D real-time combat).

## Key Findings

**Stack:** All existing - NestJS (server), Phaser 3 (client visuals), Zustand (client state), Socket.IO (real-time events), in-memory Maps for cooldowns/buffs. Zero new npm packages needed.

**Architecture:** Client-authoritative for UI responsiveness (optimistic animations), server-authoritative for validation (range, cooldown, energy). Buff system as in-memory stat modifiers with 100ms tick interval. Cooldowns stored as client-side timestamps (endsAt = Date.now() + duration) to avoid time desync.

**Critical pitfall:** Memory leaks from abandoned cooldowns if disconnect cleanup not implemented. Also: missing global cooldown enables ability spam (8 abilities fired in <1 second overwhelms server).

## Implications for Roadmap

Based on research, suggested phase structure:

### 1. **Phase 1: Core Ability System** - Foundation
**Addresses:** Table stakes features (cooldowns, tooltips, resource costs, visual feedback)
**Avoids:** Time desync pitfall (use duration not timestamps), client-side damage calculation (server authoritative)

**Why this order:** Metadata and validation infrastructure must exist before abilities can execute. Tooltips and cooldowns are player-facing requirements - missing these makes abilities feel broken.

**Rationale:** Build bottom-up - data layer (ability definitions in items) → validation layer (range, energy, cooldown checks) → execution layer (damage, buffs) → presentation layer (tooltips, animations). Each layer depends on the previous.

---

### 2. **Phase 2: Buff System** - Status Effects
**Addresses:** Buff/debuff icons, duration tracking, stat modification
**Avoids:** Forgotten buff tick loop (buffs never expire), buff stacking exploit (no stack limits)

**Why after Phase 1:** Buffs are a type of ability effect. Can't implement buffs before ability execution system exists. Buffs add complexity (tick interval, stat tracking, UI icons) that would distract from core ability flow.

**Rationale:** Abilities work without buffs (pure damage abilities), but buffs don't work without abilities (buffs are applied BY abilities). Sequential dependency.

---

### 3. **Phase 3: Ability Queuing & Polish** - Combat Smoothness
**Addresses:** Input buffering, ability queuing during GCD, dynamic action bar
**Avoids:** No queuing pitfall (unresponsive combat feel)

**Why last:** Queuing is optimization. System must work WITHOUT queuing first, then add smoothness. Otherwise you're debugging queuing bugs mixed with ability execution bugs.

**Rationale:** Queuing requires working GCD system. GCD requires working cooldown system. Cooldown system requires working ability execution. This is final polish, not foundation.

---

### Phase ordering rationale:

**Dependency chain:** Ability metadata → Ability execution → Cooldown tracking → Visual feedback → Buffs (ability effects) → Queuing (input optimization). Each phase unlocks the next.

**Risk mitigation:** Core functionality first (can use abilities), then effects (buffs), then polish (queuing). If timeline compresses, Phase 3 can be deferred without breaking combat.

**Player value:** Phase 1 = playable combat with abilities. Phase 2 = tactical depth with buffs. Phase 3 = competitive-quality responsiveness. Incremental value delivery.

---

## Research flags for phases:

- **Phase 1** likely needs **deeper research** into:
  - Ability metadata schema design (balancing simplicity vs flexibility)
  - Energy regeneration rates (how fast should energy regen to enable ability spam vs constraint?)

- **Phase 2** likely needs **deeper research** into:
  - Buff UI design (how many buffs shown? icon size? placement?)
  - Stat modification math (additive vs multiplicative stacking? which stats buffable?)

- **Phase 3** standard patterns, unlikely to need research:
  - Ability queuing is well-documented (400ms buffer window before GCD ends is industry standard)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All dependencies already in place, verified by codebase inspection |
| Features | **HIGH** | Table stakes validated by 10+ MMO/ARPG sources, player expectations clear |
| Architecture | **HIGH** | Patterns proven (authoritative server, client timestamps, in-memory cooldowns) |
| Pitfalls | **MEDIUM** | Common pitfalls documented, but project-specific edge cases may emerge |

**Stack confidence:** Direct codebase verification. All required infrastructure exists (Socket.IO events, Phaser rendering, Zustand stores, action bar UI).

**Features confidence:** Cross-referenced 30+ sources including MMO design patterns, ARPG comparisons (Diablo 4 vs Path of Exile 2), ability system UX research, and anti-pattern documentation. Player expectations converge across sources.

**Architecture confidence:** Recommended patterns are industry-standard (authoritative server, client prediction, event-driven updates). No experimental approaches - all proven at scale.

**Pitfalls confidence:** Research identified 10 critical/moderate pitfalls with prevention strategies. However, domain-specific issues (e.g., interaction between item-granted abilities and inventory system edge cases) may surface during implementation. MEDIUM not LOW because mitigation strategies are documented.

---

## Gaps to Address

**1. Energy regeneration tuning**
Research identified that energy exists and regenerates, but optimal regen rate is unclear. How fast should energy regenerate to balance ability usage frequency? Needs playtesting.

**Action:** Phase 1 should include configurable energy regen rate (easy to adjust). Start conservative (slow regen) and increase based on feedback.

---

**2. Ability balancing methodology**
Research shows damage/cooldown/cost tradeoffs, but doesn't prescribe formula. How to balance 20+ abilities across 3 categories (offensive/defensive/utility)?

**Action:** Defer to post-MVP. Launch with conservative numbers (long cooldowns, high costs), gather telemetry (which abilities used most/least), adjust.

---

**3. Buff icon UI placement**
Research confirms buff icons are table stakes, but doesn't specify layout. How many buffs shown simultaneously? What happens with >10 active buffs?

**Action:** Phase 2 research task. Look at Diablo 4 and Path of Exile 2 buff UI specifically. Likely solution: show max 10, overflow with "... +3 more" indicator.

---

**4. Item-granted ability discovery UX**
Differentiator feature but unclear how players learn "this item grants plasma burst ability." Tooltip on item? Auto-reveal when equipped?

**Action:** Phase 1 should include ability info in item tooltips. When hovering item in inventory, tooltip shows granted ability details.

---

**5. Ability upgrade system complexity**
Marked as "Very High" complexity differentiator. Research didn't find implementation patterns - would require custom design.

**Action:** Defer to post-MVP, potentially separate milestone. Not required for functional ability system. Progression can be item-tier-based (tier 2 item = stronger version of ability) instead of use-based progression.

---

## Topics needing phase-specific research later:

**If Phase 2 adds combo system (differentiator):**
- Research combo indicators in Marvel Rivals (2026) and fighting games
- How to communicate "ability B deals bonus damage if target has debuff from ability A"

**If Phase 3 adds ability preview animations (differentiator):**
- Research Phaser sprite projection techniques
- Performance cost of real-time range overlays in 2D tile-based game

**If post-MVP adds cooldown reduction mechanics (differentiator):**
- Research haste stat implementation in WoW and FFXIV
- Diminishing returns on cooldown reduction to prevent degenerate cases

---

## Recommended Immediate Next Steps

**For requirements phase:**

1. **Define ability metadata schema** - What fields does every ability need? (id, name, description, energyCost, cooldown, range, targetType, effects[])

2. **Categorize all 20+ planned abilities** - Which are offensive/defensive/utility? What items grant them? Create spreadsheet.

3. **Identify table stakes must-haves for MVP** - From 13 table stakes features, which are blockers for launch? (Likely: cooldown viz, tooltips, range validation, visual feedback)

4. **Flag "research later" items** - Which differentiators are post-MVP? (Likely: combo indicators, reactive procs, ability upgrade system)

5. **Define success metrics** - How to know if ability system "feels good"? (Ability use rate, energy depletion rate, average abilities used per combat encounter)

**For implementation roadmap:**

- Phase 1 target: ~2-3 weeks (ability metadata, execution, cooldowns, basic visuals)
- Phase 2 target: ~1-2 weeks (buff system, stat modifiers, buff icons)
- Phase 3 target: ~1 week (ability queuing, action bar polish)
- Total: ~4-6 weeks for complete ability system MVP

**This timeline assumes:**
- 1 developer full-time
- Existing infrastructure requires no changes (only extensions)
- No major blockers or architectural surprises

---

## Conclusion

Active combat abilities are **low-risk, high-value** addition to Into the Void. All infrastructure exists, patterns are proven, pitfalls are documented. The item-granted ability model is a strong differentiator that fits the existing item system perfectly.

**Biggest risk:** Time synchronization between client cooldown displays and server validation. Mitigated by using duration (not timestamps) and adding client-side grace period.

**Biggest opportunity:** Item-granted abilities create natural item progression ("I need the tier 3 plasma rifle for the AOE version of plasma burst"). This drives engagement with existing loot and crafting systems.

**Recommended approach:** Incremental delivery across 3 phases. Phase 1 alone delivers playable ability combat. Phases 2-3 add depth and polish. Each phase is independently valuable.
