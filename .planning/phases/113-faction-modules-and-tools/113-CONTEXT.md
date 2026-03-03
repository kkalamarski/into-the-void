# Phase 113: Faction Modules and Tools - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the faction gear set by adding 2 module lines and 2 tool lines per faction (Verdant, Helix, Nexus, Unaffiliated). Each line spans Common through Legendary (5 rarities). After this phase, players can equip faction-appropriate gear in all three equipment slots (suit, module, tool). All conventions from FACTION-IDENTITY.md (Phase 109) and suit patterns from Phase 112 apply.

</domain>

<decisions>
## Implementation Decisions

### Module Identity
- 2 module lines per faction with distinct roles that complement (not duplicate) suit archetypes
- Modules provide stat bonuses only — no granted abilities. Abilities remain the suit's domain
- Equal stat budget to generic modules of the same rarity — different distribution, not more power
- Module roles should complement the suit, not mirror it (e.g., Verdant hazmat suit + perception-focused bio-sensor module = well-rounded character)

### Tool Types & Faction Flavor
- 2 tool lines per faction matching the toolType values from success criteria:
  - Verdant: bio + research
  - Helix: mining + demolition
  - Nexus: research + stealth
  - Unaffiliated: scrapper identity (own distinct aesthetic, not generic multi-tools)
- Tools provide utility bonuses plus 1 faction ability at higher rarities (mix of utility + ability)
- Unaffiliated tools have their own scrapper identity — salvage tools, improvised scanners, not copies of faction tools
- No faction restriction on equipping — any player can use any faction's modules and tools (consistent with suit decision from Phase 112)

### Rarity & Tier Coverage
- Full Common through Legendary range (5 rarities) for all module and tool lines
- Level requirements match suit tier mapping: Common=L1, Rare=L11, Epic=L21, Exotic=L31, Legendary=L41
- Existing generic modules and tools kept as non-faction alternatives (consistent with Phase 112 suit decision)

### Naming & Description Style
- Same escalating name pattern as suits: humble Common → grand Legendary
- Legendary modules and tools get proper named-item treatment (like suits)
- Consistent faction voice in descriptions: Verdant=scientific, Helix=industrial, Nexus=techy, Unaffiliated=practical (subtly different, not overtly scrappy)
- Same color system as suits: primary faction color for main line, accent color for secondary line
- Uses faction word banks from FACTION-IDENTITY.md

### Claude's Discretion
- Specific module role assignments per faction (what stat emphasis each of the 2 module lines provides)
- Which faction ability each tool grants at higher rarities
- Exact item weight and base value numbers (following faction-flavored value pattern from Phase 112: Helix +10%, Unaffiliated -10%)
- Specific word choices from faction word banks for module and tool names
- Off-archetype ability selections for tools

</decisions>

<specifics>
## Specific Ideas

- Module lines should fill gaps in the suit's stat coverage — if a suit is all resilience, modules should offer perception or haste options
- Tools should feel functional — a mining tool, a bio-scanner, a stealth device — not abstract stat sticks
- The full faction set (suit + module + tool) should feel like a coherent loadout, not random items from the same color palette
- Unaffiliated scrapper tools should feel resourceful and clever, not junky

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 113-faction-modules-and-tools*
*Context gathered: 2026-03-03*
