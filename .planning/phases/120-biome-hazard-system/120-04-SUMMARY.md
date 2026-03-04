# Plan 120-04 Summary: Client HUD Hazard Indicator

**Status:** Complete
**Commits:** 51e2da7

## What Was Built

Implemented the client-side hazard HUD indicator and visual feedback system (HAZD-08). Created a Zustand store with socket event wiring for hazard:update, hazard:damage, and hazard:clear events. Built a HazardIndicator component that renders a color-coded hazard warning panel with protection percentage bar, grace period animation, Tier IV stack count display, and atmospheric screen tint overlay.

## Key Files

### Created
- `apps/web/src/store/hazardStore.ts` -- Zustand store for hazard state with module-level socket event wiring (matching shieldStore/buffStore pattern)
- `apps/web/src/ui/hud/HazardIndicator.tsx` -- HUD component: GiRadiations icon, hazard label, protection bar, stack count, grace period text, screen tint overlay
- `apps/web/src/ui/hud/HazardIndicator.css` -- Slide-in/out animations, grace period pulse, screen tint fade-in, icon pulse for unprotected state

### Modified
- `apps/web/src/network/socket.ts` -- Registered hazard:update, hazard:damage, hazard:clear in serverEvents array
- `apps/web/src/ui/hud/HUD.tsx` -- Imported and rendered HazardIndicator component

## Decisions Made
- Used GiRadiations (universal hazard icon) rather than per-type icons, matching CONTEXT.md decision for universal icon with color-coding
- Socket event wiring at module level in hazardStore.ts (same pattern as shieldStore.ts and buffStore.ts)
- Screen tint uses fixed overlay with pointer-events: none at z-index 1 (below HUD elements)
- HUD panel positioned at top: 96px, right: 16px (below safe-zone/combat indicators which are at top: 56px)
- Protection bar fill uses white color on hazard-colored background for contrast
- Background derived from hazard color with 85% opacity using hexToRgb helper
- Grace period shows pulsing opacity animation on the panel and 3-second fade-in on screen tint
- Unprotected state (protection < 100%) shows subtle glow pulse on hazard icon
- Clears hazard state on player:death event (same cleanup as shieldStore/buffStore)

## Self-Check: PASSED
- [x] HazardIndicator renders conditionally based on hazardStore.active
- [x] Color matches hazard type via server-provided color field
- [x] Protection percentage displayed as fill bar
- [x] Screen tint overlay visible at low opacity (0.08) during hazard exposure
- [x] Grace period shows entry animation (pulsing, tint fade-in)
- [x] Component hidden when active=false (safe zones, hub zones)
- [x] Socket events registered in socket.ts serverEvents array
- [x] apps/web compiles clean

---
*Plan: 120-04 | Phase: 120-biome-hazard-system*
