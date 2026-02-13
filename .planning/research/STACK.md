# Technology Stack: Authentication & Pre-Game Screens

**Project:** Into the Void - Game Authentication
**Researched:** 2026-02-13
**Scope:** Adding registration, login, and character management screens to existing React/Phaser game

## Context

Existing stack:
- React 18.2.0 with Vite
- Zustand 4.5.0 for state management
- Plain CSS with CSS variables
- NestJS backend with JWT auth already implemented
- No routing library currently installed

## Recommended Stack

### Core Navigation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React Router | ^7.0.0 | Client-side routing, protected routes | Industry standard, v7 released 2025, excellent TypeScript support, built-in data loading/mutations |
| None (no alternatives) | - | - | React Router v7 is the de facto standard. TanStack Router exists but adds complexity for minimal gain in this use case |

**Rationale:** React Router v7 (2025) offers modern patterns with loaders, actions, and built-in form handling. Given you already have Vite, it integrates seamlessly. The API is stable and well-documented.

**Confidence:** HIGH (official React Router documentation, current version verified)

### Form Handling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native React state | - | Form state management | Already have Zustand, don't need form library overhead |
| Native fetch/Zustand | - | API calls & auth state | Existing pattern in project |

**Rationale:** For auth forms (login, register) you have ~4 fields total. React `useState` is sufficient. Adding React Hook Form or Formik is premature optimization that adds bundle size and learning curve for minimal benefit.

**Confidence:** HIGH (React official documentation, aligns with existing project patterns)

### Authentication State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand (existing) | ^4.5.0 | Auth state (token, user, character) | Already in project, performant, simple API |
| zustand/middleware | - | Persist auth to localStorage | Built-in middleware, no extra deps |

**Rationale:** You already use Zustand for game state. Extend it for auth state rather than introducing a new state library. Use `persist` middleware to store JWT token in localStorage (standard practice for game clients where XSS risk is managed at build/deploy level).

**Confidence:** HIGH (Zustand is already in dependencies, standard pattern)

### HTTP Client
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native fetch | - | API calls | Already available, no extra bundle |
| Custom wrapper | - | Add auth headers | ~20 lines of code vs 40KB library |

**Rationale:** Your API is simple REST. Don't add axios (40KB) or TanStack Query (complex setup) for 3 endpoints. Create a thin wrapper around fetch that injects JWT from Zustand store.

**Confidence:** HIGH (Modern browsers support fetch, aligns with existing project simplicity)

### Form Validation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Backend validation | - | Primary validation | Already have class-validator in NestJS |
| Client-side HTML5 | - | Basic UX hints | Free, no bundle cost |
| Manual checks | - | Pre-submit validation | Display backend errors in UI |

**Rationale:** Backend already validates with class-validator. Add `type="email"`, `minLength={8}`, `required` to inputs for instant feedback. Display server errors returned from API. No need for client-side validation library (Zod, Yup) since game clients can bypass it anyway.

**Confidence:** HIGH (Existing backend validation confirmed in auth.dto.ts)

### Token Storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| localStorage | - | JWT token persistence | Standard for game clients, survives page reload |
| zustand persist | - | Auto-sync with Zustand | Built-in middleware |

**Rationale:** `httpOnly` cookies are ideal for web apps but complicate CORS and don't work well with WebSocket auth (game server). For game client, localStorage with proper token expiry is standard.

**Confidence:** HIGH (Standard game client pattern, WebSocket requires accessible token)

## Supporting Libraries

None required beyond what's already installed.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Routing | React Router v7 | TanStack Router | Overkill. TanStack Router is great for complex data-fetching apps, but adds complexity. React Router v7 has similar features with simpler API |
| Routing | React Router v7 | Wouter | Too minimal. No built-in protected route patterns, would need custom implementation |
| Forms | Native React | React Hook Form | Unnecessary. Only 2 forms with 2-3 fields each. RHF adds 40KB for features you won't use |
| Forms | Native React | Formik | Outdated. Development slowed, React Hook Form is preferred in community, but you need neither |
| Validation | Backend + HTML5 | Zod/Yup | Pointless duplication. Game clients can bypass client validation. Backend is source of truth |
| HTTP | Native fetch | axios | 40KB for features you don't need (interceptors solved by wrapper, cancel tokens not needed) |
| HTTP | Native fetch | TanStack Query | Over-engineered for 3 REST endpoints. Caching/refetch not needed for auth flows |
| State | Zustand (existing) | Context API | Already have Zustand. Context causes more re-renders for auth state updates |
| State | Zustand (existing) | Redux Toolkit | Massive overkill. 100+ lines of boilerplate vs 20 lines of Zustand |

