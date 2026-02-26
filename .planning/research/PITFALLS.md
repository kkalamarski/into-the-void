# Pitfalls Research: v1.21 UI Polish & Audio

**Domain:** React + Phaser 3 Multiplayer Game — Adding game menu, audio system, settings UI, ESC modal management, entity rendering fix
**Researched:** 2026-02-26
**Confidence:** HIGH

---

## Executive Summary

Adding game menu, audio, settings persistence, and entity rendering fixes to an existing React + Phaser 3 game introduces a specific class of pitfalls that emerge from the **dual-runtime boundary**: Phaser owns the canvas and keyboard events; React owns the HUD and modals. Both systems must coexist without stepping on each other's key handling, audio context, or z-index layering.

The most severe pitfalls are:

1. **Audio autoplay blocked silently** — music never plays, no error is thrown, player thinks feature is broken
2. **ESC key handled by multiple independent listeners** — modals close correctly but Phaser also receives the event, firing unwanted in-game actions
3. **Audio objects created but never destroyed** — HTMLAudio elements accumulate on every level-up or quest completion, leaking memory over a long session
4. **Modal z-index trapped inside stacking context** — game menu renders behind Phaser canvas because `.game-ui` already establishes a stacking context
5. **Settings persisted from stale state** — volume sliders save on every slider move, writing over freshly loaded defaults before rehydration completes
6. **Entity anchor offset mismatch** — fixing entity origin from center to bottom-center shifts the selection indicator and target highlight to wrong position, requiring coordinated fixes across EntityRenderer and TargetHighlight

This document focuses on pitfalls **specific to adding these features to the existing Into the Void codebase**, not general web development mistakes.

---

## Critical Pitfalls

### Pitfall 1: Audio Autoplay Silently Blocked — Music Never Starts

**What goes wrong:**
Background music is added to loop on game load (or zone entry). It never plays. No error appears in the console. The code path executes, `audio.play()` is called, but Chrome/Firefox silently discard the request because no user gesture has occurred before `new Audio()` is called.

The existing `playQuestCompleteSound()` in `apps/web/src/utils/audio.ts` already handles this with `.catch()` that logs to `console.debug` (line 17-19), but music started at Phaser boot or `WorldScene.create()` has no user gesture context at all — Phaser initializes inside a `useEffect` after mount, which is not a user gesture.

**Why it happens:**
Chrome's autoplay policy blocks audio that is not initiated by a direct user interaction event (click, keydown, touchstart). React `useEffect` callbacks and Phaser `create()` lifecycle methods are not user gesture contexts. The error is caught silently or not at all because `audio.play()` returns a Promise that rejects, and if the rejection is unhandled the browser simply discards it with no user-visible feedback.

From the Chromium autoplay policy: "Playback of any media that includes audio is generally blocked if the playback is programmatically initiated in a tab which has not yet had any user interaction."

**How to avoid:**
Use the "unlock on first interaction" pattern. Create the audio object and preload it immediately, but defer `.play()` until the first user gesture. Track whether audio has been unlocked using a module-level flag:

```typescript
// apps/web/src/utils/audio.ts

let audioUnlocked = false;
let pendingMusicPlay: (() => void) | null = null;

// Call this from any user interaction handler (click on Play, any keydown)
export function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (pendingMusicPlay) {
    pendingMusicPlay();
    pendingMusicPlay = null;
  }
}

export function playMusic(src: string, volume: number): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;

  if (audioUnlocked) {
    audio.play().catch(err => console.debug('[Audio] Music blocked:', err));
  } else {
    // Queue for first user gesture
    pendingMusicPlay = () => audio.play().catch(err => console.debug('[Audio] Music blocked:', err));
  }
  return audio;
}
```

Wire `unlockAudio()` to the first click or keydown on `document` in `GameContainer.tsx` or the game's first meaningful user event.

**Warning signs:**
- Music code executes (console logs confirm) but no sound plays
- No error in console (autoplay rejection is silent when caught)
- Works on localhost with devtools open (DevTools user gesture unlocks audio) but not on production
- Works in Firefox but not Chrome (different autoplay thresholds)

