# Architecture Research

**Domain:** React/Phaser MMO — UI Polish & Audio (v1.21)
**Researched:** 2026-02-26
**Confidence:** HIGH (full codebase read, all integration points verified)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                         React UI Layer                                 │
│                                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │  GameUI    │  │    HUD     │  │  Panels /  │  │  NEW: Game     │  │
│  │ (DndContext│  │ (bottom    │  │  Modals    │  │  Menu + Settings│ │
│  │  root,     │  │  action    │  │  (show*    │  │  (ESC layer)   │  │
│  │  ESC mgr)  │  │  bars,     │  │  booleans  │  │                │  │
│  │            │  │  shortcuts)│  │  in stores)│  │                │  │
│  └─────┬──────┘  └─────┬──────┘  └──────┬─────┘  └───────┬────────┘  │
│        │               │                │                 │           │
├────────┴───────────────┴────────────────┴─────────────────┴───────────┤
│                         Zustand Store Layer                            │
│                                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │gameStore │ │npcStore  │ │loreStore │ │action    │ │NEW: audio  │  │
│  │(show*    │ │(interact-│ │(isCodex  │ │BarStore  │ │Store       │  │
│  │ booleans,│ │ ingNpc)  │ │  Open)   │ │(secondary│ │(volumes,   │  │
│  │ showGame │ │          │ │          │ │BarVisible│ │ mute,track)│  │
│  │  Menu)   │ │          │ │          │ │          │ │            │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                         Phaser 3 Canvas Layer                          │
│                                                                        │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ WorldScene │  │EntityRenderer│  │DepthSorter   │  │MinimapCam  │  │
│  │(movement,  │  │(sprites, UI  │  │(depth order  │  │(separate   │  │
│  │ input,     │  │ above tiles) │  │ per frame)   │  │ Phaser cam)│  │
│  │ camera)    │  │[ANCHOR FIX]  │  │              │  │            │  │
│  └────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Notes for v1.21 |
|-----------|----------------|-----------------|
| `GameUI.tsx` | DndContext root, conditional modal/panel rendering | Add ESC manager, `<AudioManager />`, `{showGameMenu && <GameMenu />}` |
| `HUD.tsx` | Bottom action bars, shortcuts, status bars | Add conditional second bar render from `showSecondaryBar` |
| `GameShortcuts.tsx` | Button grid for I/E/K/Q/C | Add Menu button (M key) calling `toggleGameMenu()` |
| `gameStore.ts` | UI boolean flags (showInventory, etc.) | Add `showGameMenu` boolean + `toggleGameMenu()` |
| `actionBarStore.ts` | Dual-bar slot assignments, localStorage | Add `showSecondaryBar` boolean + localStorage persist |
| `audio.ts` util | Single fire SFX only (quest-complete.mp3) | Expand with `playLevelUpSound()`, make volume-aware via audioStore |
| `EntityRenderer.ts` | Sprite creation, anchor positioning | Fix container.y: subtract `ISO_TILE_HEIGHT / 2` to anchor at tile base |
| `NpcInteractionModal.tsx` | Has own ESC useEffect (lines 222-232) | Remove own ESC handler — delegate to central GameUI handler |
| `QuestLogPanel.tsx` | Has own ESC useEffect (lines 30-38) | Remove own ESC handler — delegate to central GameUI handler |
| `LoreCodex.tsx` | Has own ESC useEffect (lines 27-31) | Remove own ESC handler — delegate to central GameUI handler |

## Recommended Project Structure

```
apps/web/src/
├── store/
│   ├── gameStore.ts          # MODIFY: add showGameMenu + toggleGameMenu()
│   ├── actionBarStore.ts     # MODIFY: add showSecondaryBar + toggleSecondaryBar() + localStorage
│   └── audioStore.ts         # NEW: musicVolume, ambientVolume, effectsVolume, isMuted, localStorage
├── ui/
│   ├── GameUI.tsx            # MODIFY: add ESC manager, <AudioManager />, <GameMenu />
│   ├── hud/
│   │   ├── HUD.tsx           # MODIFY: conditional second ActionBar based on showSecondaryBar
│   │   └── GameShortcuts.tsx # MODIFY: add Menu button
│   ├── modals/
│   │   ├── GameMenu.tsx      # NEW: overlay with Settings tab + Logout
│   │   └── GameMenu.css      # NEW
│   └── panels/
│       ├── QuestLogPanel.tsx # MODIFY: remove own ESC handler
│       └── NpcInteractionModal.tsx # MODIFY: remove own ESC handler
├── components/
│   ├── AudioManager.tsx      # NEW: invisible, music lifecycle, visibilitychange
│   └── LoreCodex.tsx         # MODIFY: remove own ESC handler
└── utils/
│   └── audio.ts              # MODIFY: add playLevelUpSound(), volume-aware playEffect()
└── game/
    └── rendering/
        └── EntityRenderer.ts # MODIFY: fix container.y anchor calculation (line 146)
```

### Structure Rationale

- **`audioStore.ts` as new Zustand store:** Matches the existing store-per-concern pattern. Volumes need localStorage persistence + reactivity — both handled by Zustand. Avoids threading audio state through gameStore which already has a large surface area.
- **`GameMenu.tsx` in `modals/`:** Not a panel (not draggable with useDraggablePanel), not a HUD element. Modal category is correct. Follows QuestCompleteModal placement.
- **`AudioManager.tsx` in `components/`:** Invisible component (returns null), lifecycle-managed by React. Placed next to LevelUpNotification and LoreCodex which are also non-screen components with side effects.
- **Settings in GameMenu:** At v1.21 scope (volumes + secondary bar toggle), settings live inside GameMenu as a panel tab. A dedicated `settingsStore` is premature — create it only if a future milestone adds keybind remapping or other orthogonal settings.
- **ESC logic in `GameUI.tsx`:** Single handler reads store snapshots. Individual panel ESC handlers removed to prevent simultaneous multi-panel close on single keypress.

## Architectural Patterns

### Pattern 1: ESC Modal Priority Stack

**What:** Single `window.addEventListener('keydown')` in `GameUI.tsx` that closes modals one-by-one in priority order. When all are closed, opens GameMenu. When GameMenu is open, ESC closes it.

**When to use:** Any time multiple UI layers can be open simultaneously and ESC must close exactly one thing per keypress.

**Trade-offs:** Centralized logic vs. component isolation. Per-component ESC handlers (current approach) cause all open panels to close simultaneously. Centralized is predictable and correct.

**Priority order (closes first = highest priority):**

```
1. NPC interaction (interactingNpc in npcStore) — setInteractingNpc(null)
2. Lore Codex (isCodexOpen in loreStore) — toggleCodex()
3. Quest Log (isQuestLogOpen in gameStore) — toggleQuestLog()
4. Abilities panel (showAbilities in gameStore) — toggleAbilities()
5. Equipment panel (showEquipment in gameStore) — toggleEquipment()
6. Inventory panel (showInventory in gameStore) — toggleInventory()
7. Chat panel (showChat in gameStore) — toggleChat()
8. Game Menu open → close it (toggleGameMenu)
9. Nothing open → open Game Menu (toggleGameMenu)

NOTE: showDeathScreen intentionally excluded — death screen cannot be ESC-dismissed
```

**Example implementation in `GameUI.tsx`:**

```typescript
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;

    // Read snapshots at call time — no reactive subscriptions needed
    const npc = useNpcStore.getState();
    const lore = useLoreStore.getState();
    const game = useGameStore.getState();

    if (npc.interactingNpc) {
      npc.setInteractingNpc(null);
    } else if (lore.isCodexOpen) {
      lore.toggleCodex();
    } else if (game.isQuestLogOpen) {
      game.toggleQuestLog();
    } else if (game.showAbilities) {
      game.toggleAbilities();
    } else if (game.showEquipment) {
      game.toggleEquipment();
    } else if (game.showInventory) {
      game.toggleInventory();
    } else if (game.showChat) {
      game.toggleChat();
    } else {
      // Nothing open OR game menu open — toggle game menu
      game.toggleGameMenu();
    }
  };

  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, []); // Empty deps — reads store snapshots at event time, not at render time
```

**Migration:** Remove existing ESC blocks from:
- `QuestLogPanel.tsx` lines 30-38 (remove entire `if (e.key === 'Escape')` block)
- `NpcInteractionModal.tsx` lines 222-232 (remove entire ESC block, keep other key handlers if any)
- `LoreCodex.tsx` lines 27-31 (remove `handleEscape` function and listener)

### Pattern 2: Centralized Audio Store

**What:** Zustand store owns volume levels and mute state. An invisible `AudioManager` React component drives HTML5 Audio API. Volume changes in store instantly update audio playback.

**When to use:** Background music looping, multiple audio category volumes, settings UI that needs to preview volume changes in real-time.

**Trade-offs:** React-managed audio means Phaser's `pauseOnBlur: true` (already set in Game.ts) does NOT pause HTML5 Audio. Must manually handle `visibilitychange`. The alternative (Phaser sound system) would integrate `pauseOnBlur` automatically but requires loading music in PreloadScene and bridging volume through the game instance reference.

**AudioStore shape:**

```typescript
// store/audioStore.ts
interface AudioState {
  musicVolume: number;      // 0.0 - 1.0, default 0.4
  ambientVolume: number;    // 0.0 - 1.0, default 0.3 (reserved for future ambients)
  effectsVolume: number;    // 0.0 - 1.0, default 0.5
  isMuted: boolean;         // master mute
  setMusicVolume: (v: number) => void;
  setAmbientVolume: (v: number) => void;
  setEffectsVolume: (v: number) => void;
  toggleMute: () => void;
}
// All values persisted to localStorage on change (same pattern as actionBarStore)
```

**AudioManager component (invisible, mounted once in GameUI):**

```typescript
// 4 tracks confirmed present in /assets/music/
const MUSIC_TRACKS = [
  '/assets/music/freesound_community-wandering-6394.mp3',
  '/assets/music/freesound_community-ethereal-ambient-music-55115.mp3',
  '/assets/music/freesound_community-ghosts-play-piano-26550.mp3',
  '/assets/music/freesound_community-kalimba-atmosphere-32457.mp3',
];

export const AudioManager: React.FC = () => {
  const { musicVolume, isMuted } = useAudioStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
    const audio = new Audio(track);
    audio.loop = true;
    audio.volume = isMuted ? 0 : musicVolume;
    audioRef.current = audio;
    audio.play().catch(() => {}); // Fail silently — autoplay policy

    // Manual pause on tab hide (Phaser pauseOnBlur doesn't cover HTML Audio)
    const handleVisibility = () => {
      if (document.hidden) audio.pause();
      else audio.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      audio.pause();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []); // Mount once — track chosen at game start

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMuted]);

  return null;
};
```

**SFX update in `audio.ts`:**

```typescript
export function playEffect(path: string): void {
  const { effectsVolume, isMuted } = useAudioStore.getState(); // snapshot
  if (isMuted) return;
  const audio = new Audio(path);
  audio.volume = effectsVolume;
  audio.play().catch(() => {});
}

export function playQuestCompleteSound(): void {
  playEffect('/assets/audio/quest-complete.mp3');
}

export function playLevelUpSound(): void {
  playEffect('/assets/audio/quest-complete.mp3'); // Reuse file per spec
}
```

**Wire level-up in `gameStore.ts`** (existing `player:xp` socket handler):

```typescript
gameSocket.on('player:xp', (data) => {
  // ... existing state update ...
  if (data.leveledUp) {
    playLevelUpSound(); // Add this call
    // ... existing chat message ...
  }
});
```

### Pattern 3: Interface Settings Co-located in Owner Store

**What:** `showSecondaryBar` boolean lives in `actionBarStore` (not a separate settings store) because the action bar store already owns all action bar configuration. localStorage persistence follows the same pattern already used in that store.

**When to use:** When a UI preference has an obvious natural owner among existing stores. Avoids creating a generic settings store prematurely.

**Trade-offs:** Slightly violates single responsibility if settings accumulate. For v1.21 (one interface toggle), co-location is correct. Extract to `settingsStore.ts` when 3+ unrelated interface preferences exist.

**Implementation:**

```typescript
// actionBarStore.ts additions
function loadSecondaryBarVisibility(): boolean {
  return localStorage.getItem('action_bar_secondary_visible') !== 'false'; // default true
}

// In store interface:
showSecondaryBar: boolean;
toggleSecondaryBar: () => void;

// In store initializer:
showSecondaryBar: loadSecondaryBarVisibility(),
toggleSecondaryBar: () => set((state) => {
  const newValue = !state.showSecondaryBar;
  localStorage.setItem('action_bar_secondary_visible', String(newValue));
  return { showSecondaryBar: newValue };
}),
```

```tsx
// HUD.tsx modification
const { showSecondaryBar } = useActionBarStore();

<div className="action-bars-container">
  <ActionBar barIndex={0} />
  {showSecondaryBar && <ActionBar barIndex={1} />}
</div>
```

### Pattern 4: Entity Anchor Fix — Tile Base Origin

**What:** Fix `EntityRenderer.createEntityContainer()` to position the container at the tile's top-face base edge (where the tile surface is visible), not at the tile's screen-center.

**Root cause:** `IsometricTransform.gridToScreen()` returns the visual center of a tile face, which is `ISO_TILE_HEIGHT / 2 = 64px` above the bottom edge of the top face. With sprite `origin(0.5, 1.0)` (bottom-center), the sprite feet land 64px too high for flat tiles, and higher still on elevated tiles.

**Fix (EntityRenderer.ts line 146):**

```typescript
// BEFORE (buggy)
const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);

// AFTER (correct)
// ISO_TILE_HEIGHT = 128, so half = 64 — this is the distance from tile center to base
const tileBase = screenPos.y + (ISO_TILE_HEIGHT / 2);
const container = this.scene.add.container(screenPos.x, tileBase - elevationOffset);
```

**Note on ISO_TILE_HEIGHT direction:** In isometric rendering, larger Y = lower on screen. The tile's bottom-visible-edge (where entities stand) is at `screenPos.y + (ISO_TILE_HEIGHT / 2)` because the tile center is above the base in screen space.

**TargetHighlight:** The selection indicator follows `container.y` automatically (it attaches to the container). Fixing the container position fixes the selection ring alignment without changes to `TargetHighlight.ts`.

**Update moved-entity position** (`EntityRenderer.updateEntityPosition`, line 763-765 in EntityRenderer.ts):

```typescript
// Same fix needed when updating position on move
const tileBase = screenPos.y + (ISO_TILE_HEIGHT / 2);
container.setPosition(screenPos.x, tileBase - elevationOffset);
```

## Data Flow

### ESC Key Flow (new centralized)

```
User presses ESC
    ↓
GameUI.tsx single window keydown listener
    ↓
Reads store snapshots (getState() — no subscriptions)
    ↓
If/else priority chain: first truthy open modal wins
    ↓
Calls store close action for that modal
    ↓
Zustand notifies subscribers → React re-renders
    ↓
GameUI conditional hides that one component
    ↓
Next ESC press: re-evaluates remaining open modals
```

### Audio Flow (new)

```
GameContainer mounts → GameUI mounts → AudioManager mounts
    ↓
AudioManager picks random track from MUSIC_TRACKS[]
Creates HTML5 Audio element, sets loop=true
Calls audio.play() — fails silently if autoplay blocked
    ↓
[User interacts with page — autoplay policy satisfied]
Music begins playing at musicVolume from audioStore
    ↓
[Server emits player:xp with leveledUp: true]
gameStore.ts handler calls playLevelUpSound()
audio.ts reads effectsVolume from audioStore.getState()
Creates new Audio element for quest-complete.mp3, plays once
    ↓
[User opens Game Menu → Settings tab]
Moves music volume slider → calls audioStore.setMusicVolume(v)
audioStore updates + saves to localStorage
AudioManager useEffect fires → audioRef.current.volume = v
```

### Settings Flow (new)

```
User presses ESC (nothing else open)
    ↓
GameUI ESC handler: toggleGameMenu()
gameStore.showGameMenu = true
    ↓
GameMenu renders as overlay
    ↓
User clicks Settings tab
SettingsPanel renders:
  - Music volume slider → audioStore.musicVolume
  - Effects volume slider → audioStore.effectsVolume
  - Mute toggle → audioStore.isMuted
  - Show secondary bar toggle → actionBarStore.showSecondaryBar
    ↓
User toggles secondary bar
    ↓
actionBarStore.toggleSecondaryBar() called
localStorage.setItem('action_bar_secondary_visible', 'false')
    ↓
HUD.tsx subscribed to showSecondaryBar — re-renders
Second ActionBar disappears from HUD bottom area
    ↓
User clicks Logout
gameSocket.disconnect()
navigate('/login')
```

### Entity Rendering Fix Flow

```
Server sends entity data (zone:state or entity:spawn)
    ↓
WorldScene.spawnEntity() → EntityRenderer.createEntityContainer()
    ↓
isoTransform.gridToScreen(worldX, worldY) → { x, y: tile_center }
    ↓
[FIXED] tileBase = screenPos.y + (ISO_TILE_HEIGHT / 2)
container.y = tileBase - elevationOffset
    ↓
Sprite added with origin(0.5, 1.0)
Sprite feet land exactly at container.y = tile surface
    ↓
Entity visually stands on tile, not floating above it
Selection indicator at container.y matches entity feet
```

## Integration Points

### New vs. Modified Components

| Component | Status | Change Summary |
|-----------|--------|---------------|
| `gameStore.ts` | MODIFY | Add `showGameMenu: boolean`, `toggleGameMenu()` |
| `actionBarStore.ts` | MODIFY | Add `showSecondaryBar: boolean`, `toggleSecondaryBar()`, localStorage |
| `audioStore.ts` | NEW | Zustand store: musicVolume, ambientVolume, effectsVolume, isMuted |
| `AudioManager.tsx` | NEW | Invisible component: HTML5 Audio lifecycle, 4 music tracks, visibilitychange |
| `GameMenu.tsx` | NEW | Overlay modal: Settings panel (volumes + secondary bar toggle) + Logout button |
| `GameMenu.css` | NEW | Overlay styling using existing CSS variables |
| `GameUI.tsx` | MODIFY | Add: central ESC handler, `<AudioManager />` (always mounted), `{showGameMenu && <GameMenu />}` |
| `HUD.tsx` | MODIFY | Add: `showSecondaryBar` from actionBarStore, conditional `{showSecondaryBar && <ActionBar barIndex={1} />}` |
| `GameShortcuts.tsx` | MODIFY | Add: Menu button (M key label) calling `toggleGameMenu()` |
| `audio.ts` | MODIFY | Add: `playLevelUpSound()`, refactor `playEffect()` to read volume from audioStore |
| `gameStore.ts` player:xp handler | MODIFY | Add: `playLevelUpSound()` call when `data.leveledUp === true` |
| `QuestLogPanel.tsx` | MODIFY | Remove own ESC handler (lines 30-38) |
| `NpcInteractionModal.tsx` | MODIFY | Remove own ESC handler (lines 222-232) |
| `LoreCodex.tsx` | MODIFY | Remove own ESC handler (lines 27-31) |
| `EntityRenderer.ts` | MODIFY | Fix container.y calculation (line 146) and updateEntityPosition (line 764) |
| `ActionBar.tsx` | NO CHANGE | Already parameterized by `barIndex` — behavior unchanged |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `audioStore` ↔ `AudioManager.tsx` | Zustand subscription | AudioManager is the sole consumer that directly calls `.play()` / `.volume` on Audio elements |
| `audioStore` ↔ `audio.ts` | `useAudioStore.getState()` snapshot | SFX reads volume at fire time; no subscription needed |
| `audioStore` ↔ `GameMenu/SettingsPanel` | Zustand subscription | Sliders two-way bind to store state |
| `actionBarStore` ↔ `HUD.tsx` | Zustand subscription | `showSecondaryBar` consumed in HUD for conditional render |
| `actionBarStore` ↔ `GameMenu/SettingsPanel` | Zustand subscription | Toggle in settings writes to store |
| `gameStore` ↔ `GameMenu.tsx` | Zustand subscription | `showGameMenu` controls render in GameUI |
| `GameUI.tsx` ↔ all stores | `getState()` snapshots in ESC handler | Event handler does not subscribe; reads current state at keypress time |
| `EntityRenderer.ts` ↔ `IsometricTransform` | Direct call `gridToScreen()` | Fix adds `+ ISO_TILE_HEIGHT / 2` to result — IsometricTransform unchanged |

### Phaser ↔ React Boundary

The audio system lives entirely in React (HTML5 Audio), not in Phaser. This is correct for v1.21 because:

1. The 4 music files are in `/assets/music/` and not preloaded in `PreloadScene.ts`. Adding them to Phaser requires modifying PreloadScene and using `this.sound.add()`.
2. Volume control from React UI settings would require bridging through `useGameStore.getState().game` (the Phaser game instance) to reach `game.sound.setVolume()`.
3. `AudioManager.tsx` as a React component is simpler: it reads from `audioStore` directly.

**Limitation to acknowledge:** `document.visibilitychange` must be manually handled in `AudioManager` since Phaser's `pauseOnBlur: true` (configured in `Game.ts`) only pauses Phaser's own sound pipeline.

## Build Order and Dependencies

### Phase 1: Entity Rendering Fix (independent, no deps)

1. Modify `EntityRenderer.ts` — fix `tileBase` calculation at line 146 and line 764
2. Manual test: entity on elevated tile sits on tile surface, selection ring at feet

### Phase 2: Audio Foundation (no UI deps)

3. Create `audioStore.ts` — volumes, mute, localStorage persistence
4. Modify `audio.ts` — add `playLevelUpSound()`, refactor `playEffect()` to read from audioStore
5. Wire level-up sound in `gameStore.ts` `player:xp` handler
6. Create `AudioManager.tsx` — invisible component with music loop + visibilitychange

### Phase 3: Game Menu + Settings (depends on Phase 2 for audioStore)

7. Add `showGameMenu` + `toggleGameMenu()` to `gameStore.ts`
8. Create `GameMenu.tsx` + `GameMenu.css`
   - Settings panel: sliders bound to audioStore, secondary bar toggle bound to actionBarStore
   - Logout: `gameSocket.disconnect()` + `navigate('/login')`
9. Add `{showGameMenu && <GameMenu />}` to `GameUI.tsx`
10. Add `<AudioManager />` to `GameUI.tsx` (always mounted, inside player guard)

### Phase 4: ESC Stack + Secondary Bar + Shortcuts (depends on Phase 3 for GameMenu)

11. Add `showSecondaryBar` + `toggleSecondaryBar()` to `actionBarStore.ts` with localStorage
12. Modify `HUD.tsx` — conditional second ActionBar
13. Add central ESC handler to `GameUI.tsx`
14. Remove own ESC handlers from `QuestLogPanel.tsx`, `NpcInteractionModal.tsx`, `LoreCodex.tsx`
15. Add Menu button to `GameShortcuts.tsx`

### Dependency Rationale

- Phase 1 (entity fix) ships first because it's entirely self-contained and validates the positioning logic before other UI work.
- Phase 2 (audio) must precede Phase 3 because the Settings panel in GameMenu reads from `audioStore`.
- Phase 3 (GameMenu) must precede Phase 4 ESC handler, because ESC's "open when nothing else open" branch targets GameMenu.
- Secondary bar toggle in Phase 4: the actionBarStore change is simple, but testing it properly requires the Settings UI from Phase 3 to already exist.

## Anti-Patterns

### Anti-Pattern 1: Per-Component ESC Handlers

**What people do:** Each panel adds its own `window.addEventListener('keydown')` checking `e.key === 'Escape'`.

**Why it's wrong:** When three panels are open simultaneously and ESC is pressed, all three handlers fire in the same event loop tick. All three panels close at once instead of one-by-one.

**Do this instead:** Single handler in `GameUI.tsx` with an ordered if/else chain. Closes exactly one modal per keypress.

### Anti-Pattern 2: Phaser Sound for Background Music

**What people do:** Load music in `PreloadScene.ts`, then `this.sound.add('track').play({ loop: true })` in WorldScene.

**Why it's wrong:** Requires modifying PreloadScene + loading time for 4 music files + bridging volume control through the Phaser game instance reference stored in gameStore. Phaser's `pauseOnBlur` is a bonus, but `visibilitychange` is a 2-line equivalent.

**Do this instead:** `AudioManager.tsx` React component with HTML5 Audio. Direct connection to audioStore. Zero Phaser coupling.

### Anti-Pattern 3: Generic settingsStore at v1.21 Scope

**What people do:** Create a monolithic `settingsStore.ts` with fields for every possible preference.

**Why it's wrong:** Over-engineering for a milestone with exactly 2 settings: audio volumes (audioStore) and secondary bar visibility (actionBarStore). Settings that already have a natural owner store belong in that store.

**Do this instead:** Add to the natural owner store. Create `settingsStore.ts` in a future milestone when there are 3+ orthogonal preferences without a natural owner (keybind remapping, language, color theme).

### Anti-Pattern 4: Entity Anchored at Tile Visual Center

**What people do:** Use `gridToScreen(x, y)` as the container position directly, then add sprite with `origin(0.5, 1.0)`.

**Why it's wrong:** `gridToScreen()` returns the visual center of the tile's top face. The tile's base (where entities stand) is at `screenPos.y + (ISO_TILE_HEIGHT / 2)`. For elevated tiles, the error multiplies: an entity at elevation 3 floats `3 * ELEVATION_HEIGHT_STEP + 64` pixels above the expected position.

**Do this instead:** `container.y = screenPos.y + (ISO_TILE_HEIGHT / 2) - elevationOffset`. Sprite origin(0.5, 1.0) then places feet at exactly the tile surface.

## Scaling Considerations

| Scale | Concern | Approach |
|-------|---------|----------|
| v1.21 (8 modal types) | ESC handler if/else chain | Simple ordered if/else — adequate and readable |
| +5 future modals | ESC handler maintainability | Extract to priority array: `const MODAL_STACK = [{test: () => bool, close: () => void}]` |
| Future audio features | Music crossfades, positional audio | Migrate to Phaser sound system or Web Audio API (AudioContext + gain nodes) |
| Future settings growth | Many unrelated UI preferences | Extract to `settingsStore.ts` at that point; audioStore keeps audio-specific state |

## Sources

- Codebase: `apps/web/src/ui/GameUI.tsx` (full read)
- Codebase: `apps/web/src/ui/hud/HUD.tsx`, `HUD.css`, `GameShortcuts.tsx`, `ActionBar.tsx`
- Codebase: `apps/web/src/store/gameStore.ts`, `actionBarStore.ts`, `loreStore.ts`
- Codebase: `apps/web/src/utils/audio.ts`
- Codebase: `apps/web/src/game/rendering/EntityRenderer.ts` (first 350 lines)
- Codebase: `apps/web/src/game/scenes/WorldScene.ts`, `PreloadScene.ts`, `GameContainer.tsx`
- Codebase: `apps/web/src/ui/panels/QuestLogPanel.tsx`, `NpcInteractionModal.tsx`
- Codebase: `apps/web/src/components/LoreCodex.tsx`
- ESC handler audit: QuestLogPanel line 30, NpcInteractionModal line 222, LoreCodex line 27 — all confirmed
- Audio assets confirmed: 4 MP3 tracks in `/assets/music/`, 1 SFX in `/assets/audio/`
- Prior research: `.planning/research/ARCHITECTURE-UI-POLISH.md` (NPC modal unification, v1.16)

---
*Architecture research for: v1.21 UI Polish & Audio — Game menu, audio system, ESC modal stack, entity rendering fix*
*Researched: 2026-02-26*
