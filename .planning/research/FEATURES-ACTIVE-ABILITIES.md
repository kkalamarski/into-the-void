# Feature Landscape: Active Combat Abilities

**Domain:** Active ability system for 2D multiplayer sci-fi survival MMO
**Researched:** 2026-02-20

## Table Stakes

Features players expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes | Dependencies |
|---------|--------------|------------|-------|--------------|
| **Cooldown visualization** | Players must know when abilities become available again | Low | Visual sweep/countdown on action bar icons | Action bar UI already exists |
| **Hotkey activation** | Standard MMO/ARPG interaction pattern - keyboard 1-9 keys | Low | Already implemented for action bar | Existing action bar system |
| **Resource cost display** | Players need upfront info before using abilities (energy cost) | Low | Show cost on tooltip and icon | Energy stat already in HUD |
| **Ability tooltips** | Players expect detailed information: name, description, cost, cooldown, damage/effects | Medium | Requires structured data format, color-coded stats | Tooltip system exists for items |
| **Visual feedback on use** | Confirmation ability activated (animation, sound, particle effect) | Medium | Client-side feedback before server confirmation | Phaser sprite/particle system |
| **Range validation** | System prevents using melee abilities at range, ranged at wrong distance | Medium | Pre-use validation with error messaging | Existing `canInteract` range checks |
| **Insufficient resource handling** | Clear feedback when player lacks energy to use ability | Low | Visual indication (red text, icon grayed out) | Energy resource tracking |
| **Target requirement clarity** | Players know which abilities need targets vs self-cast vs ground-target | Medium | Icon indicators, cursor changes, tooltip clarity | Target selection system exists |
| **Ability queuing/buffering** | Queue next ability during GCD for smooth combat flow | High | Input buffer window (100-400ms typical), prevents spam | Requires timing system |
| **Damage numbers** | Visual feedback showing damage/healing amounts on targets | Medium | Floating text at target position with color coding | Already exists for auto-attack |
| **Buff/debuff icons** | Players see active effects with duration indicators | Medium | Status icon tray, tooltips on hover, timers | Status effect tracking system |
| **Can't-use-now feedback** | Why ability is unavailable (on cooldown, out of range, no target) | Low | Error messages, icon dimming, tooltip warnings | State validation |
| **Ability categorization** | Clear grouping: Offensive/Defensive/Utility helps players understand purpose | Low | Visual grouping in UI, category labels | Item/ability metadata |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes | Dependencies |
|---------|-------------------|------------|-------|--------------|
| **Item-granted abilities** | Build diversity through equipment choices instead of fixed skill trees | Medium | Abilities tied to item metadata, dynamic based on loadout | Item system already robust |
| **Multi-tier abilities** | Same ability at different power levels from different items creates meaningful upgrade paths | Medium | Ability definitions with tier/ilvl scaling parameters | Item tier system exists |
| **Dynamic action bar** | Abilities auto-populate/remove when equipping/unequipping items | Medium | Subscribe to inventory changes, auto-fill empty slots | Action bar + inventory already wired |
| **Combo indicators** | Visual hints when abilities synergize (e.g., debuff enables bonus damage) | High | Requires ability-to-ability relationship metadata | Buff system, ability metadata |
| **Reactive procs** | Abilities trigger automatically on conditions (e.g., "on hit", "when health < 20%") | High | Event-driven ability system, condition evaluation | Combat event system |
| **Ability preview animations** | Hover over ability shows ghost animation of effect range/area | High | Pre-render ability visualizations, overlay on game world | Phaser rendering system |
| **Cooldown reduction mechanics** | Stats/buffs that reduce cooldowns creates optimization gameplay | Medium | Apply haste or CDR stat to cooldown calculations | Stat system exists |
| **Global cooldown exceptions** | Some abilities "off-GCD" enabling advanced skill expression | Medium | Flag abilities as instant/off-GCD, timing system | GCD timing system |
| **Energy regeneration variance** | Different regen rates in/out of combat, or based on actions | Medium | Combat state tracking, energy tick system | Energy regen exists (Phase 38) |
| **Ability upgrade system** | Use abilities more to improve them (damage, cost, cooldown) | Very High | Per-ability usage tracking, progression curves | New progression system |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Separate PvP/PvE ability balance** | No PvP in game, unnecessary complexity | Single balance tuning for PvE |
| **Skill rotation optimizer overlays** | Makes combat feel automated, reduces decision-making | Design reactive abilities that respond to situation |
| **Macro-required combos** | Accessibility barrier, skill ceiling issue | Individual abilities are self-sufficient |
| **Animation locks > 1.5s** | Removes player agency, feels unresponsive in real-time combat | Keep animations snappy, allow movement canceling |
| **Hidden cooldown timers** | Frustrating guessing game | Always show exact remaining time |
| **Ability bloat (>20 abilities)** | Action bar clutter, choice paralysis | Cap at ~20 total abilities across all items |
| **Channeled abilities** | Problematic in multiplayer with latency, movement restriction issues | Use instant cast or short cast times instead |
| **Ground-targeted AOE** | Top-down 2D makes precise targeting difficult, slows combat pace | Use self-centered AOE or auto-target nearest enemies |
| **Cast time abilities** | Poor fit for action-oriented combat, creates lag frustration | Instant cast with cooldowns for pacing |
| **Separate skill bars/pages** | Cognitive load switching between bars, all abilities should be visible | Single 8-slot action bar (already implemented) |
| **Class-locked abilities** | No class system exists, conflicts with item-granted design | Abilities from items, faction/level gating only |
| **Complex combo chains (3+ skills)** | Multiplayer lag makes precise chains frustrating | Simple 2-skill synergies at most |
| **Mana as separate resource** | Energy already exists, two resources adds unnecessary complexity | Use energy for all abilities |
| **Ability point allocation** | No skill tree system planned, conflicts with item-granted model | Items determine abilities automatically |
| **Cooldown-sharing ability families** | Confusing which abilities lock out others | Each ability has independent cooldown |