**Phase to address:** Audio System phase — integrate unlock before any music play call. Do not add music play to Phaser scene lifecycle.

---

### Pitfall 2: ESC Key Fires in Both Phaser and React — Double-Action on Dismiss

**What goes wrong:**
ESC closes the NPC modal (React keydown listener on `window`), then the same event bubbles up and Phaser's keyboard input system also receives it, triggering whatever ESC is mapped to in-game (e.g., canceling pathfinding, deselecting target). When the game menu is added, ESC must: close topmost modal → open menu. Both React and Phaser will process the same keydown.

Current state: `NpcInteractionModal` adds a `window.addEventListener('keydown', ...)` handler for Escape (line 224-227). `QuestLogPanel` does the same (lines 30-35). `LoreCodex` does the same (lines 27-31). Each is independent. None call `e.stopPropagation()`. Phaser keyboard plugin is separate and not connected to these handlers.

**Why it happens:**
Phaser 3 keyboard input does not use `addEventListener` directly in the same way — it processes events through its internal `KeyboardPlugin` which captures events on `window`. React components add independent `window` listeners. Both receive the same event. Neither yields to the other. Adding a game menu that listens for ESC creates a third handler.

From Phaser documentation: "keyboard captures are global, meaning if you call this method from within a Scene to prevent a key from triggering a page action, it will prevent it for any Scene in your game."

**How to avoid:**
Implement a centralized ESC key manager at the application level — one listener on `window` that holds an ordered stack of modal closers. Only the top-most modal closer fires per ESC keydown. Phaser's keyboard input for ESC is disabled explicitly when any modal is open:

```typescript
// apps/web/src/utils/escKeyManager.ts

type EscHandler = () => boolean; // returns true if it consumed the event

const handlers: EscHandler[] = [];

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  // Fire topmost handler first
  for (let i = handlers.length - 1; i >= 0; i--) {
    const consumed = handlers[i]();
    if (consumed) {
      e.stopPropagation(); // Prevent Phaser from seeing this event
      break;
    }
  }
}, { capture: true }); // Use capture phase to run before Phaser

export function pushEscHandler(handler: EscHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  };
}
```

Using `{ capture: true }` means this handler runs before Phaser's `window` listeners. When it calls `e.stopPropagation()`, Phaser never sees the event. Remove per-component `window.addEventListener('keydown')` listeners for Escape from `NpcInteractionModal`, `QuestLogPanel`, and `LoreCodex` — replace with `pushEscHandler`.

**Warning signs:**
- Pressing ESC closes a modal AND also cancels player's pathfinding target simultaneously
- ESC opens game menu but also fires Q shortcut (if Phaser processes both)
- Modal closes but immediately reopens (ESC was processed twice in same frame)
- In-game player deselects target every time a modal is dismissed

**Phase to address:** ESC Modal Management phase — must be solved before adding game menu, since both NPC modal and game menu will compete for ESC.

---

### Pitfall 3: Audio Objects Leak Memory — HTMLAudio Elements Not Destroyed

**What goes wrong:**
Each call to `playQuestCompleteSound()` creates `new Audio(...)` and calls `.play()`. The Audio element is not referenced after the call — it becomes unreachable for garbage collection only AFTER the sound finishes playing. In practice, browsers keep HTMLAudio elements alive in their internal audio graph until fully decoded and played. If `playQuestCompleteSound` is called 20 times in a session (active players complete many quests), 20 Audio elements accumulate. Similarly, if music is implemented as `new Audio(src)` and called each time the zone changes without destroying the previous instance, prior Audio elements keep playing in the background.

The current pattern creates a new object on every call (audio.ts line 13). This is acceptable for short SFX with infrequent calls, but becomes a leak pattern for: music (never destroyed on zone change), repeated SFX on high-frequency events (every combat damage hit), or SFX started before async user gesture unlock.

**Why it happens:**
JavaScript does not automatically stop audio when the reference drops. HTMLAudioElement continues playing after its reference is garbage collected IF the browser's audio graph holds it alive. Multiple concurrent audio elements from multiple `new Audio()` calls will stack — you end up with overlapping music tracks or 20 simultaneous quest-complete sounds.

