# Phase 121: Automation Tech Tree - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy automation structures (T2 extractors through T5 refineries) that passively gather and transmute resources. Structures have recurring maintenance costs consuming crafted fuel items, preventing runaway credit inflation. Client has an automation panel for viewing deployments, and a world-interaction loot window for collecting output and refueling. Structures are visible world entities that other players can loot and destroy.

</domain>

<decisions>
## Implementation Decisions

### Deployment interaction
- Deployment initiated from the automation panel HUD — click "Deploy new structure" button
- Panel triggers a **placement mode**: valid resource nodes highlight in the world, player clicks one to place
- ESC cancels placement mode (RTS-style building placement)
- **Confirmation dialog** before finalizing — shows structure name, maintenance cost, expected yield
- Deployed structures appear as **visible sprite entities** on the resource node tile — other players can see them

### Collection and refueling (loot window)
- Clicking a deployed structure in the world opens a **Minecraft-furnace-style loot window**
- Loot window shows: accumulated resources (take them), fuel slots (deposit fuel), structure status
- **World-click is the only way to collect** — the automation panel is view-only (status, fuel level, location)
- **Manual refuel via loot window** — player visits the structure and deposits crafted fuel consumables in-person
- Player must physically travel to their structures to collect and maintain them

### Automation panel (HUD)
- **Tab per tier**: separate tabs for Extractors, Beacons, Planetary Extractors, Refineries
- Each tab shows deployed structures with: status (active/depleted/husk), fuel level, location, accumulated output preview
- Panel is **view-only for resources** — no remote collect or refuel buttons
- Panel is the **deployment origin** — "Deploy" button lives here and triggers placement mode

### Structure lifecycle
- When fuel runs out, structure **stops silently** — no notification, sprite changes to inactive/depleted state
- Player discovers depletion when they visit or check the panel
- Expired/degraded structures **remain as husks** in the world — can be repaired and refueled in-place, or dismantled for partial materials
- Structures are NOT destroyed on expiry — they persist until manually removed or attacked

### PvP interaction
- Deployed structures are **visible to all players** as world entities
- Other players can **loot accumulated resources** from your structures (steal output)
- Other players can **attack and destroy** your structures (full PvP automation conflict)
- Structures show owner name when inspected

### Economy and maintenance
- Automation is a **meaningful but not overpowering** passive income supplement — encourages active play alongside it
- Maintenance cost is **crafted consumable items** (fuel cells, power cores, etc.) — NOT credits
- Fuel crafting loop: gather resources → craft fuel items → deposit in structures → receive different resources
- Maintenance cost >= 60% of hourly output value per tier (per AUTO-05)
- Balance sheet artifact required before any automation code is written (AUTO-06)

### Transmutation (T5 Refinery)
- 10 common → 1 rare (30 min), 5 rare → 1 epic (2 hr) as specified in AUTO-04
- Cross-biome transmutation at 10:1 ratio, 1 hour — exact cost ratios at Claude's discretion to maintain 60% maintenance rule

### Claude's Discretion
- Cross-biome transmutation cost ratios (must maintain >= 60% maintenance rule)
- Specific fuel item definitions and crafting recipes per tier
- Exact placement mode visual indicators (highlighting, ghost preview, etc.)
- Loot window layout and interaction details
- Structure health points and PvP damage calculations
- Husk repair costs and material recovery rates on dismantle

</decisions>

<specifics>
## Specific Ideas

- Collection interaction should feel like a **Minecraft furnace** — walk up, click, see what's accumulated, take items
- Structures as persistent world entities that other players can interact with creates emergent PvP gameplay around resource control
- The fuel crafting loop creates an intentional "gather resources to make fuel to gather different resources" economy cycle

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 121-automation-tech-tree*
*Context gathered: 2026-03-05*