## Feature Dependencies

### Dependency Graph

```
Energy Resource (EXISTS)
  └─> Resource Cost Display (table stakes)
  └─> Insufficient Resource Handling (table stakes)
  └─> Energy Regen Variance (differentiator)

Action Bar System (EXISTS)
  └─> Hotkey Activation (table stakes)
  └─> Cooldown Visualization (table stakes)
  └─> Dynamic Action Bar (differentiator)

Item System (EXISTS)
  └─> Item-Granted Abilities (differentiator)
  └─> Multi-Tier Abilities (differentiator)

Range Check System (EXISTS: canInteract)
  └─> Range Validation (table stakes)

Target Selection (EXISTS)
  └─> Target Requirement Clarity (table stakes)

Tooltip System (EXISTS: for items)
  └─> Ability Tooltips (table stakes)

Buff/Debuff System (NEW)
  └─> Buff/Debuff Icons (table stakes)
  └─> Combo Indicators (differentiator)
  └─> Reactive Procs (differentiator)

Ability Timing System (NEW)
  └─> Cooldown Tracking
  └─> Global Cooldown
  └─> Ability Queuing (table stakes)
  └─> GCD Exceptions (differentiator)

Stat System (EXISTS)
  └─> Cooldown Reduction Mechanics (differentiator)
```

### System Integration Points

| Existing System | Integration Needed |
|-----------------|-------------------|
| `combat.service.ts` | Add ability execution, cooldown checks, resource validation |
| `inventory.service.ts` | Extract abilities from equipped items, notify action bar |
| `statsStore.ts` | Track energy, apply stat modifiers to abilities |
| `actionBarStore.ts` | Store ability assignments, handle hotkey mapping |
| Item definitions | Add ability metadata to item schemas |
| Network events | Add `ability:use` client event, `ability:result` server event |

## MVP Recommendation

### Phase 1: Core Ability System (Foundational)
Priority order for initial implementation:

1. **Ability metadata system** - Define abilities in item data (Medium complexity)
2. **Ability tooltips** - Reuse item tooltip system with ability-specific data (Low complexity)
3. **Cooldown visualization** - Visual sweep on action bar icons (Low complexity)
4. **Resource cost display** - Show energy cost on icons (Low complexity)
5. **Range validation** - Extend existing `canInteract` checks (Medium complexity)
6. **Visual feedback on use** - Animation + sound on activation (Medium complexity)
7. **Damage numbers** - Extend existing combat damage display (Medium complexity)
8. **Can't-use-now feedback** - Error states and messaging (Low complexity)

