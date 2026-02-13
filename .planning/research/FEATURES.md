# Feature Landscape

**Domain:** Game Authentication & Character Management Screens
**Researched:** 2026-02-13
**Confidence:** MEDIUM (based on training data - verification tools unavailable)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password registration | Standard authentication method | Low | Backend already supports JWT |
| Email/password login | Standard authentication method | Low | Backend already supports JWT |
| Password visibility toggle | UX standard for login forms | Low | Eye icon to show/hide password |
| Form validation & error messages | Prevents bad data, guides users | Low | Required fields, email format, password strength |
| Loading states during auth | User feedback for network requests | Low | Spinner/disabled button during API call |
| Character list display | See all owned characters | Low | Backend supports character listing |
| Character creation button | Entry point to create new character | Low | Navigate to creation screen |
| Character selection (click to play) | Core flow - pick character to enter game | Low | Transition from selection to game |
| Character name display | Identify characters in list | Low | Backend provides character.name |
| Character level display | Quick progression indicator | Low | Backend provides character.level |
| Character faction display | Visual identity/grouping | Medium | Backend provides 4 factions - needs icons/colors |
| Logout functionality | Exit authenticated session | Low | Clear JWT, return to landing |
| Create character form | Name + faction + stat allocation | Medium | Backend supports str/agi/end/int/per |
| Character name validation | Prevent duplicates/invalid names | Low | Required field, length limits |
| Stat point allocation system | Distribute points across stats | Medium | Backend has 5 stats - need allocation logic |
| Faction selection | Choose from 4 available factions | Low | Radio/card selection UI |
| Delete character | Remove unwanted characters | Medium | Confirmation modal + API call |
| Empty state messaging | Guide users when no characters exist | Low | "Create your first character" prompt |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Character preview cards (visual) | Rich visual selection vs plain list | Medium | User wants "visual cards" - more engaging than text list |
| Last played indicator | Shows which character recently used | Low | Backend provides lastPlayedAt timestamp |
| Character stats preview on card | See character build without entering game | Low | Display str/agi/end/int/per on selection card |
| Character health display | Shows character condition | Low | Backend provides health - visual health bar |
| Faction descriptions during creation | Helps players make informed choice | Low | Lore/playstyle hints for each faction |
| Stat allocation preview | Show how stats affect gameplay | Medium | Tooltips explaining what each stat does |
| "Remember me" option | Reduce login friction for returning players | Medium | Persistent JWT with refresh token (backend may need extension) |
| Character XP/progress bar | Visual progression indicator | Low | Backend provides xp - show progress to next level |
| Quick play (last played character) | Skip selection screen | Medium | Auto-select character with most recent lastPlayedAt |
| Password strength indicator | Helps users create secure passwords | Low | Visual feedback during registration |
| Character limit indicator | Show slots available (e.g., "2/5 characters") | Low | If backend enforces character limit per account |
| Social authentication | Google/Discord/Steam login | High | Simpler onboarding but requires OAuth integration |
| Email verification | Prevent fake accounts | Medium | Requires email service integration |
| Account recovery | Password reset flow | Medium | Requires email service + reset token system |

## Anti-Features

Features to explicitly NOT build for v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Character appearance customization | High complexity, asset-heavy, not core to MVP | Use faction-based default avatars |
| In-game item/equipment display on cards | Requires item system implementation first | Focus on core stats only |
| Character backstory/bio | Scope creep, not gameplay-critical | Simple name + faction is sufficient |
| Friend list on character selection | Premature - need core game working first | Defer to post-launch social features |
| Server/realm selection | Over-engineering for initial launch | Single server deployment for MVP |
| Character transfer between accounts | Complex edge cases, abuse potential | Not needed for launch |
| Multiple sessions (same account multiple devices) | Complicates state management significantly | Enforce single session per account |
| Character templates/presets | Optimization before validation | Let users allocate stats manually |
| Achievement/badge display on selection | Requires achievement system first | Defer to post-launch progression |
| Character rename functionality | Edge cases with validation, history tracking | Names permanent on creation for v1 |
| Advanced password requirements (2FA) | Adds friction to casual game | Basic password strength is sufficient |
| Account linking (merge accounts) | Complex data migration, edge cases | Single account per user for v1 |

## Feature Dependencies