Phaser 3's own WebAudio sound system has documented memory leaks: `AudioBufferSourceNode` is not freed after play in older Phaser versions (GitHub issue #2280). When mixing Phaser's sound system with raw HTMLAudio, two audio subsystems compete.

**How to avoid:**
Use a singleton audio manager that tracks the current music instance and reuses SFX audio objects:

```typescript
// apps/web/src/utils/audioManager.ts

class AudioManager {
  private musicTrack: HTMLAudioElement | null = null;
  private sfxPool: Map<string, HTMLAudioElement> = new Map();
  private settings = { music: 0.5, ambient: 0.5, effects: 0.3 };

  playMusic(src: string): void {
    // Destroy previous track before starting new one
    if (this.musicTrack) {
      this.musicTrack.pause();
      this.musicTrack.src = ''; // Release media resource
      this.musicTrack = null;
    }
    this.musicTrack = new Audio(src);
    this.musicTrack.loop = true;
    this.musicTrack.volume = this.settings.music;
    this.musicTrack.play().catch(err => console.debug('[Audio] Music:', err));
  }

  stopMusic(): void {
    if (this.musicTrack) {
      this.musicTrack.pause();
      this.musicTrack.src = '';
      this.musicTrack = null;
    }
  }

  playSFX(key: string, src: string): void {
    // Reuse existing element if sound is not playing
    let audio = this.sfxPool.get(key);
    if (!audio) {
      audio = new Audio(src);
      this.sfxPool.set(key, audio);
    }
    audio.currentTime = 0;
    audio.volume = this.settings.effects;
    audio.play().catch(err => console.debug('[Audio] SFX:', err));
  }

  setVolume(type: 'music' | 'ambient' | 'effects', value: number): void {
    this.settings[type] = value;
    if (type === 'music' && this.musicTrack) {
      this.musicTrack.volume = value;
    }
  }

  destroy(): void {
    this.stopMusic();
    this.sfxPool.forEach(audio => { audio.pause(); audio.src = ''; });
    this.sfxPool.clear();
  }
}

export const audioManager = new AudioManager();
```

Call `audioManager.destroy()` in the `GameContainer` cleanup effect (the `return () => {}` in the Phaser initialization `useEffect`).

**Warning signs:**
- Multiple music tracks audible simultaneously after zone change
- Browser tab memory usage grows steadily during play session
- Chrome DevTools Memory panel shows accumulating `HTMLMediaElement` instances
- SFX sounds delayed or stuttering (audio buffer exhaustion)

**Phase to address:** Audio System phase — singleton pattern must be the base before music or SFX is implemented.

---

### Pitfall 4: Game Menu Z-Index Trapped Inside `.game-ui` Stacking Context

**What goes wrong:**
The game menu is rendered inside `<div className="game-ui">` which has `z-index: 100` and `position: absolute` (GameUI.css lines 3-8). This creates a stacking context. A game menu inside `.game-ui` with `z-index: 9999` only stacks relative to siblings inside `.game-ui`, not to the document root. The Phaser canvas sits at `z-index: 0` at the document root — but elements inside `.game-ui` cannot use z-index to overlay elements outside their stacking context boundary.

The current z-index values across the codebase are inconsistent:
- `.game-ui`: z-index 100
- `.death-screen`: z-index 1100 (DeathScreen.css line 11)
- `.alert-notification`: z-index 1200 (AlertNotification.css line 10)
- `.quest-complete-modal`: z-index 200 (QuestCompleteModal.css line 7)
- `.npc-modal-overlay`: z-index 99 (NpcInteractionModal.css line 5)

The NPC modal overlay is z-index 99, which is LESS than the parent `.game-ui` at z-index 100. This works now because they are siblings within the same stacking context, but adding a game menu as a full-screen overlay will expose the incoherence.

**Why it happens:**
`position: absolute` with any `z-index` creates a stacking context. Children of a stacking context are clipped to that context's z-index range relative to siblings. This is a CSS fundamental — "Even `position: fixed` cannot escape the rules of stacking context." The game menu needs to overlay the Phaser canvas, which lives outside `.game-ui`.

**How to avoid:**
Render the game menu using a React Portal to `document.body`, bypassing the `.game-ui` stacking context:

```tsx
// apps/web/src/ui/GameMenu.tsx
import { createPortal } from 'react-dom';

export const GameMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return createPortal(
    <div className="game-menu-overlay" style={{ zIndex: 2000 }}>
      {/* menu content */}
    </div>,
    document.body
  );
};
```

Alternatively, define a clear z-index scale as CSS variables and add the game menu to the document root level:

```css
/* global.css — z-index scale */
:root {
  --z-game-canvas: 0;
  --z-hud: 100;
  --z-panel: 200;
  --z-modal: 500;
  --z-game-menu: 1000;
  --z-death-screen: 1100;
  --z-alert: 1200;
}
```

**Warning signs:**
- Game menu appears but is half-transparent (canvas bleeds through)
- Game menu is visible but click events pass through to Phaser canvas
- Game menu appears above some panels but below others
- Setting menu z-index to 9999 makes no difference

**Phase to address:** Game Menu phase — establish z-index scale and portal pattern before building the menu component. Retrofitting z-index after menu is built requires touching every CSS file.

---

### Pitfall 5: Settings Persistence Race Condition — Volume Resets on Load

**What goes wrong:**
Audio settings (music volume, ambient volume, effects volume) are persisted to localStorage using Zustand persist middleware. On game load, the following race occurs:

1. React renders with default values (music: 0.5, effects: 0.3)
2. Audio manager initializes and starts music at default volume (0.5)
3. Zustand rehydrates from localStorage with saved values (music: 0.1 — player turned it down)
4. Settings store updates to music: 0.1
5. If audio manager subscribes to store, it receives the update and adjusts volume — OK
6. BUT: If audio manager reads volume at initialization time (step 2) before rehydration (step 3), music plays at 0.5 until the store updates

Zustand's persist middleware may persist a fresh empty store back to IndexedDB even as it is pulling in old data, creating a race where: player saves volume 0.0 (muted), reloads, music plays at default 0.5 for 200-500ms, then snaps to 0.0. This is audible and jarring.

**Why it happens:**
Zustand persist middleware rehydrates asynchronously after the store is created. The `onRehydrateStorage` callback fires when complete, but components that mount and read state before rehydration see defaults. There is no blocking mechanism in the standard Zustand persist flow.

From Zustand persist documentation: the middleware may persist a fresh empty store back to storage even as it is pulling in old data.

**How to avoid:**
Use Zustand's `_hasHydrated` flag pattern and delay audio initialization until hydration is complete:

```typescript
// apps/web/src/store/settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  musicVolume: number;
  ambientVolume: number;
  effectsVolume: number;
  showSecondActionBar: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setMusicVolume: (v: number) => void;
  setAmbientVolume: (v: number) => void;
  setEffectsVolume: (v: number) => void;
  setShowSecondActionBar: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 0.5,
      ambientVolume: 0.3,
      effectsVolume: 0.3,
      showSecondActionBar: true,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setMusicVolume: (v) => set({ musicVolume: v }),
      setAmbientVolume: (v) => set({ ambientVolume: v }),
      setEffectsVolume: (v) => set({ effectsVolume: v }),
      setShowSecondActionBar: (v) => set({ showSecondActionBar: v }),
    }),
    {
      name: 'into-the-void-settings',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
```

In the component that initializes audio: wait for `_hasHydrated === true` before reading settings and starting music. Do not start music in `useEffect` if `_hasHydrated` is false — add it as a dependency.

**Warning signs:**
- Volume slider shows correct saved value but audio plays at a different volume for 200-500ms on load
- "Interface settings" toggle (second action bar) resets to default every reload
- Settings appear to save (localStorage key exists) but don't persist across reloads
- Volume jumps audibly when game completes initialization

**Phase to address:** Settings UI phase — store setup with `_hasHydrated` flag must happen before audio manager reads initial volume. Treat this as a prerequisite to music initialization.

---

### Pitfall 6: Entity Anchor Fix Breaks Target Highlight and Selection Indicator Position

