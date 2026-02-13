# Project Research Summary

**Project:** Into the Void - Game Authentication
**Domain:** Multiplayer 2D Game Authentication & Character Management
**Researched:** 2026-02-13
**Confidence:** MEDIUM to HIGH

## Executive Summary

This project adds authentication and character management screens to an existing React/Phaser multiplayer game. The game already has a working JWT backend (NestJS) and WebSocket game server, but currently bypasses authentication and loads directly into the game. Research indicates the standard approach is to build a minimal routing layer with three screens: login/register, character selection, and the game itself, with the game instantiation gated behind successful authentication.

The recommended stack is deliberately minimal: add only React Router v7 for navigation, use existing Zustand for auth state management, and build forms with native React without libraries. This aligns with the existing project philosophy of avoiding over-engineering - the codebase already eschews UI frameworks and uses plain CSS with variables. The critical architectural decision is preventing Phaser game instantiation until after WebSocket authentication succeeds, implemented through a state-based AuthGuard component that conditionally renders screens based on authentication status.

Key security risks center around JWT token management and WebSocket authentication timing. The most critical pitfall is establishing WebSocket connections before token validation, which enables DoS attacks. Prevention requires validating tokens during the WebSocket handshake (not after connection), implementing token refresh for sessions that span hours of gameplay, and treating the server as the authoritative source for all character operations. These decisions must be made in Phase 1 as they affect the entire authentication flow and are expensive to retrofit later.

## Key Findings

### Recommended Stack

The stack research prioritizes minimalism and alignment with existing project patterns. The codebase already uses React 18.2, Zustand 4.5 for state management, and plain CSS with variables - no component libraries or heavy frameworks.

**Core technologies:**
- **React Router v7**: Client-side routing and protected routes - industry standard with v7's modern loader/action patterns, integrates seamlessly with Vite
- **Zustand (existing)**: Auth state management - already in project for game state, extend with auth token/user/character state using persist middleware
- **Native fetch + custom wrapper**: HTTP client - no axios/TanStack Query needed for 3 simple REST endpoints, ~20 line wrapper adds auth headers
- **Backend validation only**: Form validation - NestJS already has class-validator, client uses HTML5 hints (type="email", minLength, required) for UX only
- **localStorage with persist**: Token storage - standard for game clients where WebSocket needs accessible token, mitigated by HTTPS + CSP headers

**What NOT to use:** React Hook Form/Formik (overkill for 2 simple forms), Zod/Yup client validation (duplication - backend is source of truth), axios (40KB for unused features), TanStack Query (unnecessary caching for auth flows), Auth0/Clerk (backend auth already built), UI component libraries (constraint: use existing CSS system).

**Bundle impact:** Adding only React Router v7 = ~120KB minified (~35KB gzipped), increasing total bundle from ~800KB to ~920KB (+15%), acceptable for game client.

### Expected Features

Research identified 31 features across three categories, with clear complexity estimates guiding MVP scope.

**Must have (table stakes - users expect this):**
- Email/password registration and login with validation
- Password visibility toggle (standard UX)
- Loading states and error messages
- Character list display with empty state
- Character creation with name + faction selection + stat allocation (str/agi/end/int/per)
- Character selection to enter game
- Character info display: name, faction, level
- Delete character with confirmation
- Logout functionality

**Should have (competitive differentiators):**
- Visual character cards (not plain list) - user explicitly requested "visual cards"
- Last played indicator (backend provides lastPlayedAt)
- Character stats/health/XP preview on cards - backend provides data, just display it
- Faction descriptions during creation - helps informed choice
- Stat allocation tooltips - explain what each stat does
- Password strength indicator - improves security without friction

**Defer to v2+ (anti-features for MVP):**
- Character appearance customization - high complexity, asset-heavy
- Social auth (Google/Discord) - OAuth integration overhead
- Email verification - requires email service setup
- Password reset flow - requires email service + token system
- Remember me - requires backend refresh token extension
- In-game item/equipment display - needs item system first
- Friend list, achievements, character rename - scope creep

