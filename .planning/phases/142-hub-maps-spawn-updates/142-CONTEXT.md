# Phase 142: Hub Maps & Spawn Updates - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Design and implement 128x128 hand-crafted interior maps for all four faction hubs (Canopy, Ironhold, Meridian, Salvage Station), place NPCs in lore-correct rooms, add portal tiles in docking areas, fix unaffiliated spawn to Salvage Station, and update all spawn positions for the new layouts.

</domain>

<decisions>
## Implementation Decisions

### Room Selection & Layout
- 4-5 distinct rooms per hub — signature lore space + common gameplay rooms
- Each hub gets its lore flagship room (Atrium, Forge, Exchange, Cargo Bay) PLUS shared-purpose gameplay rooms (trading area, docking bay, services)
- Faction-unique layouts: Canopy organic/curved, Ironhold grid-like industrial, Meridian symmetrical corporate, Salvage asymmetric patchwork
- Wide themed corridors (3-4 tiles) with faction flavor — vine-covered for Canopy, metal grating for Ironhold, etc.
- Doors are decorative (non-blocking), not chokepoints — open flow between rooms

### Arrival & Portal Design
- Docking/arrival area positioned along the **south edge** of the 128x128 map
- Players enter from below and move north into the hub interior
- Medium-sized docking bay (~20x20 tiles) — room for portal, orientation space, clear path north
- Portal tile **integrated into a docking structure** — surrounded by decoration tiles forming a gate/archway shape, not a standalone tile in open space
- Player spawn point is a few tiles **north of the portal**, not on it — player arrives facing the hub interior, portal behind them. Prevents accidental portal re-use

### NPC Placement
- Shared core roles across all hubs (trader, guards, faction rep, vendors, service, ambient) with faction-flavored names and personality
- 12-15 NPCs per hub — current 9 functional NPCs + 3-6 ambient/flavor NPCs (workers, loiterers, faction-themed characters)
- Guards positioned at docking bay entrance (first NPCs seen) and near high-value rooms (faction rep, trading area) — 2-3 guards per hub
- Vendors (suit, tool, module) clustered together in the trading/market room — one-stop shop
- Trader and faction rep in separate dedicated rooms

### Hazards & Atmosphere
- Hubs are **safe zones** — hazard tiles exist for visual flavor but deal 0 damage (cosmetic atmospheric elements)
- Moderate decoration density — decoration tiles in room centers, along walls, corridor intersections; accent floor tiles on ~15-20% of walkable area
- Window tiles used on perimeter walls at intervals — suggests exterior views (jungle canopy, mountainside, space, junkyard)
- **Salvage Station distinctly rougher** — more hazard tiles (exposed wiring), uneven corridors, mismatched grating everywhere, fewer decorations, improvised feel. The "wrong side of the tracks" hub

### Claude's Discretion
- Exact room dimensions and positions within 128x128 grid
- Specific room-to-room corridor routing
- Number and placement of window tiles per wall section
- Ambient NPC types and exact positions (within the room assignments)
- Decoration tile placement patterns
- How to handle the archway/gate structure around portal tiles

</decisions>

<specifics>
## Specific Ideas

- Lore flagship rooms per hub: Canopy → The Atrium (central admin area), Ironhold → The Forge (command complex), Meridian → The Exchange (primary trading hub), Salvage → Cargo Bay (main gathering space)
- Canopy's arrival zone maps to "The Threshold" from lore — a clearing-like entry
- Ironhold's arrival zone maps to "Processing Bay 7" — industrial hangar feel
- Meridian's arrival zone maps to "Welcome Center Alpha" — comfortable transit lounge
- Salvage Station should feel like it was built from scavenged parts of the other three stations
- Each hub's corridors should use their faction corridor tile (canopy_corridor, ironhold_corridor, meridian_corridor, salvage_corridor) not just floor tiles

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 142-hub-maps-spawn-updates*
*Context gathered: 2026-03-18*