**What goes wrong:**
The goal is to fix entity rendering so creatures/NPCs anchor at their base tile position (feet on the tile) rather than at their visual center. The `EntityRenderer.createEntityContainer()` currently places entities using `sprite.setOrigin(0.5, 1.0)` (bottom-center, line 226) which is correct, but the container itself is positioned at `screenPos.y - elevationOffset` and shadow/health bar positions are computed relative to `-this.elevationOffset` (line 208). When the container y-position is adjusted to truly anchor at base tile, the TargetHighlight in `game/rendering/TargetHighlight.ts` positions itself relative to the container's current `y` value.

If entity container y is shifted to fix the anchor, the target highlight (golden ring under the entity) will shift by the same delta and no longer align with the tile grid. The health bar position (`uiBaseY = -this.elevationOffset - spriteHeight * 0.5`, line 281) will also shift relative to the container origin.

**Why it happens:**
The EntityRenderer and TargetHighlight are coupled through the container's absolute screen position. TargetHighlight reads `container.y` to place itself. Fixing the container anchor requires adjusting all child element offsets simultaneously to maintain visual alignment. A fix to container positioning without updating TargetHighlight offsets results in the selection ring appearing above or below the correct tile.

**How to avoid:**
Treat this as a coordinated fix across three files:
1. `EntityRenderer.createEntityContainer()` — adjust container y-position
2. `EntityRenderer.createEntityContainer()` — recalculate `uiBaseY`, shadow position, health bar position relative to the new anchor
3. `TargetHighlight.ts` — verify the ring offset from container y is still correct

Before making changes, document the current visual behavior:
- Container position: at tile screenPos
- Shadow: at y=0 relative to container (correct — at ground level)
- Sprite origin: (0.5, 1.0) — bottom-center (correct)
- TargetHighlight: positioned at container.y + some offset

After the fix, the shadow and TargetHighlight should still sit at the base tile. Only the container's internal offset math changes, not the visual output. Write a visual regression test by taking a screenshot before and after.

**Warning signs:**
- Selection ring appears at the entity's head after anchor fix
- Health bars float above or overlap the entity sprite
- Shadow ellipse is no longer under the entity's feet
- Entities appear to "float" above their tile after fix (anchor was moved wrong direction)

**Phase to address:** Entity Rendering Fix phase — treat as the last feature to implement since it touches shared rendering code. Break it out as a separate commit from audio/menu work to keep the diff reviewable.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `new Audio()` for every SFX call | Simple one-liner | Memory leak after 20+ calls per session | Only for infrequent SFX (quest complete: OK; combat hit: never) |
| Per-component window ESC listeners | Each modal self-contained | 3+ independent listeners fire on same ESC press | Never — use centralized ESC manager |
| Hardcoded z-index values | Fast to write | Conflicts when new modals added, no shared scale | Only if z-index scale CSS variables are also defined |
| Saving settings on every `onChange` of volume slider | Instant feedback | Writes localStorage on every slider tick (100 writes per drag) | Use `onMouseUp`/`onPointerUp` to save on release, not on change |
| Starting music in Phaser scene `create()` | Music starts early | Autoplay blocked silently; hard to debug | Never — use user gesture unlock flow |

---

## Integration Gotchas

