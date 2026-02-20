---
phase: 57-buff-system
plan: "03"
subsystem: combat-ui
tags: [buff-system, ui, zustand, socket-events, client]
dependency_graph:
  requires:
    - 57-01 (server-side buff state)
    - shared-types buff events
  provides:
    - buffStore for client-side buff state
    - BuffBar UI component
    - socket event handlers for buff sync
  affects:
    - HUD layout (adds BuffBar after XP bar)
    - client state management (new buffStore)
tech_stack:
  added:
    - buffStore (Zustand)
    - BuffBar component (React + CSS)
  patterns:
    - Module-level socket event wiring (matches abilityStore pattern)
    - Buff icon with duration countdown (100ms refresh)
    - Tooltip on hover for buff details
    - Expiring animation for buffs <3s remaining
key_files:
  created:
    - apps/web/src/store/buffStore.ts
    - apps/web/src/ui/hud/BuffBar.tsx
    - apps/web/src/ui/hud/BuffBar.css
  modified:
    - apps/web/src/network/socket.ts
    - apps/web/src/ui/hud/HUD.tsx
decisions:
  - decision: "Follow abilityStore pattern for socket event wiring"
    rationale: "Consistency with existing codebase - wire socket events at module level in store file"
    alternatives: ["Wire in socket.ts with specific handlers", "Wire in component useEffect"]
  - decision: "100ms interval for duration countdown"
    rationale: "Balance between smooth countdown and performance (10 updates/second)"
    alternatives: ["1000ms (jumpy)", "50ms (higher CPU)"]
  - decision: "Expiring animation threshold at 3 seconds"
    rationale: "Gives player enough warning to react before buff expires"
    alternatives: ["5 seconds (too early)", "1 second (too late)"]
  - decision: "Buff icons display hex color from server"
    rationale: "Server controls visual identity, client renders it directly"
    alternatives: ["Client-side color mapping", "Ability-specific sprites"]
metrics:
  duration: 167s
  tasks_completed: 3
  files_created: 3
  files_modified: 2
  commits: 3
  completed_at: 2026-02-20T19:08:43Z
---

# Phase 57 Plan 03: Client-Side Buff UI Summary

**One-liner:** Zustand buffStore with socket-synced buff icons showing duration countdown and stat tooltips in HUD

## What Was Built

Created client-side buff display system with real-time duration countdown and visual feedback:

1. **buffStore (Zustand)** - Client buff state with Map<string, ClientBuff> storage
2. **Socket Event Handlers** - buff:apply, buff:expire, player:death listeners updating store
3. **BuffBar Component** - Visual buff icons with duration countdown and hover tooltips
4. **HUD Integration** - BuffBar positioned after XP bar in top-left HUD area

## Architecture

```
Server buff:apply event
  ↓
socket.ts (generic dispatch)
  ↓
buffStore.ts (gameSocket.on listeners)
  ↓
useBuffStore.addBuff() → Map<buffId, ClientBuff>
  ↓
BuffBar.tsx (useBuffStore subscriber)
  ↓
BuffIcon components (100ms interval refresh)
  ↓
Visual: colored icon + duration + tooltip
```

**Key Flow:**
- Server emits `buff:apply` with buffId, displayName, stat, amount, expiresAt, iconColor
- buffStore adds ClientBuff to Map
- BuffBar subscribes to store, renders BuffIcon for each active buff
- BuffIcon updates remaining time every 100ms, shows expiring animation <3s
- Tooltip appears on hover with ability name and stat modification
- Server emits `buff:expire` → buffStore removes buff → BuffIcon unmounts
- Player death clears all buffs

## Implementation Details

### buffStore Pattern

Follows abilityStore architecture:
- Map-based state (not array) for O(1) removal by buffId
- Module-level socket.on() wiring (not in component useEffect)
- Immutable updates via Zustand set()
- getBuffs() converts Map to array for rendering

### BuffIcon Component

- **Duration Countdown:** useEffect with 100ms interval, calculates remaining ms
- **Expiring State:** `seconds <= 3 && seconds > 0` triggers buff-pulse animation
- **Color Display:** Hex color from server converted to CSS `#RRGGBB`
- **Tooltip:** Conditional render on hover with displayName + stat + amount
- **Stat Formatting:** Capitalize first letter, prefix + for positive values