**Feature dependencies:** Login → Authenticated Session → Character List → Character Selection → Enter Game. Character creation depends on faction selection and stat allocation (both required). Email verification and password reset depend on email service. Remember me depends on refresh token system.

**MVP estimate:** Table stakes features = 3-4 days, recommended differentiators = 1-2 days, total 4-6 days.

### Architecture Approach

The architecture preserves the existing Phaser game structure while adding a pre-game authentication layer. The core pattern is conditional rendering based on Zustand store state, avoiding unnecessary router complexity for a single-page game flow.

**Major components:**

1. **AuthGuard** (new) - Orchestrates screen transitions based on auth state: no token → LoginScreen, token but no player → CharacterSelectScreen, player authenticated → GameContainer. Single source of truth for routing logic.

2. **LoginScreen / CharacterSelectScreen** (new) - Stateless screens that read/write to global Zustand store. LoginScreen calls auth API and stores token, then fetches characters. CharacterSelectScreen displays characters, on selection calls socket.authenticate() and waits for server confirmation.

3. **GameContainer** (new, extracted from App.tsx) - Manages Phaser game lifecycle. Currently App.tsx instantiates Game immediately on mount - this must move to GameContainer and only render after authentication succeeds. Owns the game canvas ref and useEffect for Game instantiation/cleanup.

4. **Zustand store extension** - Add auth state: authToken, userId, availableCharacters, selectedCharacter, plus logout() action. Use persist middleware to save token to localStorage. Existing player state remains unchanged - server populates it via WebSocket auth:success event.

5. **Socket connection timing** - Critical change: currently socket connects on import, but must only connect AFTER character selection. CharacterSelectScreen calls socket.connect() then socket.authenticate(token, characterId) in sequence. Backend validates during handshake, not post-connection.

**Data flow:** API/Socket → Zustand store → React components. Game.ts reads from store via registry but does NOT write (game events → socket handlers → store updates → React re-renders). Server is authoritative for all character operations.

**Build order:** Phase 1: Extend gameStore with auth state → Phase 2: Create auth API client → Phase 3: Build screens (parallel) → Phase 4: Build AuthGuard/GameContainer orchestration → Phase 5: Wire up App.tsx → Phase 6: Update socket connection timing.

### Critical Pitfalls

Research identified 17 pitfalls across 3 severity levels. The top 5 critical pitfalls require architectural decisions in Phase 1:

1. **WebSocket connection before token validation** - Attackers flood server with unauthenticated connections, causing DoS. Prevention: Validate JWT during WebSocket handshake (in handleConnection), reject immediately if invalid. Send token as handshake.auth.token, not in separate message after connection. Address in Phase 1 (core security pattern).

2. **No token refresh strategy** - Either long-lived tokens (security risk) or frequent re-login (terrible UX - kicked mid-game every 15 min). Prevention: Dual-token system with short-lived access token (5-15 min) and long-lived refresh token (7-30 days) in httpOnly cookie. Background refresh during gameplay. Address in Phase 1 (affects entire auth flow).

3. **Token stored in localStorage without XSS protection** - Any XSS vulnerability allows token theft and account takeover. Prevention: For game clients, localStorage is acceptable IF combined with HTTPS, CSP headers, and short token lifetime. Alternative: httpOnly cookies for refresh token, access token in memory only. Address in Phase 1 (architectural decision).

4. **Character selection state not synchronized with server** - Client-side selection without server validation enables duplicate characters, invalid stats, race conditions. Prevention: Server is source of truth for ALL character operations. Character creation = POST to server, wait for confirmation, then update UI. Character selection = send ID to server, validate ownership before game init. Address in Phase 2 (hard to retrofit).