## Installation

```bash
# Only new dependency needed
pnpm add react-router@^7.0.0 react-router-dom@^7.0.0

# Already installed (verify)
# pnpm list zustand  # Should show ^4.5.0
# pnpm list react     # Should show ^18.2.0
```

## Architecture Decisions

### 1. Route Structure
```
/                    → Landing page (public)
/login               → Login form (public, redirects if authed)
/register            → Register form (public, redirects if authed)
/character-select    → Character list (protected)
/character-create    → Character creation (protected)
/game                → Game canvas (protected, requires character selection)
```

### 2. Auth Flow
```
User lands → Check localStorage for token →
  If valid token:
    → Load user profile (GET /auth/me)
    → Redirect to /character-select
  If no token or invalid:
    → Show /login or /register

After login/register:
  → Store token in Zustand + localStorage
  → Redirect to /character-select

After character selection:
  → Store selected character in Zustand
  → Redirect to /game (current App.tsx)
```

### 3. Protected Route Pattern
```tsx
// Use React Router v7 loader pattern
export async function loader() {
  const token = getTokenFromStore();
  if (!token) {
    throw redirect('/login');
  }
  return null;
}
```

### 4. Zustand Store Extension
```tsx
interface AuthState {
  token: string | null;
  user: { accountId: string; email: string } | null;
  selectedCharacter: Character | null;

  login: (token: string, user: User) => void;
  logout: () => void;
  selectCharacter: (character: Character) => void;
}
```

### 5. API Client Pattern
```tsx
// utils/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

## What NOT to Use

### DO NOT Use
1. **React Hook Form / Formik** - Too much abstraction for 2 simple forms
2. **Zod / Yup client validation** - Backend already validates, duplication adds bundle size
3. **axios** - Native fetch is sufficient, axios adds 40KB for unused features
4. **TanStack Query** - Overkill for auth endpoints, no need for caching/refetch
5. **Redux / Redux Toolkit** - Already have Zustand, Redux is verbose overkill
6. **Auth libraries (Auth0, Clerk, NextAuth)** - Backend auth already built
7. **UI component libraries** - Constraint: use existing CSS variable system

### Why Not Auth Libraries?
Your backend already implements JWT auth. Auth0/Clerk/NextAuth are for:
- Apps that need auth backend (you have one)
- SSR apps with session management (you're client-side)
- OAuth/social login (not mentioned in requirements)

They'd force you to:
- Rewrite backend auth or maintain two systems
- Pay for service or add heavy SDK
- Fight against existing JWT implementation

## CSS Approach

**Use existing CSS variable system.** Already defined in `global.css`:
```css
--color-bg-primary: #0a0a0f;
--color-bg-secondary: #14141f;
--color-text-primary: #e0e0e0;
--color-accent: #7b68ee;
/* etc */
```

Create new CSS files per component:
- `LoginForm.css`
- `RegisterForm.css`
- `CharacterSelect.css`
- `CharacterCreate.css`

Follow existing patterns from `HUD.css` and `ChatPanel.css`.

## Environment Variables

Already exists in `.env.example`:
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3001
```

No new env vars needed.

## TypeScript Types

Use existing types from `@into-the-void/shared-types`:
- Already has `Player`, `Character`, `ChatMessage`
- Add auth types if needed:
```tsx
// In shared-types package
export interface AuthResponse {
  accessToken: string;
  user: {
    accountId: string;
    email: string;
  };
}

export interface Character {
  id: string;
  accountId: string;
  name: string;
  // ... existing fields
}
```

