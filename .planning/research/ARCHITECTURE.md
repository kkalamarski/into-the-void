# Architecture Patterns: Game Authentication Flows

**Domain:** Multiplayer 2D game authentication and character management
**Researched:** 2026-02-13
**Confidence:** MEDIUM (based on existing codebase analysis + game architecture patterns from training data)

## Current Architecture

### Existing Flow
```
main.tsx
  └─> App.tsx (useEffect immediately creates Game instance)
       ├─> Game.ts → BootScene → PreloadScene → WorldScene
       └─> GameUI (overlay, currently has placeholder auth UI)
```

**Problem:** Game instantiates immediately on mount. No gate for authentication.

### Existing Infrastructure
- **State management:** Zustand store (`gameStore.ts`)
  - `player: Player | null` (already exists)
  - `connectionState: ConnectionState` (already exists)
  - `game: Game | null` (already exists)
- **Network:** WebSocket client (`socket.ts`)
  - `authenticate(token: string, characterId: string)` method exists
  - Connection state tracking exists
- **UI:** GameUI component
  - Already conditionally renders based on `player` state
  - Placeholder "Press any key to continue" exists

## Recommended Architecture

### Component Hierarchy

```
main.tsx
  └─> App.tsx (routing/orchestration layer)
       ├─> <AuthGuard> (new)
       │    ├─> LoginScreen (new)
       │    ├─> CharacterSelectScreen (new)
       │    └─> GameContainer (new, wraps existing Game instantiation)
       │         ├─> Game.ts → BootScene → PreloadScene → WorldScene
       │         └─> GameUI (overlay)
       └─> (optional) <ErrorBoundary>
```

### Component Boundaries

| Component | Responsibility | State Dependencies | Outputs |
|-----------|---------------|-------------------|---------|
| **App.tsx** | Top-level orchestration, routing | None directly | Renders current screen based on auth state |
| **AuthGuard** | Screen routing based on auth state | `player`, `connectionState` from store | Renders LoginScreen, CharacterSelectScreen, or GameContainer |
| **LoginScreen** | Collect credentials, call auth API | None (local form state) | Calls auth API, stores token in store |
| **CharacterSelectScreen** | Display characters, handle selection | `availableCharacters`, `authToken` from store | Calls `socket.authenticate()`, updates `selectedCharacter` |
| **GameContainer** | Phaser game lifecycle management | `player`, `connectionState` from store | Instantiates/destroys Game, renders GameUI |
| **Game.ts** | Phaser game instance | None (receives config) | Manages Phaser scenes |
| **GameUI** | In-game HUD/panels overlay | `player`, `showChat`, etc. from store | Renders HUD, ChatPanel, etc. |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User lands on app                                            │
│    └─> App.tsx renders <AuthGuard>                             │
│        └─> AuthGuard checks store: player === null             │
│            └─> Renders <LoginScreen>                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. User enters credentials                                      │
│    └─> LoginScreen submits to auth API                         │
│        └─> API returns { token, userId }                       │
│            └─> Store token + userId in gameStore               │
│                └─> Fetch user's characters from API            │
│                    └─> Store in gameStore.availableCharacters  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. AuthGuard detects authToken exists, player still null       │
│    └─> Renders <CharacterSelectScreen>                         │
│        └─> Displays gameStore.availableCharacters              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. User selects character                                       │
│    └─> CharacterSelectScreen calls:                            │
│        gameStore.setSelectedCharacter(character)                │
│        gameSocket.connect(SERVER_URL)                           │
│        gameSocket.authenticate(token, characterId)              │
│    └─> Socket emits 'auth' event to server                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Server validates, responds with auth:success                │
│    └─> socket.ts handler:                                      │
│        setConnectionState('authenticated')                      │
│        gameStore.setPlayer(playerData)                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. AuthGuard detects player !== null                           │
│    └─> Renders <GameContainer>                                 │
│        └─> GameContainer instantiates Game                     │
│            └─> BootScene → PreloadScene → WorldScene           │
│        └─> Renders <GameUI> overlay                            │
└─────────────────────────────────────────────────────────────────┘
```

### State Flow Direction

**Single Source of Truth:** Zustand `gameStore`

```
API/Socket → gameStore → React Components
                 │
                 └─> Game.ts (read-only access via registry)
