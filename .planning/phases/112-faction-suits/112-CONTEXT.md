# Phase 112: Faction Suits - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Create complete suit lines (Common through Legendary) for Verdant Dynamics, Helix Extraction, Nexus Frontiers, and Unaffiliated using generateSuitStats() — no hand-coded stats. 28 new suits total (5 main ladder + 2 off-archetype per faction). Faction identity expressed through grantedAbilities, textureKey, display names, and color. All conventions from FACTION-IDENTITY.md (Phase 109) are locked.

</domain>

<decisions>
## Implementation Decisions

### Suit Naming & Flavor
- Display names escalate in impressiveness with rarity: Common feels humble, Legendary feels grand
- Legendary suits get proper named-item names (like "Void Walker") — e.g., "The Canopy Sovereign" (Verdant), "The Crucible" (Helix). Aspirational endgame gear
- Descriptions written in each faction's voice: Verdant = scientific, Helix = industrial, Nexus = sleek/techy, Unaffiliated = subtly different from corporate factions (practical, less polished) but not overtly scrappy
- Use word banks from FACTION-IDENTITY.md for all naming

### Tier & Level Gating
- Clean 1:1 rarity-to-tier mapping: Common=L1 (T1), Rare=L11 (T2), Epic=L21 (T3), Exotic=L31 (T4), Legendary=L41 (T5)
- Off-archetype suits require slightly higher levels than main ladder: Epic off-arch=L25, Legendary off-arch=L45
- Faction-flavored base values: Helix industrial suits worth ~10% more, Unaffiliated scrap suits worth ~10% less. Verdant and Nexus at standard values

### Off-Archetype Identity
- Division-themed naming: off-archetype suit names reference their lore division (Verdant combat → "Security Division" theming, Helix recon → "Deep Survey" theming, Nexus assault → "Enforcement Division" theming, Unaffiliated hazmat → "Wasteland Reclamation" theming)
- Shifted accent color: off-archetype suits use the faction's accent color instead of primary (Verdant off-arch = #3a9a4a vs main #2a7a3a)
- Different granted abilities: off-archetype abilities come from the off-archetype section of FACTION-IDENTITY.md ability matrix, not the main ladder abilities

### Existing Suit Handling
- Keep all 22 generic suits as non-faction alternatives — available to all players regardless of faction
- Keep SUIT_NEXUS_COMBAT_FRAME_EXOTIC and SUIT_HELIX_RESEARCH_FRAME_EXOTIC as unique standalone items, separate from the new faction suit lines
- Faction suits coexist with generics in loot tables (loot table specifics are a future concern)
- No faction restriction on equipping: any player can equip any faction's suit

### Claude's Discretion
- Whether off-archetype suits are mathematically equivalent side-grades or slightly premium (generateSuitStats uses same tier/rarity budget either way)
- Exact weight values per suit
- Specific word choices from faction word banks for each rarity level
- Module slot counts per rarity (following existing 3-6 pattern)

</decisions>

<specifics>
## Specific Ideas

- Legendary suit names should feel like items players talk about — "Did you get The Crucible yet?" not "Did you get the Helix Legendary Suit?"
- Unaffiliated descriptions should feel like competent independence, not poverty — "field-modified" not "broken and taped together"
- The escalation from Common to Legendary should tell a story: scrappy beginner gear → specialized professional equipment → legendary artifact-level tech
- Off-archetype suits should feel like discovering a faction's hidden specialization, not a generic stat swap

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 112-faction-suits*
*Context gathered: 2026-03-03*