5. **Game connection before character selection validation** - Game scene initializes before server confirms character is valid. Player appears briefly then gets kicked (confusing UX). Prevention: Sequential flow with loading screen: Character select → POST /game/join → Server validates & returns session token → Init Phaser with session token → WebSocket with token in handshake. Address in Phase 2 (affects game init sequence).

**Moderate pitfalls:** No loading states during auth (user clicks multiple times, triggers rate limit), vague/too-specific error messages (security vs UX balance), auth state not restored on page refresh, character name validation only client-side, multiple tabs not handled (both connect, state corrupted), no inactivity timeout (security risk).

**Minor pitfalls:** Password requirements too strict/weak, no token expiry warning UI, character limit not displayed, no "remember me" option, browser back button breaks state.

## Implications for Roadmap

Based on combined research, the project naturally divides into 3 phases structured around authentication flow, character management, and game integration. Dependencies dictate this order: cannot build character screens without auth foundation, cannot integrate with game without character selection working.

### Phase 1: Authentication Foundation

**Rationale:** Auth infrastructure must come first - all other screens depend on token management, store structure, and routing patterns. Critical security decisions (token storage, refresh strategy, WebSocket auth timing) made here are expensive to change later.

**Delivers:**
- Zustand store extended with auth state (authToken, userId, availableCharacters, selectedCharacter, logout)
- Auth API client wrapper (login, register, token refresh endpoints)
- LoginScreen and RegisterScreen with HTML5 validation
- AuthGuard component with conditional routing logic
- Protected route pattern for character/game screens

**Addresses (from FEATURES.md):**
- Email/password registration and login
- Form validation and error messages
- Loading states during authentication
- Password visibility toggle
- Logout functionality

**Avoids (from PITFALLS.md):**
- Pitfall 1: WebSocket auth validated during handshake, not after connection
- Pitfall 2: Token refresh strategy decided (dual-token with background refresh)
- Pitfall 3: Token storage strategy decided (localStorage with HTTPS + CSP mitigation)
- Pitfall 7: Loading states prevent duplicate form submissions
- Pitfall 8: Error message strategy balances security and UX

**Research flag:** Standard patterns - login forms, JWT auth, React state management are well-documented. Skip `/gsd:research-phase` unless unusual OAuth requirements emerge.

### Phase 2: Character Management

**Rationale:** Character selection is the bridge between authentication and game entry. Must establish server-as-source-of-truth pattern before game integration, otherwise hard to retrofit validation.

**Delivers:**
- Character API client (list, create, delete endpoints)
- CharacterSelectScreen with visual character cards
- CharacterCreateScreen with faction selection + stat allocation
- Character delete with confirmation modal
- Empty state messaging ("Create your first character")
- Server round-trip validation for all character operations

**Addresses (from FEATURES.md):**
- Character list display with name, faction, level
- Visual character cards (user requirement)
- Character creation with name + faction + stat allocation
- Character selection to enter game
- Delete character functionality
- Last played indicator, stats preview, health/XP bars (differentiators)

**Uses (from STACK.md):**
- React Router for /character-select and /character-create routes
- Zustand for character state management
- Native React forms (no form library needed)
- Existing CSS variable system for faction colors

**Implements (from ARCHITECTURE.md):**
- CharacterSelectScreen component
- CharacterCreateScreen component
- Character API client
- Server validation for character name, uniqueness, stat allocation

**Avoids (from PITFALLS.md):**
- Pitfall 4: Server validates ALL character operations, client never source of truth
- Pitfall 5: Character selection sends to server for validation BEFORE game init
- Pitfall 10: Character name validation server-side (sanitization, uniqueness, length)
- Pitfall 15: Character limit enforced and displayed ("3/5 characters")

**Research flag:** Potential need for `/gsd:research-phase` if stat allocation UI patterns are unclear. Phase includes faction selection UI - may need research on card-based selection patterns. Otherwise standard CRUD operations.

### Phase 3: Game Integration

**Rationale:** Game integration comes last because it requires working auth and character selection. The critical task is preventing Phaser instantiation until authentication succeeds and handling token refresh during gameplay.