```

**Critical:** Game does NOT update store directly. Game emits events → socket handlers update store → React re-renders.

### Routing Strategy

**Option A: Conditional Rendering (Recommended for this project)**
- No router library needed
- AuthGuard component uses conditional logic based on store state
- Simpler, fewer dependencies
- Already partially implemented (GameUI conditionally renders)

```tsx
// Pseudocode
function AuthGuard() {
  const { authToken, player, connectionState } = useGameStore();

  if (!authToken) return <LoginScreen />;
  if (!player) return <CharacterSelectScreen />;
  if (connectionState !== 'authenticated') return <ConnectingOverlay />;
  return <GameContainer />;
}
```

**Option B: React Router**
- More explicit routing
- URL-based navigation (/login, /character-select, /game)
- Useful if you want shareable URLs or browser navigation
- Overkill for single-page game flow

**Recommendation:** Option A. Games typically don't need URL routing for auth flow.

## Detailed Component Specifications

### AuthGuard Component

**File:** `apps/web/src/components/AuthGuard.tsx` (new)

**Purpose:** Orchestrate screen transitions based on auth state

**Logic:**
```typescript
const { authToken, player, connectionState } = useGameStore();

// Decision tree
if (!authToken) return <LoginScreen />;
if (!player) return <CharacterSelectScreen />;
if (connectionState === 'connecting' || connectionState === 'connected') {
  return <ConnectingOverlay />;
}
if (connectionState === 'authenticated') return <GameContainer />;
if (connectionState === 'error') return <ConnectionErrorScreen />;
```

**State dependencies:**
- Read: `authToken`, `player`, `connectionState`
- Write: None (children update store)

### LoginScreen Component

**File:** `apps/web/src/screens/LoginScreen.tsx` (new)

**Purpose:** Collect credentials, authenticate with API

**API Call:**
```typescript
POST /api/auth/login
Body: { username, password }
Response: { token, userId }
```

**Actions:**
1. Form submission → call auth API
2. On success: `gameStore.setAuthToken(token)`, `gameStore.setUserId(userId)`
3. Fetch characters: `GET /api/users/:userId/characters`
4. Store: `gameStore.setAvailableCharacters(characters)`

**State dependencies:**
- Read: None (local form state only)
- Write: `authToken`, `userId`, `availableCharacters`

### CharacterSelectScreen Component

**File:** `apps/web/src/screens/CharacterSelectScreen.tsx` (new)

**Purpose:** Display user's characters, handle selection

**Actions:**
1. Display `gameStore.availableCharacters`
2. On character click:
   - `gameStore.setSelectedCharacter(character)`
   - `gameSocket.connect(GAME_SERVER_URL)`
   - `gameSocket.authenticate(authToken, character.id)`
3. Wait for socket `auth:success` event (handled by socket.ts)

**State dependencies:**
- Read: `availableCharacters`, `authToken`
- Write: `selectedCharacter` (triggers socket auth)

### GameContainer Component

**File:** `apps/web/src/components/GameContainer.tsx` (new)

**Purpose:** Manage Phaser game lifecycle (extracted from current App.tsx)

**Current code to move here:**
```tsx
// From App.tsx lines 7-24
const gameContainerRef = useRef<HTMLDivElement>(null);
const gameRef = useRef<Game | null>(null);

useEffect(() => {
  if (gameContainerRef.current && !gameRef.current) {
    const game = new Game(gameContainerRef.current);
    gameRef.current = game;
    setGame(game);
  }
  return () => {
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
  };
}, [setGame]);
```

**Additional logic:**
- Only instantiate Game when `player !== null` (already guaranteed by AuthGuard)
- On unmount: disconnect socket, destroy game

**State dependencies:**
- Read: `player` (to pass initial state to game)
- Write: `game` (store game instance reference)

### Modified App.tsx

**Change:** Remove direct Game instantiation, add AuthGuard

```tsx
function App() {
  return (
    <div className="app">
      <AuthGuard />
    </div>
  );
}
```

## State Schema Extensions

### gameStore.ts additions

```typescript
interface GameState {
  // Existing (unchanged)
  connectionState: ConnectionState;
  game: Game | null;
  player: Player | null;
  // ... existing UI state

