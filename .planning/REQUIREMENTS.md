# Requirements: Into the Void — Auth & Character Screens

**Defined:** 2026-02-13
**Core Value:** Players can create an account, log in, and select/create characters before entering the game world.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: User can register with email, password, and password confirmation
- [ ] **AUTH-03**: User session persists across browser refresh (token stored)
- [ ] **AUTH-04**: User sees validation errors when login/register fails
- [ ] **AUTH-05**: User sees loading state during authentication

### Character Selection

- [ ] **CHAR-01**: User sees list of their characters after login
- [ ] **CHAR-02**: Character cards display name, faction, level, and last played
- [ ] **CHAR-03**: User can click a character to enter the game
- [ ] **CHAR-04**: User sees empty state with "Create Character" prompt when no characters exist

### Character Creation

- [x] **CHAR-05**: User can create a character with a name
- [x] **CHAR-06**: User can select a faction (verdant, helix, nexus, neutral)
- [x] **CHAR-07**: User sees validation errors for invalid character names
- [x] **CHAR-08**: User is redirected to character selection after successful creation

### Navigation

- [ ] **NAV-01**: User lands on welcome page with Login/Register options
- [ ] **NAV-02**: User can navigate between login and register screens
- [ ] **NAV-03**: Authenticated user is redirected to character selection
- [ ] **NAV-04**: Unauthenticated user cannot access character selection or game

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Character Creation Enhancements

- **CHAR-09**: User can allocate starting stat points during character creation
- **CHAR-10**: User sees faction descriptions and lore during selection

### Authentication Enhancements

- **AUTH-06**: User sees password strength indicator during registration
- **AUTH-07**: User can choose "Remember me" for longer sessions
- **AUTH-08**: User can log out from character selection screen

### Character Management

- **CHAR-11**: User can delete characters from selection screen
- **CHAR-12**: User sees character count limit (e.g., "3/5 characters")

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| OAuth/social login | Email/password sufficient for v1, requires additional backend work |
| Email verification | Registration works immediately, verification adds complexity |
| Password reset flow | Backend endpoint exists but UI deferred to v2 |
| Avatar/appearance customization | Characters don't have visual customization yet |
| Remember me toggle | Basic token persistence is enough for v1 |
| Character transfer between accounts | Not needed |
| Multiple sessions/tabs sync | Complex, defer to later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| NAV-03 | Phase 1 | Pending |
| NAV-04 | Phase 1 | Pending |
| CHAR-01 | Phase 2 | Pending |
| CHAR-02 | Phase 2 | Pending |
| CHAR-03 | Phase 2 | Pending |
| CHAR-04 | Phase 2 | Pending |
| CHAR-05 | Phase 3 | Pending |
| CHAR-06 | Phase 3 | Pending |
| CHAR-07 | Phase 3 | Pending |
| CHAR-08 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after roadmap creation*