Common mistakes when connecting these features to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Phaser keyboard + React ESC | Both systems listen on `window`, neither yields | Centralized ESC manager with `stopPropagation()` in capture phase |
| AudioManager + Zustand settings | Audio manager reads volume before Zustand rehydrates | Wait for `_hasHydrated: true` before initializing audio volume |
| Game menu + existing HUD z-index | Menu inside `.game-ui` stacking context | Use React Portal to `document.body`, define z-index scale |
| Settings store + game store | Separate stores with separate persist keys | Settings store is independent; game store is not persisted |
| EntityRenderer anchor fix + TargetHighlight | Fix EntityRenderer.y without updating TargetHighlight offset | Coordinate fix across EntityRenderer, TargetHighlight, and shadow position in one PR |
| Music + zone transitions | Start new music track without destroying previous | AudioManager.playMusic() must stop previous track before starting new one |
| Volume slider + AudioManager | Slider `onChange` updates store; AudioManager must subscribe | Subscribe AudioManager to settings store in a single `useEffect` in one component |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Creating new HTMLAudio per SFX event | Memory grows 1-2MB per hour; eventual lag | Singleton AudioManager with audio object pool | After ~50 SFX events per session |
| Debouncing settings saves inadequately | localStorage flooded with writes during slider drag | Save on `pointerup`, not `onChange` | Immediately on any slider drag |
| ESC handlers registered but not cleaned up | Handlers accumulate across modal open/close cycles | Use cleanup function returned by `pushEscHandler` | After 10+ modal open/close cycles |
| Entity re-render triggering EntityRenderer recreation | All entity sprites recreated on any Zustand state change | Entity spawning only in WorldScene, driven by socket events, not React render cycle | Already mitigated in current architecture — maintain this pattern |
| Settings store subscriptions not unsubscribed | AudioManager volume never updates after settings change | Use Zustand subscribe with proper cleanup in GameContainer useEffect | First settings change after initial load |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| ESC opens game menu while NPC modal is open | Player expects ESC to close NPC modal; instead menu opens over it | ESC stack: close NPC → close inventory → open menu |
| Volume sliders have no mute indicator | Player turns volume to 0 but no visual confirmation it is muted | Add mute icon that activates at 0; clicking icon restores last volume |
| Settings not applied until "Save" button clicked | Player adjusts volume and closes menu — reverts to old value | Apply settings immediately; use "Reset to defaults" not "Cancel" |
| Second action bar toggle hides bar without warning | Player may have abilities on bar 2 that are now inaccessible | Show tooltip: "Abilities on hidden bar are still active" |
| Game menu blocks all keyboard input | Player presses W/A/S/D to navigate menu, character moves in background | Disable Phaser keyboard plugin while menu is open: `this.input.keyboard.enabled = false` |
| Music starts at full volume regardless of saved settings | Player set music to 10%; next session it blares at 50% | Read volume from settings store after hydration before starting playback |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Audio system:** Music plays in development with DevTools open — verify it also plays after a fresh tab load with no prior user gesture
- [ ] **ESC management:** Modal closes on ESC — verify Phaser does NOT also receive the keydown (check if pathfinding cancels or combat target deselects simultaneously)
- [ ] **Settings persistence:** Settings save correctly — verify they survive a full page reload, not just a component unmount
- [ ] **Game menu:** Menu renders above all other UI — verify it renders above the Phaser canvas, death screen, and alert notifications in all combinations
- [ ] **AudioManager destroy:** Audio stops when game is destroyed — verify `audioManager.destroy()` is called in the `GameContainer` cleanup effect, preventing music from playing after logout
- [ ] **Volume sliders:** Slider moves change audio — verify AudioManager is actually subscribed to settings changes, not just reading initial value at mount
- [ ] **Entity anchor fix:** Creatures now anchor at base — verify TargetHighlight ring still appears under entity feet, not at their center or above their head
- [ ] **Level-up SFX:** Level-up sound triggers — verify it fires from `player:xp` event handler in `gameStore.ts` (line 520) when `leveledUp: true`, not from a React effect watching `player.level`
- [ ] **Music on zone transition:** Music changes per zone — verify old music is stopped before new music starts (no overlapping tracks)
- [ ] **Second action bar toggle:** Toggle hides bar visually — verify the hide setting is also respected after page reload (not just current session)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Audio autoplay never worked | LOW | Add `unlockAudio()` call to first button click handler; existing music init code requires no change |
| ESC fires in both Phaser and React | MEDIUM | Centralize ESC handling — requires touching NpcInteractionModal, QuestLogPanel, LoreCodex, and new game menu; one-time refactor |
| Audio memory leak discovered | LOW | Introduce AudioManager singleton; replace all `new Audio()` calls; affects 1 utility file + callers |
| Game menu behind canvas | LOW | Wrap menu in React Portal; CSS z-index scale fix; no logic changes required |
| Settings don't persist across reload | LOW | Add `_hasHydrated` flag to settings store; delay audio init by adding `_hasHydrated` to effect dependencies |
| Entity anchor fix broke TargetHighlight | MEDIUM | Revert entity anchor fix; re-apply as coordinated change across EntityRenderer + TargetHighlight + shadow in one PR |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Audio autoplay blocked | Audio System | Play music on fresh tab with no prior interaction; confirm it plays after first click |
| ESC fires in both systems | ESC Modal Management | Open NPC modal; press ESC; verify only modal closes, not pathfinding or combat target |
| Audio memory leak | Audio System | Play 30 quest-complete sounds rapidly; check DevTools Memory for HTMLMediaElement accumulation |
| Game menu z-index | Game Menu | Open game menu with NPC modal also open; verify correct layering order |
| Settings race condition | Settings UI | Save music volume at 0; reload page; verify music starts at 0, not 0.5 |
| Entity anchor fix | Entity Rendering Fix | Screenshot entities before and after; selection indicator ring must still sit at entity feet |