**Delivers:**
- GameContainer component (extracted from App.tsx)
- Socket connection timing update (connect after character select)
- WebSocket authentication with character validation
- Token refresh during active gameplay
- Multiple tab detection and handling
- Inactivity timeout with "Are you still there?" modal
- Connection status indicator in game UI

**Addresses (from FEATURES.md):**
- Character selection transitions to game
- Loading state during game initialization
- (Deferred from Phase 2: quick play last character - optimization)

**Uses (from STACK.md):**
- Existing Phaser game structure unchanged
- Existing socket.ts with authenticate() method
- Zustand store for player state (server populates via auth:success)

**Implements (from ARCHITECTURE.md):**
- GameContainer lifecycle management
- App.tsx refactored to render AuthGuard only
- Socket connection timing: connect AFTER character selection, authenticate immediately
- Game instantiation gated behind player !== null check

**Avoids (from PITFALLS.md):**
- Pitfall 5: Game scene waits for server character validation before init
- Pitfall 6: Background token refresh every 2-3 min during gameplay
- Pitfall 11: Multiple tab detection disconnects secondary tabs
- Pitfall 12: Inactivity timeout after 15-30 min
- Pitfall 1: WebSocket handshake includes token (already addressed in Phase 1 architecture)

**Research flag:** Likely needs `/gsd:research-phase` for token refresh during gameplay patterns. Background refresh in Phaser game loop is non-trivial - need to research best practices for heartbeat/refresh timing without impacting frame rate. Multiple tab detection using BroadcastChannel API may need investigation.

### Phase Ordering Rationale

- **Phase 1 before 2:** Cannot build character screens without auth state store structure and API client patterns established.
- **Phase 2 before 3:** Cannot integrate game without working character selection flow and server validation patterns.
- **Security decisions in Phase 1:** Token storage, refresh strategy, and WebSocket auth timing are architectural choices that affect all subsequent phases. Changing later requires refactoring Phase 2 and 3.
- **Character validation in Phase 2:** Establishing server-as-source-of-truth pattern before game integration prevents having to retrofit validation into game initialization logic.
- **Game integration last:** Phaser lifecycle management and gameplay token refresh are the most complex unknowns, benefit from having stable auth and character foundations to build on.

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 3 (Game Integration):** Background token refresh during Phaser game loop - need to research heartbeat patterns that don't impact frame rate, investigate when to pause gameplay during refresh failures. Multiple tab detection using BroadcastChannel API patterns.

**Phases with standard patterns (skip research):**

- **Phase 1 (Authentication Foundation):** Login forms, JWT token management, React Router protected routes - well-documented with abundant examples.
- **Phase 2 (Character Management):** CRUD operations, form validation, card-based selection UI - standard React patterns. Stat allocation UI may need brief pattern research but not full research-phase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | React Router, Zustand, native fetch are verified existing technologies. No new dependencies beyond React Router. Aligns with existing project patterns. |
| Features | MEDIUM | Feature list based on training data of similar multiplayer game patterns (WoW, FFXIV, PoE). Table stakes features are universal. Differentiators are inferred from existing backend capabilities. |
| Architecture | HIGH | Component structure analyzed from existing codebase (App.tsx, Game.ts, gameStore.ts, socket.ts). Data flow patterns derived from current Zustand usage. Build order dependencies are clear. |
| Pitfalls | MEDIUM | Security pitfalls (XSS, token management, WebSocket auth) are well-documented in OWASP/OAuth specs. Game-specific pitfalls (token refresh during gameplay, multi-tab) based on training data without 2026 verification. |

**Overall confidence:** MEDIUM to HIGH

Research is strongest where it builds on existing codebase analysis (stack alignment, architecture patterns) and established security principles (JWT management, server validation). Confidence is moderate for game-specific UX patterns (feature priorities, visual card designs) and timing-sensitive security (token refresh intervals, inactivity timeouts) where 2026 best practices may have evolved.

