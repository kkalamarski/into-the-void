# Phase 2: Character Selection - Research

**Researched:** 2026-02-13
**Domain:** React Router v7 data loading, character list UI patterns, empty states
**Confidence:** HIGH

## Summary

Phase 2 implements character selection using React Router v7's loader pattern to fetch character data before rendering, displays characters as visual cards in a responsive grid, and handles empty states when users have no characters. The backend API (`GET /characters`) and database schema already exist, so this phase focuses purely on frontend implementation.

The existing codebase uses vanilla CSS with CSS custom properties (design tokens) for styling, React Router v7 with loaders, and Zustand for state management. The character selection screen should follow established patterns from Phase 1 (auth screens) while introducing new patterns for card layouts, data fetching, and list rendering.

**Primary recommendation:** Use React Router v7 loader function for data fetching, render characters in a CSS Grid card layout, implement proper loading/error/empty states, and handle navigation to game screen on character selection. Avoid external UI libraries or date formatting libraries - use native browser APIs and existing CSS patterns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Already in project |
| React Router | 7.0.0 | Routing & data loading | Already in project, provides loader pattern |
| Zustand | 4.5.0 | State management | Already in project for auth |
| TypeScript | 5.4.0 | Type safety | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native Fetch API | N/A (built-in) | HTTP requests | Already wrapped in `apiCall` utility |
| CSS Grid | N/A (native) | Card layout | Modern responsive patterns |
| Intl.RelativeTimeFormat | N/A (native) | Date formatting | Native browser API for "last played" times |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Loader pattern | useState + useEffect | Loader is more idiomatic for React Router v7, handles race conditions |
| CSS Grid | Flexbox | Grid is better for 2D card layouts, has `auto-fit` for responsive |
| Native Intl | date-fns, day.js | Native is smaller bundle, sufficient for basic relative time |
| Vanilla CSS | Tailwind, CSS-in-JS | Project already uses vanilla CSS with design tokens |

**Installation:**
No new dependencies required - all needed libraries already in package.json.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── screens/
│   └── CharacterSelectScreen.tsx    # Main screen component
├── components/
│   ├── CharacterCard.tsx            # Individual character card
│   └── EmptyCharacterState.tsx      # Empty state component
├── store/
│   ├── authStore.ts                 # Existing - has accountId
│   └── characterStore.ts            # NEW - selected character state
├── styles/
│   ├── screens.css                  # Existing - screen layout
│   └── characters.css               # NEW - character-specific styles
└── utils/
    └── dateFormat.ts                # NEW - relative time helper
```

### Pattern 1: Loader-Based Data Fetching

**What:** Use React Router v7 loader function to fetch data before component renders

**When to use:** Any route that needs data from API before rendering

**Example:**
```typescript
// Source: https://reactrouter.com/start/framework/data-loading
import type { Route } from "./+types/character-select";
import { apiCall } from '../utils/api';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const characters = await apiCall('/characters');
    return { characters };
  } catch (error) {
    throw new Response("Failed to load characters", { status: 500 });
  }
}

export default function CharacterSelectScreen({
  loaderData,
}: Route.ComponentProps) {
  const { characters } = loaderData;
  // Component has data immediately, no loading state needed
}
```

**Key Benefits:**
- Eliminates loading states in component
- Handles errors with error boundaries
- Type-safe with auto-generated types
- Prevents rendering until data available

### Pattern 2: Conditional Rendering (Loading/Error/Empty/Success)

**What:** Handle all data states with clear UI for each case

**When to use:** Components that display fetched data

**Example:**
```typescript
// Source: https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/
export default function CharacterSelectScreen({ loaderData }: Route.ComponentProps) {
  const { characters } = loaderData;

  // Empty state - no characters exist
  if (characters.length === 0) {
    return <EmptyCharacterState />;
  }

  // Success state - render characters
  return (
    <div className="character-grid">
      {characters.map(char => (
        <CharacterCard key={char.id} character={char} />
      ))}
    </div>
  );
}
```

**Note:** Loading states handled by HydrateFallback (first load) or useNavigation (subsequent navigations). Error states handled by errorElement in router config.

### Pattern 3: Responsive CSS Grid Cards

**What:** Use CSS Grid with `auto-fit` and `minmax()` for responsive card layout

**When to use:** Displaying collections of similar items (characters, inventory, etc.)

**Example:**
```css
/* Source: https://css-tricks.com/css-grid-layout-guide/ */
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
}

/* Cards automatically wrap and resize without media queries */
.character-card {
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}