**Why this order:** Foundation first (metadata, tooltips) → player information (costs, cooldowns) → execution (validation, feedback). Builds on existing systems maximally.

### Phase 2: Advanced Features (Polish)
Defer to second phase:

1. **Ability queuing/buffering** - Smoothness improvement (High complexity)
2. **Buff/debuff icons** - Status effect UI system (Medium complexity)
3. **Dynamic action bar** - Auto-assignment QoL (Medium complexity)
4. **Item-granted ability clarity** - Help players understand what items give what abilities

### Future Considerations (Post-MVP)
Evaluate based on player feedback:

- Combo indicators
- Reactive procs
- Cooldown reduction mechanics
- Global cooldown exceptions
- Ability upgrade system (very high complexity)

## Player Behavior Expectations

### From 2D ARPG/MMO Research

**Decision-Making Pattern:**
Players expect combat to require "lots of on-the-spot decision making" rather than mindless rotation spam. Systems typically feature 6-8 abilities in main rotation with situational abilities for tactical depth.

**Skill Expression:**
Players value both mechanical skill (timing, positioning) and strategic choice (ability selection, resource management). Best systems have abilities that are "easy to pick up but very hard to master."

**Rotation vs Reactive Preference:**
Community is divided - some prefer smooth rotations with natural flow, others want reactive gameplay responding to enemy actions. Your design (item-granted abilities, no fixed rotation) leans reactive, which suits survival MMO tone.

**Cooldown Tiers Expectation:**
- Spam abilities: 3-5 second cooldowns (main rotation)
- Tactical abilities: 10-15 second cooldowns (situational)
- Ultimate abilities: 30-120 second cooldowns (big moments)

**Keybind Expectations:**
PC MMO players expect 1-9 number keys for abilities with option for modifier keys (Shift/Ctrl/Alt). Action-heavy combat works best with 8-12 total abilities, not 20+. Your 8-slot action bar fits this perfectly.

**Visual Clarity Requirements:**
Players need at-a-glance info: what ability does, how much it costs, when it's ready, why it's unavailable. Tooltips with structured info (name, category, cost, cooldown, effect, damage) are mandatory.

**Input Responsiveness:**
Real-time combat requires "responsive controls, believable animations, and visual feedback" with minimal delay between input and action. Even slight delays "break immersion and make a game feel sluggish."

**Ability Variety Preferences:**
Players distinguish between "quantity vs complexity" - adding tons of similar abilities is worse than fewer, more impactful abilities with clear purposes. Each ability should answer "when do I use this?"

## Sources

