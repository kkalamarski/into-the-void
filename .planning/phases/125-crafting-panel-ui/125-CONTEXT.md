# Phase 125: Crafting Panel UI - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can open a crafting panel from the HUD, browse recipes by discipline, see ingredient availability, trigger crafts, and watch a progress bar count down to completion. This phase covers the client-side panel UI, Zustand store integration, and WebSocket event handling for crafting. Server-side crafting logic (Phase 122) and recipe content (Phase 123) are already implemented.

</domain>

<decisions>
## Implementation Decisions

### Panel layout and navigation
- Three-column layout: vertical discipline tabs (left) | recipe list (middle) | recipe detail pane (right)
- Discipline tabs are a vertical sidebar on the far left of the panel
- Panel uses the same HUD panel slot as Inventory, Equipment, Abilities, etc. — opening Crafting closes other panels
- Keybind: C opens the crafting panel (or clicking HUD shortcut)
- When a craft is in progress and the panel is closed, a small HUD indicator (mini progress bar/timer) shows near the HUD area — no need to keep the panel open to track progress

### Recipe card content and density
- Recipe list (middle column): compact rows with small output item icon + recipe name + craftable/locked status indicator
- Detail pane (right column): full recipe info with ingredient list showing icon + name + "have/need" count (e.g., "x2/3"), green when sufficient, red when insufficient
- Locked recipes appear greyed out in their normal list position with a small lock icon; clicking shows unlock requirement in the detail pane
- Each discipline tab shows the discipline name + current proficiency level; selecting a discipline reveals an XP progress bar below the tabs or at top of recipe list

### Crafting interaction flow
- No confirmation dialog — clicking Craft starts immediately (button already gated by ingredient checks)
- During an active craft: progress bar overlay appears in the detail pane, but the recipe list remains browsable (can view other recipes, just can't start another craft)
- On craft completion: toast notification showing crafted item and quality result; panel returns to normal state
- On craft failure (server rejection): red toast notification explaining the error reason; no ingredients consumed
- On proficiency level-up: special toast notification ("Equipment Crafting Level 5!") with any newly unlocked recipes mentioned

### Proficiency and progression display
- Proficiency level shown directly on each discipline tab
- XP progress bar visible when a discipline is selected
- Smooth fill animation on XP bar when craft awards XP
- If XP gain triggers a level-up, glow/highlight effect on the discipline tab + toast notification
- Per-discipline proficiency only — no aggregate "overall crafter level"

### Claude's Discretion
- Quality range display format in the detail pane (badges with probability, simple range text, or other)
- Exact spacing, typography, and visual styling (follow existing panel CSS patterns)
- Loading/skeleton states while fetching recipe data
- Error state handling for network issues
- Mini HUD indicator design (bar, circular, icon-based)

</decisions>

<specifics>
## Specific Ideas

- Follows existing panel patterns: `apps/web/src/ui/panels/` directory, same panel slot system
- Toast notifications should use the existing notification/toast system if one exists, or establish a pattern consistent with the game's style
- Vertical discipline tabs give a "workbench" feel — distinct from the horizontal tabs in other panels

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 125-crafting-panel-ui*
*Context gathered: 2026-03-05*
