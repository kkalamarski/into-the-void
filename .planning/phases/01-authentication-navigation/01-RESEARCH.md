# Phase 1: Authentication & Navigation - Research

**Researched:** 2026-02-13
**Domain:** React-based authentication with React Router v7, Zustand state management, and JWT token handling
**Confidence:** HIGH

## Summary

Phase 1 establishes user authentication and screen navigation for a React + Phaser multiplayer game. The architecture uses React screens for authentication flows (not Phaser menus), as form handling and validation are better suited to standard web UI patterns.

The recommended approach uses React Router v7 for routing with protected route patterns, extends the existing Zustand store for authentication state, and leverages native HTML5 forms with backend validation. Token storage uses localStorage (acceptable for game clients where XSS is managed at build/deploy level), with tokens automatically included in API requests and WebSocket authentication.

The key architectural decision is separating authentication flows (React Router screens) from game rendering (Phaser canvas), with authentication state managed in Zustand as the single source of truth accessible to both React components and game networking code.

**Primary recommendation:** Use React Router v7 with loader-based protected routes, extend existing Zustand store for auth state with persist middleware, use native forms with HTML5 validation + backend validation, store JWT in localStorage via Zustand persist, and implement smart redirects that return users to their originally requested route after login.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Router | ^7.0.0 | Client-side routing, protected routes, navigation | Industry standard, v7 (2025) offers modern data-first approach with loaders/actions, excellent TypeScript support, built-in Suspense integration |
| Zustand | ^4.5.0 (existing) | Authentication state management | Already in project, minimal API, performant, works outside React components (needed for WebSocket auth) |
| zustand/middleware | Built-in | Persist auth state to localStorage | Zero dependencies, automatic sync between store and localStorage |
| Native Fetch API | Built-in | HTTP requests to auth endpoints | No bundle cost, universal browser support, sufficient for simple REST API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| HTML5 validation | Built-in | Client-side form validation (UX only) | Email format, required fields, password length - for immediate feedback |
| CSS Variables | Existing | Styling auth screens | Already defined in project global.css, maintains consistency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Router v7 | TanStack Router | TanStack adds complexity with type-safe routing; v7 has similar features with simpler API for this use case |
| React Router v7 | Wouter | Too minimal - lacks built-in protected route patterns, would require custom implementation |
| Native forms | React Hook Form | Unnecessary - only 2 forms with 2-3 fields each, RHF adds 40KB for unused features |
| Native forms | Formik | Development slowed, community prefers RHF, but project doesn't need either |
| Backend validation | Zod/Yup client validation | Duplication - game clients can bypass client validation, backend is source of truth |
| Native fetch | axios | Adds 40KB for features not needed (interceptors solved by wrapper, no cancel token requirements) |
| Native fetch | TanStack Query | Over-engineered for 3 REST endpoints, caching/refetch not needed for auth flows |
| localStorage | httpOnly cookies | Complicates CORS, doesn't work well with WebSocket auth (game server needs accessible token) |

**Installation:**
```bash
# Only new dependency needed
pnpm add react-router@^7.0.0

# Already installed in project
# pnpm list zustand  # Should show ^4.5.0
# pnpm list react    # Should show ^18.x
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── routes/              # NEW - Route configuration
│   └── router.tsx       # createBrowserRouter config
├── screens/             # NEW - Full-screen views
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   └── CharacterSelectScreen.tsx
├── components/          # NEW - Reusable components
│   ├── ProtectedRoute.tsx
│   └── GameContainer.tsx  # Extracted from App.tsx
├── store/
│   └── authStore.ts     # NEW - Auth state slice
├── utils/               # NEW - Helpers
│   └── api.ts           # Fetch wrapper with auth headers
├── App.tsx              # MODIFIED - Simplified to RouterProvider
└── main.tsx             # UNCHANGED
```

### Pattern 1: Protected Routes with Loaders

**What:** Use React Router v7 loaders to check authentication before rendering protected routes. Throw redirects for unauthenticated access.

**When to use:** Any route requiring authentication (character selection, game screen).

