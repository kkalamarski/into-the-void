# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** Players can create an account, log in, and select/create characters before entering the game world.
**Current focus:** Phase 3: Character Creation

## Current Position

Phase: 3 of 3 (Character Creation)
Plan: 1 of 2 in current phase
Status: In Progress
Last activity: 2026-02-14 — Completed 03-01 (Character Creation Foundation)

Progress: [██████░░░░] 67%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 1m 42s
- Total execution time: 0.17 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-authentication-navigation | 3 | 5m 40s | 1m 53s |
| 02-character-selection | 2 | 3m 19s | 1m 40s |
| 03-character-creation | 1 | 1m 13s | 1m 13s |

**Recent Trend:**
- Last 5 plans: 01-03 (1m 6s), 02-01 (1m 15s), 02-02 (2m 4s), 03-01 (1m 13s)
- Trend: Stable velocity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: React screens (not Phaser menus) — Auth forms are standard web UI, React handles this better
- Phase 2: Visual character cards — Shows more info at a glance, feels more polished
- Phase 3: Stat allocation on creation — Gives players agency, uses existing stats schema (deferred to v2)

**From 01-01:**
- Used persist middleware with partialize to only persist token and user state, not functions
- Auto-logout on 401 responses with redirect to /login
- Placeholder route components for all screens (to be replaced in Plan 02)

**From 01-02:**
- Used RouterProvider in main.tsx instead of Phaser Game app to enable authentication flow
- Forms use native HTML5 validation (required, type=email, minLength) for basic validation
- Password confirmation validated client-side before API call
- Generic error message on login for security (Invalid email or password)

**From 01-03:**
- Used loader functions with throw redirect() pattern for route protection (React Router v7 standard)
- Accessed Zustand store in loaders via getState() (works outside React components)
- Protected routes redirect to /login, auth screens redirect to /character-select
- Extracted game mounting logic into GameContainer component for clean separation

**From 02-01:**
- Character selection state not persisted (user chooses character each session)
- Native Intl.RelativeTimeFormat instead of external date library
- CSS Grid auto-fit pattern for responsive cards without media queries

**From 02-02:**
- Faction border color as left border (4px) for subtle visual distinction
- Keyboard navigation support (Enter/Space) for accessibility
- Combined loader pattern (auth check + data fetch) in single route loader
- useLoaderData hook is React Router v7 standard pattern (not loaderData prop)

**From 03-01:**
- Accessible radio card pattern using position/opacity (not display:none) preserves screen reader access
- Lazy route loading defers CharacterCreateScreen import until navigation
- Faction selection grid: 2 columns explicit (not auto-fit) for tighter control, responsive to 1 column at 500px
- Auth handled in screen action (not route loader) via existing apiCall utility

### Pending Todos

None yet.

### Blockers/Concerns

**From Research:**
- Token refresh strategy needs backend validation — Check if NestJS auth module has refresh endpoint
- WebSocket handshake auth pattern — Verify backend game-server supports handshake.auth.token validation
- Faction system details — Confirm faction names, colors, and visual identity from backend/design

## Session Continuity

Last session: 2026-02-14
Stopped at: Completed 03-01-PLAN.md (Character Creation Foundation)
Resume file: None

**Phase 03 in Progress:** CSS foundation and routing infrastructure complete. Ready for Plan 03-02 (Character Create Screen).