### CSS Styling

- **Layout:** Flexbox row with wrap, max-width 200px (fits ~6 buffs per row)
- **Icons:** 32x32px with 4px gap, border color from CSS var
- **Animation:** buff-pulse keyframes oscillate opacity 1.0 ↔ 0.6, border color ↔ red
- **Tooltip:** Positioned above icon, black background with border, green/red stat color
- **Hover:** Scale(1.1) transform with z-index 10 for layering

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All success criteria met:

- [x] buffStore created with addBuff, removeBuff, getBuffs, clearBuffs methods
- [x] Socket listeners update buffStore on buff:apply and buff:expire events
- [x] BuffBar component renders active buffs as colored icons
- [x] Each buff icon shows duration countdown (seconds remaining)
- [x] Buff icons pulse/animate when duration < 3 seconds (expiring state)
- [x] Hovering buff icon shows tooltip with displayName, stat, and amount
- [x] BuffBar integrated into HUD after XP bar
- [x] Multiple buffs display in a horizontal row (max-width with wrap)
- [x] All builds pass

**Build Output:**
```
✓ 267 modules transformed
✓ built in 3.29s
Successfully ran target build for project web
```

## Task Breakdown

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create buffStore with Zustand | 02d4360 | apps/web/src/store/buffStore.ts |
| 2 | Wire socket listeners for buff events | 0f34897 | apps/web/src/network/socket.ts, apps/web/src/store/buffStore.ts |
| 3 | Create BuffBar component with icons and duration | 4418d91 | apps/web/src/ui/hud/BuffBar.tsx, BuffBar.css, HUD.tsx |

## Testing Notes

**Manual testing required:**
1. Equip ability that grants buffs (e.g., suit with toughness buff)
2. Use ability, verify buff icon appears after XP bar
3. Check icon color matches server iconColor
4. Hover icon, verify tooltip shows ability name, stat, amount
5. Wait for <3s remaining, verify expiring animation (pulse)
6. Wait for expiration, verify icon disappears
7. Apply multiple buffs, verify horizontal layout with wrap
8. Die, verify all buffs clear immediately

**Edge Cases to Test:**
- Buff refresh (same abilityId+stat) - duration should extend (server behavior)
- Max 15 buffs - oldest should be evicted FIFO (server behavior)
- Negative amounts (debuffs) - tooltip stat should be red
- Very short duration (<1s) - countdown should show 0s before removal

## Integration Points

**Upstream Dependencies:**
- Server buff:apply events (from 57-01 BuffService)
- Server buff:expire events (from 57-01 tick interval)
- shared-types ServerEvents interface (must include buff:apply, buff:expire)

**Downstream Consumers:**
- None yet - purely display system
- Future: buff click to cancel (if server supports dispel)
- Future: buff stacking visualization (if server changes to allow)

## Performance Considerations

**Buff Icon Refresh:**
- 100ms interval per active buff icon
- With 15 buffs max = 150 updates/second worst case
- Each update: Date.now() call + setState (minimal overhead)
- No DOM re-layout (only text content change for "Xs")

**Memory:**
- Map<buffId, ClientBuff> with max 15 entries
- ClientBuff: ~200 bytes per entry (strings + numbers)
- Total: ~3KB max (negligible)

**Optimizations Applied:**
- Map instead of array (O(1) removal)
- getBuffs() memoization via Zustand selector
- Tooltip conditional render (not hidden via CSS)
- Animation via CSS keyframes (GPU-accelerated)

## Next Steps

**Immediate (in this phase):**
- None - plan complete, ready for integration testing

**Future Enhancements (out of scope):**
- Buff icon sprites (instead of solid colors)
- Buff sorting by duration or importance
- Audio cue on buff apply/expire
- Buff groups/categories (offensive, defensive, utility)
- Dispel interaction (click to cancel buff if server supports)

## Self-Check

Verifying all created files exist:

**Results:**
- FOUND: buffStore.ts
- FOUND: BuffBar.tsx
- FOUND: BuffBar.css
- FOUND: commit 02d4360
- FOUND: commit 0f34897
- FOUND: commit 4418d91

## Self-Check: PASSED

All files created and all commits exist.