**Example:**
```typescript
// Source: React Router v7 official docs + LogRocket guide
// routes/router.tsx

import { createBrowserRouter, redirect } from 'react-router';
import { useAuthStore } from '../store/authStore';

// Protected route loader
async function protectedLoader() {
  const { token } = useAuthStore.getState();

  if (!token) {
    // Unauthenticated - redirect to login
    throw redirect('/login');
  }

  // Optional: Validate token with server
  try {
    const response = await fetch('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      // Token invalid - clear and redirect
      useAuthStore.getState().logout();
      throw redirect('/login');
    }
  } catch {
    // Network error - allow offline mode or redirect
    throw redirect('/login');
  }

  return null;
}

const router = createBrowserRouter([
  { path: '/', element: <WelcomeScreen /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/register', element: <RegisterScreen /> },
  {
    path: '/character-select',
    loader: protectedLoader,
    element: <CharacterSelectScreen />
  },
  {
    path: '/game',
    loader: protectedLoader, // Could add character selection check
    element: <GameContainer />
  }
]);
```

### Pattern 2: Smart Redirect After Login

**What:** Preserve the originally requested route and redirect users there after successful authentication, instead of always redirecting to a default dashboard.

**When to use:** Login/register success handlers.

**Example:**
```typescript
// Source: Robin Wieruch React Router v7 authentication guide
// screens/LoginScreen.tsx

import { useNavigate, useLocation } from 'react-router';

function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) throw new Error('Login failed');

      const { accessToken, user } = await response.json();

      // Store in Zustand
      login(accessToken, user);

      // Smart redirect: go to originally requested route or default
      const origin = location.state?.from?.pathname || '/character-select';
      navigate(origin, { replace: true });

    } catch (error) {
      // Handle error
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

### Pattern 3: Zustand Auth Store with Persist

**What:** Extend existing Zustand store with authentication state that automatically persists to localStorage.

**When to use:** Managing auth tokens, user data, and login/logout actions.

**Example:**
```typescript
// Source: Zustand GitHub docs + Doichev Kostia auth store guide
// store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: { accountId: string; email: string } | null;

  // Actions
  login: (token: string, user: AuthState['user']) => void;
  logout: () => void;

  // Selectors (prevent unnecessary re-renders)
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: (token, user) => set({ token, user }),

      logout: () => {
        set({ token: null, user: null });
        // Additional cleanup: disconnect WebSocket, clear game state
      },

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        user: state.user
      }), // Only persist these fields
    }
  )
);

// Usage in components
function SomeComponent() {
  const { token, user } = useAuthStore(); // Re-renders when these change
  // ...
}

// Usage outside React (e.g., API utils)
const token = useAuthStore.getState().token;
```

### Pattern 4: API Wrapper with Auto-Auth Headers

**What:** Thin wrapper around fetch that automatically injects JWT token from Zustand store.

**When to use:** All API requests that need authentication.

**Example:**
```typescript
// Source: Project research STACK.md
// utils/api.ts

import { useAuthStore } from '../store/authStore';

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

  // Handle 401 Unauthorized (token expired/invalid)
  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Usage
const data = await apiCall<{ characters: Character[] }>('/characters');
```

### Pattern 5: Loading States with Async Handlers

**What:** Track loading/error states during async authentication operations for better UX.

**When to use:** Login, register, and any async form submission.

**Example:**
```typescript
// screens/LoginScreen.tsx

function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ... login logic
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      {/* form fields */}

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
```

### Pattern 6: React Router v7 Async Data Loading

**What:** Return promises directly from loaders (not using deprecated defer()), wrap in Suspense + Await for loading states.

**When to use:** Loading user data, character list on protected routes.

**Example:**
```typescript
// Source: React Router v7 Suspense documentation
// routes/router.tsx

import { Await } from 'react-router';
import { Suspense } from 'react';

async function characterSelectLoader() {
  const { token } = useAuthStore.getState();
  if (!token) throw redirect('/login');

  // Return promise directly (not await) for Suspense handling
  const charactersPromise = fetch('/characters', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());

  return { charactersPromise };
}

