# Roadmap: Into the Void — Auth & Character Screens

## Overview

This roadmap delivers pre-game authentication and character management screens for an existing multiplayer 2D game. The journey moves from building the authentication foundation with login/register screens and token management, through character selection and display, to character creation with faction choice. Each phase delivers a complete, verifiable capability that brings players closer to entering the game world with their chosen character.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Authentication & Navigation** - Login, register, token management, and routing foundation ✓ (2026-02-13)
- [x] **Phase 2: Character Selection** - Character list display and selection interface ✓ (2026-02-14)
- [x] **Phase 3: Character Creation** - New character creation with faction selection ✓ (2026-02-14)

## Phase Details

### Phase 1: Authentication & Navigation
**Goal**: Players can create accounts, log in, and navigate between pre-game screens
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User can register with email and password and sees validation errors for invalid input
  2. User can log in with credentials and remains logged in after browser refresh
  3. User sees loading states during authentication and clear error messages on failure
  4. User lands on welcome page and can navigate between login and register screens
  5. Authenticated user is automatically redirected to character selection screen
  6. Unauthenticated user cannot access character selection or game screens
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Auth store, API wrapper, and router setup (foundation)
- [x] 01-02-PLAN.md — Welcome, Login, and Register screens
- [x] 01-03-PLAN.md — Protected routes, App refactor, and verification

### Phase 2: Character Selection
**Goal**: Players can view their characters and select one to enter the game
**Depends on**: Phase 1
**Requirements**: CHAR-01, CHAR-02, CHAR-03, CHAR-04
**Success Criteria** (what must be TRUE):
  1. User sees a list of their characters displayed as visual cards with name, faction, level, and last played
  2. User can click a character card to enter the game with that character
  3. User sees an empty state with "Create Character" prompt when they have no characters
  4. Character data is fetched from the server and displayed accurately
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Character store, date formatting utility, and CSS styles (foundation)
- [x] 02-02-PLAN.md — CharacterCard, EmptyCharacterState, CharacterSelectScreen with loader

### Phase 3: Character Creation
**Goal**: Players can create new characters with name and faction selection
**Depends on**: Phase 2
**Requirements**: CHAR-05, CHAR-06, CHAR-07, CHAR-08
**Success Criteria** (what must be TRUE):
  1. User can create a character by providing a name and selecting a faction
  2. User sees validation errors for invalid character names (too short, taken, invalid characters)
  3. User can choose from 4 factions (verdant, helix, nexus, neutral) during creation
  4. User is redirected to character selection screen after successful creation and sees their new character
**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Faction selection CSS styles and character-create route setup
- [x] 03-02-PLAN.md — CharacterCreateScreen with action pattern, form, validation, and verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Authentication & Navigation | 3/3 | ✓ Complete | 2026-02-13 |
| 2. Character Selection | 2/2 | ✓ Complete | 2026-02-14 |
| 3. Character Creation | 2/2 | ✓ Complete | 2026-02-14 |