---

## Sources

- [Autoplay guide for media and Web Audio APIs — MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) — Autoplay policy, suspended AudioContext, user gesture requirements
- [Autoplay policy in Chrome — Chrome for Developers](https://developer.chrome.com/blog/autoplay/) — Chrome-specific thresholds, media engagement index
- [Navigator: getAutoplayPolicy() method — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getAutoplayPolicy) — Runtime detection of autoplay availability
- [Web Audio Sound objects massive memory leak — Phaser GitHub #2280](https://github.com/phaserjs/phaser/issues/2280) — AudioBufferSourceNode not freed after play
- [Web audio memory leak — Phaser GitHub #5224](https://github.com/phaserjs/phaser/issues/5224) — Listener count increases over time
- [phaser3 memory leak issue — Phaser GitHub #5456](https://github.com/phaserjs/phaser/issues/5456) — All resource types affected
- [Teleportation in React: Positioning, Stacking Context, and Portals — developerway.com](https://www.developerway.com/posts/positioning-and-portals-in-react) — Portal pattern for modal z-index bypass
- [Understanding Z-Index: Stacking Contexts Demystified — pixelfreestudio](https://blog.pixelfreestudio.com/understanding-z-index-stacking-contexts-demystified/) — Stacking context containment rules
- [Unstacking CSS Stacking Contexts — Smashing Magazine](https://www.smashingmagazine.com/2026/01/unstacking-css-stacking-contexts/) — January 2026, stacking context debugging
- [Making Zustand Persist Play Nice with Async Storage — DEV Community](https://dev.to/finalgirl321/making-zustand-persist-play-nice-with-async-storage-react-suspense-part-12-58l1) — `_hasHydrated` flag pattern, onRehydrateStorage
- [Persist using initial state — Zustand GitHub Discussion #2619](https://github.com/pmndrs/zustand/discussions/2619) — Race condition between persist and component mount
- [Retaining Keyboard Inputs with Modal Scenes — Phaser Discourse](https://phaser.discourse.group/t/retaining-keyboard-inputs-with-modal-scenes/2148) — `keyboard.enabled = false` pattern for modal scenes
- [Help with Phaser stealing keypress focus — HTML5 Game Devs](https://www.html5gamedevs.com/topic/11715-help-with-phaser-stealing-keypress-focus/) — Phaser capturing keypress events globally
- [Keyboard events — Notes of Phaser 3 (rexrainbow)](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/keyboardevents/) — KeyboardPlugin disable/enable patterns
- [Audio — Phaser Help documentation](https://docs.phaser.io/phaser/concepts/audio) — WebAudio vs HTMLAudio fallback, sound manager lifecycle
- [Seamless Audio Loops in Phaser — HTML5 Game Devs](https://www.html5gamedevs.com/topic/19711-seamless-audio-loops-in-phaser/) — Loop gapping issues and WebAudio vs HTML Audio tradeoffs
- Codebase analysis: `apps/web/src/utils/audio.ts`, `apps/web/src/game/scenes/WorldScene.ts`, `apps/web/src/ui/GameUI.tsx`, `apps/web/src/ui/GameUI.css`, `apps/web/src/game/rendering/EntityRenderer.ts`, `apps/web/src/game/rendering/DepthSorter.ts`, `apps/web/src/store/gameStore.ts`

---

*Pitfalls research for: React + Phaser 3 — UI Polish & Audio System (v1.21)*
*Researched: 2026-02-26*