function CharacterSelectScreen({ loaderData }) {
  return (
    <Suspense fallback={<div>Loading characters...</div>}>
      <Await resolve={loaderData.charactersPromise}>
        {(characters) => (
          <CharacterList characters={characters} />
        )}
      </Await>
    </Suspense>
  );
}
```

### Anti-Patterns to Avoid

- **Storing auth state in component state only:** Auth state needs to be accessible across components and in non-React code (WebSocket, API utils). Use Zustand with persist middleware.

- **Connecting WebSocket before token validation:** Allows resource exhaustion attacks. Validate JWT during WebSocket handshake, not after connection established.

- **Long-lived tokens without refresh:** Either security risk (long tokens) or UX issue (frequent re-login). Implement token refresh strategy even if starting with simple long-lived tokens.

- **Client-side validation as security:** Game clients can bypass JavaScript. Backend validation is authoritative, client validation is UX only.

- **Rendering protected routes before auth check:** Flash of content before redirect. Use loaders to check auth before rendering.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token persistence across sessions | Custom localStorage read/write on mount/unmount | zustand/middleware persist | Automatic sync, handles edge cases (storage events, JSON serialization), versioning support for state migrations |
| Protected route logic | HOC wrapping each protected component | React Router loaders with redirect | Declarative, runs before render (no flash), framework-integrated, better TypeScript support |
| Form state management | Custom useState hooks for each field | Native form with FormData API | Browser handles state, validation, accessibility; less code, no re-renders on input |
| API error handling | try/catch in every component | Centralized error handling in API wrapper | Consistent UX (401 → logout), less code, single place to update |
| Token refresh scheduling | setInterval or setTimeout logic | Libraries handle this (future) | Complex edge cases: tab visibility, clock skew, race conditions between refresh and requests |

**Key insight:** Authentication flows have well-established patterns with subtle edge cases (race conditions, token expiry during requests, multi-tab sync). Use proven libraries (React Router loaders, Zustand persist) rather than reimplementing these patterns.

## Common Pitfalls

### Pitfall 1: Token Stored in localStorage Without XSS Protection
**What goes wrong:** JWT tokens in localStorage are vulnerable to XSS attacks. Any script injection can steal tokens and impersonate users.

**Why it happens:** localStorage is convenient and persists across sessions. Developers don't realize ANY JavaScript on the page can read it.

**How to avoid:**
1. For high-security apps: Use httpOnly cookies for refresh tokens + short-lived access tokens in memory
2. For game clients (acceptable tradeoff): localStorage with strict CSP headers, regular security audits, token expiry
3. Implement Content Security Policy headers to prevent script injection
4. Keep access tokens short-lived (5-15 min) even if using localStorage
5. Consider device fingerprinting or token binding for additional security

**Warning signs:** No CSP headers, long-lived tokens (>1 hour), no security audit plan

### Pitfall 2: No Token Refresh Strategy
**What goes wrong:** Either using long-lived tokens (security risk) OR forcing re-login when short-lived tokens expire (terrible UX).

**Why it happens:** Refresh token implementation is complex, developers either avoid it or implement half-heartedly.

**How to avoid:**
1. Start with reasonable token lifetime (1-2 hours for MVP)
2. Plan for dual-token system (short-lived access + long-lived refresh)
3. Background refresh before access token expires
4. Graceful fallback to re-login when refresh token expires
5. Test with short token lifetimes (5 min) during development

**Warning signs:** Token expiry > 24 hours, users kicked mid-game, no refresh endpoint

### Pitfall 3: Auth State Not Persisted Across Page Refresh
**What goes wrong:** User logs in, refreshes page, kicked back to login screen despite token existing in localStorage.

**Why it happens:** App doesn't check for existing token on initialization.

**How to avoid:**
1. Use Zustand persist middleware (automatic restore from localStorage)
2. Validate token with server on app load (optional but recommended)
3. Show loading screen during validation (don't flash login screen)
4. Handle expired token gracefully (attempt refresh or clear state)

**Warning signs:** Refresh always logs user out, no loading state on app init

### Pitfall 4: Error Messages Too Vague or Too Specific
**What goes wrong:**
- Too vague: "Login failed" (user doesn't know why)
- Too specific: "Password incorrect for user@email.com" (security risk - confirms email exists)

**Why it happens:** Either lazy error handling or overly helpful error messages.

**How to avoid:**
1. Login errors: "Invalid email or password" (don't reveal which)
2. Registration errors: Specific and helpful ("Password must be 8+ characters")
3. Network errors: "Connection failed. Check your internet connection."
4. Server errors: "Something went wrong. Please try again." + log details server-side
5. Never expose stack traces or database errors to client

**Warning signs:** Different messages for "user not found" vs "wrong password", stack traces in UI

### Pitfall 5: No Loading States During Authentication
**What goes wrong:** Submit login form → nothing happens → suddenly logged in OR error appears. User clicks multiple times, triggers rate limiting.

**Why it happens:** Forgot to track request state.

**How to avoid:**
1. Disable submit button during request (`disabled={loading}`)
2. Show spinner or loading text
3. Display progress for slow operations ("Verifying credentials...")
4. Prevent duplicate submissions
5. Timeout after 10-15 seconds with retry option

**Warning signs:** No visual feedback on submit, users report "clicking doesn't work"

### Pitfall 6: Protected Routes Flash Before Redirect
**What goes wrong:** User sees protected content briefly before redirect to login (bad UX, potential security leak).

**Why it happens:** Route renders before loader runs, or loader check happens in component useEffect.

**How to avoid:**
1. Use React Router loaders for auth checks (run before render)
2. Loader throws redirect, preventing component render
3. Don't put auth logic in component useEffect (too late)
4. Suspense fallback while loader runs (optional)

**Warning signs:** Flash of protected content, auth check in useEffect not loader

### Pitfall 7: Browser Back Button During Auth Flow Breaks State
**What goes wrong:** User on register screen → back → login screen → forward → register screen has stale data or broken state.

**Why it happens:** Form state persists across navigation, or state not reset on route change.

**How to avoid:**
1. Use proper routing (React Router with history)
2. Clear form state on route change (useEffect cleanup)
3. Don't rely on component state that doesn't reset
4. Use key prop to force remount if needed
5. Test back/forward button scenarios

**Warning signs:** Stale data after navigation, form values persist incorrectly

## Code Examples

### Complete Router Setup
```typescript
// Source: React Router v7 docs + LogRocket authentication guide
// routes/router.tsx