.character-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
```

**Key Insight:** Single declaration creates responsive behavior - no media queries needed for basic responsiveness.

### Pattern 4: Component Composition for Empty States

**What:** Dedicated empty state components with context-appropriate messaging

**When to use:** Any list/collection that can be empty

**Example:**
```typescript
// Source: https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/
function EmptyCharacterState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">👤</div>
      <h2 className="empty-state-title">No Characters Yet</h2>
      <p className="empty-state-description">
        Create your first character to begin your adventure
      </p>
      <Link to="/character-create" className="btn-primary">
        Create Character
      </Link>
    </div>
  );
}
```

**UX Guidance:** Empty states should explain WHY empty and provide clear next action (CTA).

### Pattern 5: Navigating with Character Selection

**What:** Store selected character ID, then navigate to game

**When to use:** User selects from a list before entering different context

**Example:**
```typescript
// characterStore.ts
import { create } from 'zustand';

interface CharacterState {
  selectedCharacterId: string | null;
  selectCharacter: (id: string) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  selectedCharacterId: null,
  selectCharacter: (id) => set({ selectedCharacterId: id }),
}));

// CharacterSelectScreen.tsx
function handleCharacterClick(characterId: string) {
  selectCharacter(characterId);
  navigate('/game');
}
```

**Note:** Game route loader can access `selectedCharacterId` to load full character data.

### Anti-Patterns to Avoid

- **Fetching in useEffect:** React Router v7 loaders eliminate this pattern - use loaders instead
- **Manual loading states:** Let loaders handle loading - component receives data immediately
- **Inline styles for layout:** Project uses CSS files with design tokens - keep consistency
- **External date libraries:** Native `Intl.RelativeTimeFormat` is sufficient and already available
- **Complex media queries:** CSS Grid `auto-fit` handles most responsive cases automatically

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data fetching with loading/error states | Custom fetch wrapper with useState/useEffect | React Router v7 loader | Handles race conditions, SSR, error boundaries, type safety automatically |
| Relative time formatting | String manipulation for "X days ago" | Native `Intl.RelativeTimeFormat` | Handles pluralization, localization, edge cases |
| API authentication | Manual token injection per request | Existing `apiCall` utility | Already handles auth token, 401 redirects |
| Card grid responsiveness | Multiple media queries for breakpoints | CSS Grid `auto-fit` + `minmax()` | Single declaration, container-responsive |
| Form state management for character selection | Custom selection state | Zustand store pattern (established) | Consistent with auth store pattern |

**Key insight:** React Router v7 loaders eliminate most data-fetching complexity. The loader pattern removes ~90% of typical data-fetching code (loading states, error handling, race conditions).

## Common Pitfalls

### Pitfall 1: Mixing Loader and useEffect Data Fetching

**What goes wrong:** Adding `useEffect` to fetch data when component has a loader creates double-fetching, race conditions, and inconsistent loading states.

**Why it happens:** Developers familiar with older React patterns default to useEffect for data fetching.

**How to avoid:**
- If route needs data, use loader function
- Component receives data via `loaderData` prop - no fetching inside component
- For dependent/secondary data, use nested loaders or fetchers, not useEffect

**Warning signs:** Seeing both `loader` export and `useEffect` with fetch calls in same file.

### Pitfall 2: Not Handling Empty Character List

**What goes wrong:** Component crashes or shows broken layout when character array is empty.

**Why it happens:** Forgetting to check array length before mapping over characters.

**How to avoid:**
- Always check `characters.length === 0` before rendering grid
- Render dedicated empty state component with clear CTA
- Test with empty API response

**Warning signs:** Errors when account has zero characters, or blank screen with no guidance.

### Pitfall 3: Incorrect Relative Time Calculation

**What goes wrong:** Showing incorrect or confusing time strings like "in -3 days" or "3.2 days ago".

**Why it happens:** Manual date math without handling edge cases, time zones, or null values.

**How to avoid:**
```typescript
// Source: Native browser API
function getRelativeTime(date: string | null): string {
  if (!date) return 'Never';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const past = new Date(date);
  const diffMs = past.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) === 0) return 'Today';
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');
  if (Math.abs(diffDays) < 30) return rtf.format(Math.round(diffDays / 7), 'week');
  return rtf.format(Math.round(diffDays / 30), 'month');
}
```

**Warning signs:** Time strings look wrong, don't handle null `lastPlayedAt`, crash on invalid dates.

### Pitfall 4: Card Click vs Button Click Conflicts

**What goes wrong:** Clicking anywhere on card navigates to game, preventing future actions like delete/rename.

**Why it happens:** Making entire card clickable seems intuitive but limits extensibility.

**How to avoid:**
- Make card background clickable with `onClick` on container
- Use `e.stopPropagation()` on future action buttons
- Or: Use explicit "Play" button instead of implicit card click

**Warning signs:** Difficulty adding secondary actions to cards later.

### Pitfall 5: Not Updating lastPlayedAt When Entering Game

**What goes wrong:** "Last played" timestamp never updates after character creation.

**Why it happens:** Backend updates `lastPlayedAt` but only when requested.

**How to avoid:**
- Game route loader should call API to update `lastPlayedAt` on character entry
- Or: Backend automatically updates on successful game server connection
- Display most recent timestamp from server

**Warning signs:** All characters show same "last played" time forever.

### Pitfall 6: Styling Inconsistency with Phase 1

**What goes wrong:** Character selection screen looks different from login/register screens.

**Why it happens:** Not reusing existing design tokens and CSS patterns.

**How to avoid:**
- Import existing `screens.css` for layout consistency
- Use same design tokens from `global.css` (--color-accent, etc.)
- Follow same card structure: `.screen` > `.screen-card` pattern
- Match button styles: `.btn-primary`, `.submit-btn` classes

**Warning signs:** Different colors, spacing, or visual hierarchy than auth screens.

## Code Examples

Verified patterns from official sources and existing codebase:

### Loader Function with Error Handling
```typescript
// Source: React Router v7 docs + existing apiCall pattern
import type { Route } from "./+types/character-select";
import { apiCall } from '../utils/api';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const characters = await apiCall<Array<{
      id: string;
      name: string;
      faction: string;
      level: number;
      lastPlayedAt: string | null;
    }>>('/characters');

    return { characters };
  } catch (error) {
    // Caught by error boundary
    throw new Response("Failed to load characters", {
      status: 500,
      statusText: "Could not fetch characters"
    });
  }
}
```

### Character Card Component
```typescript
// Source: Project patterns
import React from 'react';
import '../styles/characters.css';

