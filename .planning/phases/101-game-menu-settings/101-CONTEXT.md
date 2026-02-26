# Phase 101: Game Menu & Settings - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Player can open a game menu overlay from within the game, adjust audio and interface settings, and leave the game (return to character selection). The menu is a React overlay on top of the running game. ESC key centralization is Phase 102's scope — this phase adds a basic ESC listener for the menu only.

</domain>

<decisions>
## Implementation Decisions

### Menu layout & navigation
- Tabbed sections: Settings tab + About tab
- Centered modal overlay (~60% screen width) with dark semi-transparent backdrop
- Match existing HUD visual style (same CSS variables, dark theme, panel styling)
- "Leave Game" button always visible (not inside a tab)

### Settings panel content
- Two grouped sections within the Settings tab: Audio + Interface
- Audio section: Master, Music, Effects, Ambient — each with horizontal slider + mute/unmute icon toggle
- Interface section: "Secondary Action Bar" toggle switch with label
- All changes apply immediately (live) — no save/apply button needed
- Volume sliders wire directly to existing audioStore setters (Phase 100)

### Leave Game flow
- Button labeled "Leave Game" (not "Logout")
- Confirmation dialog: "Are you sure you want to leave?" with Cancel / Leave buttons
- On confirm: disconnect WebSocket, navigate to character selection screen
- No data clearing — keep auth token, audio settings, all localStorage intact
- This is "return to character select", not account logout

### Open/close behavior
- Opens via HUD gear/menu button + ESC key
- Game continues running while menu is open (MMO — no pause)
- Backdrop blocks all clicks on the game behind the overlay
- Menu button placement: Claude's discretion (based on existing HUD layout)

### Claude's Discretion
- Menu button placement in HUD (top-right, top-left, wherever fits existing layout)
- Tab styling details (underline, pill, sidebar tabs)
- About tab content (version number, credits, links)
- Overlay animation (fade, slide, or instant)
- Exact confirmation dialog styling

</decisions>

<specifics>
## Specific Ideas

- The menu should feel like part of the game UI, not a separate settings app — same dark theme, same font
- "Leave Game" is deliberately softer than "Logout" — player is leaving the world, not their account
- Audio sliders should update volume in real time as the user drags (not on release)

</specifics>

<deferred>
## Deferred Ideas

- ESC key centralization (LIFO modal stack) — Phase 102
- Keybinding customization tab — future phase
- Graphics/performance settings — future phase
- Account management (password change, delete account) — future phase

</deferred>

---

*Phase: 101-game-menu-settings*
*Context gathered: 2026-02-26*