### Gaps to Address

**Gap 1: Token refresh implementation details** - Research recommends dual-token system with background refresh during gameplay, but specific implementation in NestJS backend is unclear. Backend may already have refresh token endpoint, or may need to be built. Needs validation during Phase 1 planning.
- **How to handle:** Check backend codebase for refresh token endpoint. If missing, coordinate with backend team or plan to extend auth module. Acceptable fallback: longer access tokens (1 hour) with re-login on expiry for MVP, add refresh in v1.1.

**Gap 2: Character limit enforcement** - FEATURES.md mentions character limit (e.g., "2/5 characters") but unclear if backend enforces this or what the limit is. Affects CharacterSelectScreen UI and character creation validation.
- **How to handle:** Check backend Character entity and creation endpoint for maxCharacters validation. If missing, either add limit or remove limit indicator from UI. Not critical for MVP.

**Gap 3: Faction system details** - Backend supports 4 factions but no information on faction names, lore, or visual identity (colors, icons). Affects character creation and selection UI design.
- **How to handle:** Check backend for faction enum values. If undefined, work with game design to define faction names and visual scheme during Phase 2 planning. Can use placeholder colors (red/blue/green/yellow) for MVP.

**Gap 4: WebSocket handshake auth pattern in NestJS** - Research recommends validating token during WebSocket handshake using client.handshake.auth.token pattern. Current socket.ts has authenticate() method suggesting post-connection auth. Need to confirm backend WebSocket gateway supports handshake auth.
- **How to handle:** Review backend game-server WebSocket gateway implementation during Phase 1. If backend expects post-connection auth message, coordinate to refactor or accept current pattern with rate limiting mitigation.

**Gap 5: Background token refresh during Phaser game loop** - No clear pattern for how to integrate HTTP token refresh call into Phaser game loop without blocking rendering. Flagged for Phase 3 research.
- **How to handle:** Research during Phase 3 planning using `/gsd:research-phase` focused on "Phaser background HTTP requests" and "token refresh game loop patterns". Likely solution: Separate setInterval in React layer, not in Phaser scenes.

## Sources

### Primary (HIGH confidence)

**Codebase analysis:**
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/App.tsx` - Current game instantiation pattern
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/Game.ts` - Phaser lifecycle
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/store/gameStore.ts` - Zustand state structure
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/network/socket.ts` - WebSocket client patterns
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/ui/GameUI.tsx` - Current conditional rendering
- `package.json` - Existing dependencies (React 18.2, Zustand 4.5, Vite)

**Official documentation (inferred from training data):**
- React 18 documentation - Form handling, hooks patterns
- React Router v7 patterns - Loaders, protected routes (v7 specifics inferred from v6 evolution)
- Zustand GitHub - State management and persist middleware
- OWASP JWT Security - Token storage, validation best practices
- OAuth 2.0 RFC 6749 - Token refresh patterns

### Secondary (MEDIUM confidence)

**Training data on domain patterns:**
- Multiplayer game authentication flows (WoW, FFXIV, Lost Ark, Path of Exile character selection)
- WebSocket security patterns (handshake authentication, connection validation)
- React + Phaser integration architecture
- NestJS WebSocket gateway patterns
- Game client token management strategies

### Tertiary (LOW confidence, needs validation)

**Inferred from training data without 2026 verification:**
- React Router v7 API specifics (released 2025, post training cutoff)
- Current game UX best practices for character selection screens
- Optimal token lifetime values for game sessions
- Accessibility requirements for game authentication forms
- Mobile responsive considerations for web game

**Recommended verification sources:**
- NestJS WebSocket authentication documentation (current version)
- React Router v7 official docs (verify loader/action API)
- OWASP JWT Cheat Sheet (2026 version for updated recommendations)
- Game Developer Conference (GDC) talks on authentication UX
- Socket.io security best practices (if using that library)

---
*Research completed: 2026-02-13*
*Ready for roadmap: yes*