  // NEW: Auth state
  authToken: string | null;
  setAuthToken: (token: string | null) => void;

  userId: string | null;
  setUserId: (id: string | null) => void;

  availableCharacters: Character[];
  setAvailableCharacters: (characters: Character[]) => void;

  selectedCharacter: Character | null;
  setSelectedCharacter: (character: Character | null) => void;

  // NEW: Helper actions
  logout: () => void; // Clear all auth state, disconnect socket
}
```

**Why in global store?** Auth state needs to be accessible across LoginScreen, CharacterSelectScreen, GameContainer, and socket handlers.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Game Instantiation Before Auth
**What goes wrong:** Phaser game loads, connects to server before user authenticated
**Why bad:** Wasted resources, server rejects connection, confusing UX
**Instead:** Gate Game instantiation behind `player !== null` check in AuthGuard

### Anti-Pattern 2: Storing Auth State in Component State
**What goes wrong:** LoginScreen stores token in local state, CharacterSelectScreen can't access it
**Why bad:** Props drilling, state synchronization issues, socket handlers can't access auth data
**Instead:** Auth state in Zustand store, accessible everywhere

### Anti-Pattern 3: Dual State Systems (React + Phaser)
**What goes wrong:** Player data stored in both gameStore and Phaser scene data
**Why bad:** State desynchronization, unclear source of truth, bugs when states diverge
**Instead:** Single source of truth in gameStore, Phaser reads from it via registry or events

### Anti-Pattern 4: Socket Connection Before Character Selection
**What goes wrong:** Connect to game server before knowing which character to authenticate
**Why bad:** Server expects `characterId` in auth message, can't send it yet
**Instead:** Connect socket AFTER character selected, immediately send auth message

### Anti-Pattern 5: Rendering Game Canvas on Login Screen
**What goes wrong:** Mount Game instance early "for faster loading"
**Why bad:** Game tries to connect, server rejects, memory wasted, cleanup complexity
**Instead:** Defer Game instantiation until after authentication complete

## Build Order Dependencies

### Phase 1: State Foundation
**Build first:** Extend gameStore with auth state
**Why first:** Components depend on store structure
**Files:**
- `apps/web/src/store/gameStore.ts` (extend)

### Phase 2: API Integration
**Build second:** Auth API client
**Why second:** Screens depend on API calls
**Files:**
- `apps/web/src/api/auth.ts` (new)
- `apps/web/src/api/characters.ts` (new)

### Phase 3: Screens
**Build third:** UI screens (can be parallel)
**Why third:** Depend on store and API, independent of each other
**Files:**
- `apps/web/src/screens/LoginScreen.tsx` (new)
- `apps/web/src/screens/CharacterSelectScreen.tsx` (new)

### Phase 4: Orchestration
**Build fourth:** AuthGuard and GameContainer
**Why fourth:** Depend on all screens existing
**Files:**
- `apps/web/src/components/AuthGuard.tsx` (new)
- `apps/web/src/components/GameContainer.tsx` (new, extracted from App.tsx)

### Phase 5: Integration
**Build fifth:** Wire up App.tsx
**Why fifth:** Final integration of all pieces
**Files:**
- `apps/web/src/App.tsx` (refactor)

### Phase 6: Socket Lifecycle
**Build sixth:** Update socket connection timing
**Why sixth:** Depends on character selection flow
**Files:**
- `apps/web/src/network/socket.ts` (update connection timing)

## Scalability Considerations

### At Launch (100 users)
- Current architecture sufficient
- Single gameStore instance per client
- Simple conditional rendering

### At 10K users
- **Consider:** Token refresh logic (JWT expiration handling)
- **Consider:** Character creation flow (not just selection)
- **Consider:** Loading states between screens (skeleton UI)
- **Add:** Error boundary around GameContainer
- **Add:** Analytics tracking (screen transitions)

### At 1M users
- **Consider:** Multi-region game servers (server selection screen)
- **Consider:** Session persistence (localStorage for token)
- **Consider:** Reconnection flow (session recovery after disconnect)
- **Add:** Performance monitoring (screen load times)
- **Add:** A/B testing framework (different auth flows)

## Integration Points

### Socket.ts Changes

**Current:** Socket has `authenticate()` method but never called

**Change:** Call from CharacterSelectScreen on character selection

```typescript
// In CharacterSelectScreen.tsx
function handleCharacterSelect(character: Character) {
  const { authToken } = useGameStore.getState();

  setSelectedCharacter(character);

  gameSocket.connect(GAME_SERVER_URL);
  gameSocket.authenticate(authToken, character.id);
}
```

**Socket.ts remains unchanged** except connection timing (don't auto-connect on import).

### Game.ts Changes

**Current:** Instantiated immediately in App.tsx useEffect

**Change:** Move instantiation to GameContainer, only after auth complete

**Game.ts remains unchanged** - no internal changes needed.

### GameUI.tsx Changes

**Current:** Already has placeholder auth UI logic (lines 10-20)

**Change:** Remove placeholder, GameUI only renders when player exists (guaranteed by AuthGuard)

```tsx
// Simplified GameUI.tsx
export const GameUI: React.FC = () => {
  const { showChat } = useGameStore();
  // player guaranteed to exist by AuthGuard

  return (
    <div className="game-ui">
      <HUD />
      {showChat && <ChatPanel />}
    </div>
  );
};
```

## File Structure

```
apps/web/src/
├── api/                    (NEW)
│   ├── auth.ts            (NEW - auth API calls)
│   └── characters.ts      (NEW - character API calls)
├── components/            (NEW)
│   ├── AuthGuard.tsx      (NEW - screen orchestration)
│   └── GameContainer.tsx  (NEW - extracted from App.tsx)
├── screens/               (NEW)
│   ├── LoginScreen.tsx    (NEW)
│   ├── CharacterSelectScreen.tsx (NEW)
│   └── ConnectionErrorScreen.tsx (NEW)
├── store/
│   └── gameStore.ts       (MODIFY - add auth state)
├── network/
│   └── socket.ts          (MODIFY - connection timing)
├── game/                  (UNCHANGED)
│   ├── Game.ts
│   └── scenes/
├── ui/                    (MODIFY)
│   ├── GameUI.tsx         (MODIFY - remove placeholder)
│   ├── hud/
│   └── panels/
├── App.tsx                (MODIFY - simplify to render AuthGuard)
└── main.tsx               (UNCHANGED)
```

## Testing Strategy

### Unit Tests
- AuthGuard: Renders correct screen based on store state
- LoginScreen: Form validation, API call handling
- CharacterSelectScreen: Character click triggers correct actions

### Integration Tests
- Full flow: Login → Character Select → Game Load
- Socket authentication: Character select → socket.authenticate() → auth:success → game renders

### E2E Tests
- Happy path: User logs in, selects character, game loads
- Error path: Invalid credentials, network error, auth failure

## Open Questions

**Question:** Should auth token be persisted in localStorage for session recovery?
**Impact:** Allows users to reload page without re-logging in
**Recommendation:** Yes, add in Phase 6 (post-MVP)

**Question:** Does server support multiple characters per user?
**Impact:** Determines if CharacterSelectScreen is needed or skip to game
**Assumption:** Yes (milestone context mentions "character selected")

**Question:** Is character creation in scope for this milestone?
**Impact:** Affects CharacterSelectScreen (add "Create New" button?)
**Assumption:** No, only selection (creation is future milestone)

## Sources

**Confidence Assessment:**
- **Component structure:** HIGH (based on existing codebase analysis)
- **Data flow:** HIGH (Zustand patterns, WebSocket architecture clear from code)
- **State management:** HIGH (gameStore.ts structure analyzed)
- **Build order:** MEDIUM (dependency analysis from components)
- **Game architecture patterns:** MEDIUM (based on training data, not verified with current 2026 sources due to tool restrictions)

**Codebase files analyzed:**
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/App.tsx`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/Game.ts`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/store/gameStore.ts`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/network/socket.ts`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/ui/GameUI.tsx`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/scenes/BootScene.ts`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/scenes/PreloadScene.ts`

**Architecture patterns:** Based on standard React + Phaser integration patterns, game authentication flows, and Zustand state management best practices from training data (January 2025 cutoff).