```
Login Form → Authenticated Session → Character List
Character List → Character Selection → Enter Game
Character List → Create Character Button → Character Creation Form
Character Creation Form → Faction Selection (required)
Character Creation Form → Stat Allocation (required)
Character Creation Form → Character Name (required)
Create Character Success → Return to Character List

Email Verification → Depends on Email Service
Password Reset → Depends on Email Service + Token System
Social Auth → Depends on OAuth Provider Integration
Remember Me → Depends on Refresh Token System (backend extension)
```

## MVP Recommendation

### Must Build (Table Stakes)

**Authentication Flow:**
1. Landing page with login/register options
2. Registration form (email, password, confirm password)
3. Login form (email, password)
4. Form validation with error messages
5. Loading states during API calls
6. Password visibility toggle

**Character Selection:**
1. Character list display (empty state if no characters)
2. Visual character cards showing:
   - Character name
   - Faction (with icon/color)
   - Level
   - Last played indicator
3. "Create Character" button
4. "Select Character" interaction (click card to play)
5. Logout button

**Character Creation:**
1. Character creation form with:
   - Name input with validation
   - Faction selection (4 factions)
   - Stat point allocation (str/agi/end/int/per)
2. Submit button with validation
3. Cancel/back button
4. Success → redirect to character list

**Character Management:**
1. Delete character with confirmation modal

### Recommended Differentiators for v1

These add polish without major complexity:

1. **Character stats preview on cards** - Backend already provides data, just display it
2. **Health bar visual** - Backend provides health, simple visual enhancement
3. **XP progress bar** - Backend provides xp, shows progression
4. **Last played timestamp** - Backend provides lastPlayedAt, helps user context
5. **Faction descriptions** - Static content, helps player decision-making
6. **Stat tooltips** - Helps players understand allocation choices
7. **Password strength indicator** - Low complexity, improves security

### Defer to v1.1+

1. **Remember me** - Requires backend refresh token system
2. **Social authentication** - OAuth integration overhead
3. **Email verification** - Requires email service setup
4. **Password reset** - Requires email service + token management
5. **Character limit enforcement** - Only if backend enforces
6. **Quick play last character** - Nice-to-have optimization

## Complexity Estimates

| Complexity | Features | Development Time Est. |
|------------|----------|----------------------|
| **Low** | Form inputs, validation, basic display, logout, faction selection | 1-2 days total |
| **Medium** | Visual character cards, stat allocation UI, delete confirmation, faction icons/styling | 2-3 days total |
| **High** | Social auth, email verification, remember me (if backend extension needed) | 3-5 days each |

**Total MVP estimate:** 4-6 days for table stakes + recommended differentiators

## Implementation Notes

### Character Card Visual Hierarchy

Priority of information display:
1. Character name (primary identifier)
2. Faction (visual identity - use color coding)
3. Level (progression indicator)
4. Stats preview (build identity)
5. Last played (recency context)
6. Health bar (character state)
7. XP bar (sub-progression)

### Stat Allocation Logic

Backend expects: `str`, `agi`, `end`, `int`, `per`

Common patterns:
- **Fixed pool:** Give X points to distribute (e.g., 25 points)
- **Min/max per stat:** Prevent 0 or max dump (e.g., 1-10 per stat)
- **Respec button:** Allow redistribution before confirm

Recommended for v1: Fixed pool of 25 points, minimum 1 per stat, visual counter showing remaining points.

### Faction Implementation

Backend supports 4 factions. Need to define:
- Faction names
- Faction colors (for card styling)
- Faction icons (visual identifier)
- Faction descriptions (help text during creation)

Recommend: Simple icon + color scheme per faction. Descriptions can be 1-2 sentences about playstyle/lore.

## Sources

**Confidence Level:** MEDIUM to LOW

Research conducted using training data knowledge of game UX patterns. Unable to verify with current sources due to tool access limitations.

**What this is based on:**
- Common patterns from multiplayer RPGs (WoW, Final Fantasy XIV, Lost Ark, Path of Exile)
- Web game authentication best practices
- React form UX standards
- Existing backend API capabilities (JWT, character CRUD, faction/stat system)

**Recommendations:**
- Table stakes features are highly confident (universal across games)
- Differentiators confidence: MEDIUM (based on established patterns)
- Complexity estimates: MEDIUM (based on typical React development)

**Validation needed:**
- Current (2026) trends in game authentication UX
- Accessibility requirements for game forms
- Mobile considerations if game will support responsive design
- Specific faction/stat balance considerations from game design perspective

**Key assumption:** This is a web-based game (React/Phaser), not native app. Authentication flow assumes browser-based session management with JWT tokens.