interface Character {
  id: string;
  name: string;
  faction: string;
  level: number;
  lastPlayedAt: string | null;
}

interface CharacterCardProps {
  character: Character;
  onSelect: (id: string) => void;
}

export function CharacterCard({ character, onSelect }: CharacterCardProps) {
  const factionColors = {
    dominion: '#7b68ee',
    frontier: '#44ff44',
    collective: '#00bfff',
    neutral: '#a0a0a0',
  };

  return (
    <div
      className="character-card"
      onClick={() => onSelect(character.id)}
      style={{ borderColor: factionColors[character.faction] || '#a0a0a0' }}
    >
      <div className="character-card-header">
        <h3 className="character-name">{character.name}</h3>
        <span className="character-level">Level {character.level}</span>
      </div>

      <div className="character-faction">
        {character.faction}
      </div>

      <div className="character-last-played">
        Last played: {formatRelativeTime(character.lastPlayedAt)}
      </div>
    </div>
  );
}
```

### Relative Time Formatting
```typescript
// Source: Native Intl.RelativeTimeFormat API
// utils/dateFormat.ts
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = past.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Today or within 24 hours
  if (Math.abs(diffDays) === 0) return 'Today';

  // Within a week
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  }

  // Within a month
  if (Math.abs(diffDays) < 30) {
    return rtf.format(Math.round(diffDays / 7), 'week');
  }

  // Months
  return rtf.format(Math.round(diffDays / 30), 'month');
}
```

### CSS Grid Card Layout
```css
/* Source: CSS Grid best practices 2026 */
/* styles/characters.css */
.character-select-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.character-card {
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}

.character-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.character-card:active {
  transform: translateY(0);
}

.character-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.character-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.character-level {
  font-size: 14px;
  color: var(--color-accent);
  font-weight: 500;
}

.character-faction {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  text-transform: capitalize;
}

.character-last-played {
  font-size: 12px;
  color: var(--color-text-secondary);
}
```

### Empty State Component
```typescript
// Source: Empty state best practices
import React from 'react';
import { Link } from 'react-router';
import '../styles/characters.css';

export function EmptyCharacterState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">👤</div>
      <h2 className="empty-state-title">No Characters Yet</h2>
      <p className="empty-state-description">
        Create your first character to begin your adventure into the void
      </p>
      <Link to="/character-create" className="btn-primary">
        Create Character
      </Link>
    </div>
  );
}
```

```css
/* styles/characters.css */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.empty-state-description {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  max-width: 400px;
}
```

### Character Store (Zustand)
```typescript
// Source: Existing authStore pattern
// store/characterStore.ts
import { create } from 'zustand';

interface CharacterState {
  selectedCharacterId: string | null;
  selectCharacter: (id: string) => void;
  clearSelection: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  selectedCharacterId: null,
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  clearSelection: () => set({ selectedCharacterId: null }),
}));
```

### Main Screen Component with All Patterns
```typescript
// Source: Combining all patterns
import React from 'react';
import type { Route } from './+types/character-select';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/authStore';
import { useCharacterStore } from '../store/characterStore';
import { CharacterCard } from '../components/CharacterCard';
import { EmptyCharacterState } from '../components/EmptyCharacterState';
import { apiCall } from '../utils/api';
import '../styles/screens.css';
import '../styles/characters.css';