import { createBrowserRouter, redirect } from 'react-router';
import { useAuthStore } from '../store/authStore';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CharacterSelectScreen from '../screens/CharacterSelectScreen';
import GameContainer from '../components/GameContainer';

// Loader for protected routes
async function protectedLoader() {
  const { token } = useAuthStore.getState();
  if (!token) {
    throw redirect('/login');
  }
  return null;
}

// Loader for auth screens (redirect if already logged in)
function authScreenLoader() {
  const { token } = useAuthStore.getState();
  if (token) {
    throw redirect('/character-select');
  }
  return null;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WelcomeScreen />
  },
  {
    path: '/login',
    loader: authScreenLoader,
    element: <LoginScreen />
  },
  {
    path: '/register',
    loader: authScreenLoader,
    element: <RegisterScreen />
  },
  {
    path: '/character-select',
    loader: protectedLoader,
    element: <CharacterSelectScreen />
  },
  {
    path: '/game',
    loader: protectedLoader,
    element: <GameContainer />
  }
]);
```

### Native Form with HTML5 Validation
```typescript
// screens/LoginScreen.tsx

function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await apiCall<{ accessToken: string; user: User }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password })
        }
      );

      login(response.accessToken, response.user);
      navigate('/character-select', { replace: true });

    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>

      <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Router v6 defer() | Return promises directly from loaders | React Router v7 (2025) | Simpler API, no wrapper function needed |
| Separate react-router-dom package | Import from 'react-router' | React Router v7 (2025) | Simplified package structure |
| Context API for auth state | Lightweight stores (Zustand, Jotai) | ~2022-2023 | Better performance, less boilerplate, works outside React |
| httpOnly cookies (web apps) | localStorage acceptable for game clients | Ongoing | Game clients need token for WebSocket auth, managed XSS risk |
| Form libraries (Formik, RHF) | Native forms for simple cases | 2024+ | Less bundle size, framework features improved (FormData API) |