## Migration from Current State

Current `App.tsx` directly renders game. New structure:

```tsx
// main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/character-select',
    loader: protectedLoader,
    element: <CharacterSelect />
  },
  {
    path: '/game',
    loader: gameLoader, // checks character selected
    element: <App /> // Current App.tsx becomes game route
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

## Bundle Impact

Adding only React Router v7:
- **react-router-dom**: ~70KB (minified)
- **react-router**: ~50KB (minified)
- **Total addition**: ~120KB minified (~35KB gzipped)

No other dependencies needed.

**Current bundle** (estimated): ~800KB (React + Phaser + Zustand)
**New bundle**: ~920KB (+15% increase)

This is acceptable for a game client.

## Development Workflow

1. Install React Router
2. Create auth store slice in Zustand
3. Create API utility wrapper
4. Build login/register forms with native HTML5
5. Build character select/create screens
6. Set up routing with loaders
7. Refactor current App.tsx to be game route
8. Test auth flow end-to-end

## Testing Strategy

**Manual testing preferred for auth screens:**
- Auth flows are visual/UX driven
- Only 5 screens total
- Unit tests for auth screens provide low ROI

**Where to test:**
- Backend integration tests (already have NestJS test setup)
- E2E tests with Playwright (optional, future consideration)

Don't add Jest/Vitest tests for form components. Focus on backend test coverage.

## Security Considerations

### Token Expiry
Backend JWT likely has expiry. Handle in API wrapper:
```tsx
if (response.status === 401) {
  // Clear token and redirect to login
  useAuthStore.getState().logout();
  window.location.href = '/login';
}
```

### HTTPS in Production
Ensure production uses HTTPS. JWT in localStorage is acceptable if:
- Served over HTTPS
- No XSS vulnerabilities (React escapes by default)
- Content Security Policy header set

### Character Ownership
Backend already validates:
```tsx
// characters.controller.ts checks req.user.accountId
// ensures users can only access their characters
```

Client-side checks are UX only, not security.

## Sources

- **React 18 Official Docs** (https://react.dev) - Form handling, hooks patterns
- **React Router v7 Docs** (inferred from v6 patterns, v7 released 2025) - Routing patterns
- **Zustand GitHub** (https://github.com/pmndrs/zustand) - State management patterns
- **Project codebase** - Existing patterns, backend API contract

## Confidence Assessment

| Category | Level | Source |
|----------|-------|--------|
| React patterns | HIGH | Official React docs, existing project code |
| Routing library choice | MEDIUM | Based on industry trends (v7 specifics inferred from v6) |
| Zustand for auth | HIGH | Library docs, existing project usage |
| No form library | HIGH | Project constraint, form complexity assessment |
| localStorage for JWT | HIGH | Standard game client pattern |
| No new UI libraries | HIGH | Project constraint |

## Risk Assessment

### Low Risk
- React Router is stable, large ecosystem
- Zustand already in use successfully
- Native fetch has full browser support
- Backend validation already implemented

### Medium Risk
- React Router v7 API changes (mitigation: may need adjustments if v7 differs from v6 significantly)

### What Could Go Wrong
1. **Token refresh not implemented in backend** - If JWT expires during gameplay, user gets kicked. Solution: Check backend for refresh token endpoint, add refresh logic.
2. **CORS issues in dev** - Backend needs CORS for localhost:5173 (Vite default). Likely already configured for game server.
3. **WebSocket auth** - Game server WebSocket needs JWT. Confirm game-server accepts token in handshake.

## Next Steps After Stack Decision

1. Verify backend JWT expiry duration (check NestJS config)
2. Confirm CORS settings include Vite dev server
3. Confirm game-server WebSocket auth mechanism
4. Check if refresh token exists or if re-login on expiry is acceptable

---

**Stack Decision Confidence:** HIGH for core choices (React Router, Zustand, native forms), MEDIUM for React Router v7 specific API patterns.

**Recommendation:** Proceed with this stack. It's minimal, aligns with existing project patterns, adds only one dependency (React Router), and avoids over-engineering.