### Game Design Patterns
- [Designing a Flexible Ability System for Games](https://medium.com/@galiullinnikolai/designing-a-flexible-ability-system-for-games-1e2ba31beee1)
- [MMORPG Design Challenge: Skill System](https://forums.mmorpg.com/discussion/461437/mmorpg-design-challenge-skill-system)
- [Common anti-patterns in MMORPG design](https://www.gamedeveloper.com/design/common-anti-patterns-in-mmorpg-design)
- [8 factors that make or break MMO combat systems](https://biobreak.wordpress.com/2016/03/23/8-factors-that-make-or-break-mmo-combat-systems/)

### Cooldown & Resource Management
- [Mastering the Art of Cooldowns and What It Means](https://plarium.com/en/glossary/cooldown/)
- [Cooldown Manipulation - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/CooldownManipulation)
- [Cooldown (Larksuite Gaming Glossary)](https://www.larksuite.com/en_us/topics/gaming-glossary/cooldown)

### Buff/Debuff Systems
- [Status effect - Wikipedia](https://en.wikipedia.org/wiki/Status_effect)
- [ModiBuff: Buff/Debuff/Modifier library](https://github.com/Chillu1/ModiBuff)

### Action Bar & UX
- [Bartender4 vs Dominos Best WoW Action Bar Addon in 2026!](https://medium.com/@debonikawow/bartender4-vs-dominos-which-wow-action-bar-addon-should-you-use-in-2026-0715287bf040)
- [Action bar - Ashes of Creation Wiki](https://ashesofcreation.wiki/Action_bar)

### Ability Targeting
- [Ranged attacks with and without area of effect](https://www.gdquest.com/library/ranged_attacks/)
- [Melee & Ranged Combat – The Indie Dev Professor](https://theindieprofessor.wordpress.com/2025/01/14/crafting-2d-games-melee-ranged-combat/)
- [The VFX Artist's Guide to Area of Effect](https://www.vfxapprentice.com/blog/area-of-effect-aoe-in-games)

### Input Systems
- [Ability Queue System](https://gascompanion.github.io/ability-queue-system/)
- [Input Buffer System in Combat Games](https://www.yuewu.dev/en/wiki/HUNHB-tvsQJ-5N0KfhyKi)
- [Input buffering (combat queueing) feels too unresponsive](https://forum.norestforthewicked.com/t/input-buffering-combat-queueing-feels-too-unresponsive-in-dynamic-situations/16313)

### Combat Responsiveness
- [Turn-Based vs. Real-Time Combat: A Developer's Perspective](https://bytetrending.com/2025/11/11/turn-based-vs-real-time-combat-a-developers-perspective/)
- [Combat Design, Mechanics and Systems for Satisfying Game Combat](https://gamedesignskills.com/game-design/combat-design/)

### Rotation vs Reactive Combat
- [Do you prefer combat rotations or reactive gameplay in your MMOs?](https://massivelyop.com/2020/10/02/the-daily-grind-do-you-prefer-combat-rotations-or-reactive-gameplay-in-your-mmos/)
- [Reactive combat in MMO's](https://forums.mmorpg.com/discussion/457551/reactive-combat-in-mmos)

### ARPG Comparisons
- [Diablo 4 vs Path of Exile 2 — Full 2026 Comparison](https://onlyfarms.gg/guides/diablo-4-vs-path-of-exile-2-which-arpg-should-you-play-in-2026-a-complete-honest-comparison/)
- [Path of Exile 2 vs Diablo 4: Which One is For You?](https://noping.com/blog/path-of-exile-2-vs-diablo-4)

### Combo Systems
- [The Design of Combos and Chains](https://www.gamedeveloper.com/design/the-design-of-combos-and-chains)
- [Marvel Rivals Ability Combos & Advanced Tech Guide (2026)](https://boosteria.org/guides/ability-combos-and-advanced-hero-techniques-in-marvel-rivals)

### Keybinding & Controls
- [Guide to Keybinding in MMOs for PVP and PVE](https://taugrim.com/2011/04/07/guide-to-strafing-movement-and-keybindings/)
- [How To: Keybind](https://www.mmo-champion.com/threads/816249-How-To-Keybind)
- [Thoughts on MMORPG Keyboard/Mouse Controls for Combat](https://forums.mmorpg.com/discussion/488758/thoughts-on-mmorpg-keyboard-mouse-controls-for-combat)

### Ability Tooltips
- [Improved tooltips for champion abilities are on the way in League of Legends](https://gameriv.com/improved-tooltips-for-champion-abilities-are-on-the-way-in-league-of-legends/)
- [League of Legends' tooltips are about to get a whole lot better](https://www.pcgamesn.com/league-of-legends/tooltip-update)

### Cast Types
- [Channeling - Wowpedia](https://wowpedia.fandom.com/wiki/Channeling)
- [Cast time - Wowpedia](https://wowpedia.fandom.com/wiki/Cast_time)
- [Clarification: Channeling, Casting and Activation](https://forums.elderscrollsonline.com/en/discussion/153896/clarification-channeling-casting-and-activation)

### Skill Trees vs Item Abilities
- [Keys to Meaningful Skill Trees](https://gdkeys.com/keys-to-meaningful-skill-trees/)
- [Upgrades, Equipment, and Skill Trees](https://www.gamedeveloper.com/design/upgrades-equipment-and-skill-trees)
- [What Goes Into Crafting Good Skill Trees In RPGs](https://www.thegamer.com/good-skill-trees-rpgs/)

### PvP/PvE Balancing
- [How would YOU balance PvP and PvE in an MMO?](https://forums.mmorpg.com/discussion/310943/how-would-you-balance-pvp-and-pve-in-an-mmo)
- [PVP Balanced - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/PVPBalanced)
- [Destiny 2's separation of PvE and PvP balancing is a good thing](https://www.windowscentral.com/destiny-2s-separation-pve-and-pvp-balancing-good-thing)