**Deprecated/outdated:**
- React Router defer(): v7 removed it, return promises directly from loaders
- <Navigate> inside components for protection: Use loaders instead (runs before render, no flash)
- Redux for auth state: Zustand or Context API preferred for simple state
- Client-only validation: Always duplicate server-side, client is UX only

## Open Questions

1. **Does the backend support token refresh?**
   - What we know: Backend has /auth/login, /auth/register, /auth/me endpoints
   - What's unclear: Refresh token endpoint existence, token lifetime configuration
   - Recommendation: Start with reasonable token lifetime (1-2 hours), plan for refresh in Phase 2

2. **What is the JWT token lifetime?**
   - What we know: Backend uses JWT authentication
   - What's unclear: Access token expiry time, refresh token support
   - Recommendation: Verify backend config, test with short tokens during development

3. **Should "Remember Me" be implemented?**
   - What we know: Token persists in localStorage via Zustand
   - What's unclear: User requirement for session-only vs persistent login
   - Recommendation: Default to persistent (game client pattern), add "Remember Me" checkbox in future if needed

4. **How should WebSocket authentication be timed?**
   - What we know: WebSocket needs JWT token for authentication
   - What's unclear: Connect before character selection or after?
   - Recommendation: Connect after character selection, send token in handshake (see PITFALLS.md)

## Sources

### Primary (HIGH confidence)
- [React Router v7 Authentication Guide - Robin Wieruch](https://www.robinwieruch.de/react-router-authentication/) - Protected routes, authentication patterns
- [React Router v7 Complete Guide - LogRocket](https://blog.logrocket.com/authentication-react-router-v7/) - Best practices, redirect patterns, state management
- [React Router Suspense Documentation](https://reactrouter.com/how-to/suspense) - Async data loading, loader patterns
- [Zustand Authentication Store - Doichev Kostia](https://doichevkostia.dev/blog/authentication-store-with-zustand/) - Auth store structure, persist middleware
- [JWT Storage Security Guide - Descope](https://www.descope.com/blog/post/developer-guide-jwt-storage) - localStorage security, alternatives, best practices

### Secondary (MEDIUM confidence)
- [State Management in 2026 - C# Corner](https://www.c-sharpcorner.com/article/state-management-in-react-2026-best-practices-tools-real-world-patterns/) - Zustand adoption trends
- [Protected Routes in React Router - Medium](https://medium.com/@sustiono19/how-to-create-a-protected-route-in-react-with-react-router-dom-v7-6680dae765fb) - v7 specific patterns
- [React Router v7 Guide - LogRocket](https://blog.logrocket.com/react-router-v7-guide/) - createBrowserRouter configuration
- [JWT Storage Security - WorkOS](https://workos.com/blog/secure-jwt-storage) - Cookie vs localStorage tradeoffs
- [React Form Validation Patterns - react.wiki](https://react.wiki/hooks/form-validation/) - Native form patterns

### Tertiary (LOW confidence - Project Research)
- Project codebase analysis (.planning/research/STACK.md, ARCHITECTURE.md, PITFALLS.md)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - React Router v7 official docs, Zustand official docs, verified web search results
- Architecture patterns: HIGH - Official documentation, multiple current (2025-2026) tutorial sources
- Security considerations: MEDIUM-HIGH - Official security guides, verified against multiple sources
- Code examples: HIGH - Extracted from official documentation and verified tutorials
- Token storage decision: MEDIUM - Context-specific tradeoff (game client vs web app), documented security implications

**Research date:** 2026-02-13
**Valid until:** 2026-05-13 (90 days - React Router v7 stable, patterns well-established)

**Notes:**
- React Router v7 released 2025, documentation stable and current
- Zustand patterns established, 30%+ YoY growth confirms community adoption
- localStorage for JWTs is acceptable tradeoff for game clients with managed XSS risk
- All code examples verified against official documentation or current tutorials
- No user constraints (CONTEXT.md) exist - research covers full domain