// Loader - fetches data before render
export async function loader({ request }: Route.LoaderArgs) {
  try {
    const characters = await apiCall<Array<{
      id: string;
      name: string;
      faction: string;
      level: number;
      lastPlayedAt: string | null;
    }>>('/characters');

    return { characters };
  } catch (error) {
    throw new Response("Failed to load characters", { status: 500 });
  }
}

// Component - data already loaded
export default function CharacterSelectScreen({
  loaderData,
}: Route.ComponentProps) {
  const { characters } = loaderData;
  const { user, logout } = useAuthStore();
  const { selectCharacter } = useCharacterStore();
  const navigate = useNavigate();

  const handleCharacterSelect = (characterId: string) => {
    selectCharacter(characterId);
    navigate('/game');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="screen">
      <div className="character-select-container">
        <div className="screen-header">
          <div>
            <h1 className="screen-title">Select Character</h1>
            <p className="screen-subtitle">Welcome back, {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary"
          >
            Logout
          </button>
        </div>

        {characters.length === 0 ? (
          <EmptyCharacterState />
        ) : (
          <div className="character-grid">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onSelect={handleCharacterSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useEffect data fetching | React Router v7 loaders | React Router 6.4+ (2022) | Eliminates loading states, race conditions, error handling boilerplate |
| moment.js for dates | Native Intl API | 2020+ (broad support) | 67KB smaller bundle, native localization |
| Media queries for responsive grids | CSS Grid auto-fit/minmax | 2017+ (CSS Grid stable) | Single declaration, container-aware |
| Custom fetch wrappers | Native fetch with TypeScript | Always available | Simpler, better typing |
| React Query for server state | Loaders + framework mode | React Router 6.4+ | Less dependencies, integrated pattern |

**Deprecated/outdated:**
- **React Router useLoaderData() hook**: React Router v7 changed to `loaderData` prop on component - hook still works but prop is more type-safe
- **moment.js**: Deprecated and unmaintained - use native Intl or date-fns/day.js if needed
- **Class-based error boundaries for loaders**: v7 uses errorElement in route config instead

## Open Questions

1. **Faction visual identity**
   - What we know: Faction names and colors mentioned in prior decisions (dominion, frontier, collective)
   - What's unclear: Official color scheme for each faction, icons/symbols if any
   - Recommendation: Use color-coded borders on cards as shown in examples, check with design/backend for official colors. Default to subtle differentiation if no design system exists yet.

2. **Character limit enforcement**
   - What we know: Backend has `MAX_CHARACTERS_PER_ACCOUNT = 5` constant
   - What's unclear: Should UI show "5/5 characters" counter? Disable create button?
   - Recommendation: Add visual indicator showing character count (e.g., "2 / 5 Characters"). Phase 3 (character creation) will handle disabling create when limit reached.

3. **Loading state during navigation**
   - What we know: Loaders handle initial load, but what about navigating back to character select?
   - What's unclear: Should we show global spinner or is instant transition acceptable?
   - Recommendation: Use `useNavigation` hook in root layout for global pending indicator. If navigation is fast (<200ms), may not be needed.

4. **Character selection persistence**
   - What we know: Selected character ID stored in Zustand
   - What's unclear: Should selection persist across browser refreshes?
   - Recommendation: Don't persist selection - user should actively choose character each session. Game route validates character ownership before loading anyway.

## Sources

### Primary (HIGH confidence)
- React Router v7 Official Docs - Data Loading: https://reactrouter.com/start/framework/data-loading
- React Router v7 Official Docs - Pending UI: https://reactrouter.com/start/framework/pending-ui
- LogRocket - UI Best Practices for Loading/Error/Empty States: https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/
- Existing project codebase (apps/web/src/*, packages/database/src/*)
- Native browser APIs: Intl.RelativeTimeFormat (MDN)

### Secondary (MEDIUM confidence)
- CSS-Tricks - CSS Grid Layout Guide: https://css-tricks.com/css-grid-layout-guide/
- Patterns.dev - React 2026 Stack Patterns: https://www.patterns.dev/react/react-2026/
- WebSearch verified: React Router loaders documentation, CSS Grid patterns, date formatting approaches

### Tertiary (LOW confidence)
- None - all findings verified with official sources or existing code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, patterns verified in existing code
- Architecture: HIGH - React Router v7 loader pattern is official recommendation, CSS Grid is stable standard
- Pitfalls: HIGH - Based on common React Router migration issues and existing code patterns
- Date formatting: MEDIUM - Native Intl API works but not extensively used in gaming UIs, consider future i18n needs
- Faction colors: LOW - Mentioned in prior decisions but no official design system found in codebase

**Research date:** 2026-02-13
**Valid until:** 30 days (React Router v7 stable, CSS patterns stable, unlikely to change)
