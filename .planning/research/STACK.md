# Stack Research

**Domain:** UI Polish & Audio — Game Menu, Audio System, Settings Persistence, ESC Modal Management
**Researched:** 2026-02-26
**Confidence:** HIGH

## Context

This is a milestone-scoped stack file. The base project stack (React 18, Phaser 3, Zustand 4.5, NestJS, PostgreSQL, Drizzle ORM, NX monorepo) is already validated and in production. This document covers only the NEW capabilities needed for v1.21: audio system with volume controls, settings persistence, and ESC key management.

The existing codebase has:
- `apps/web/src/utils/audio.ts` — fires one-shot sounds via `new Audio()` with no volume control
- 4 music tracks already present in `/public/assets/music/*.mp3`
- 1 SFX track in `/public/assets/audio/quest-complete.mp3`
- Multiple `window.addEventListener('keydown', ...)` listeners in individual components (LoreCodex, NpcInteractionModal, HUD, QuestLogPanel, ActionBar) with no central ESC coordination
- `localStorage` usage pattern already established (actionBarStore, questStore, FogPersistence)
- Zustand 4.5 with `immer` middleware already installed

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Web Audio API | Native (browser) | Music looping, volume control via GainNode, audio graph routing | Provides gapless looping that HTML5 `<audio>` cannot. Multiple GainNode channels (music, ambient, sfx) map directly to the 3-category volume slider requirement. No install needed — native browser API available in all target browsers since 2013. |
| Zustand `persist` middleware | Included in `zustand@4.5` | Settings persistence (volumes, UI toggles) to localStorage | Already in the dependency tree — `zustand/middleware` ships with Zustand. The `partialize` option persists only settings values (numbers/booleans), not functions. Matches existing localStorage pattern used by actionBarStore. No new package required. |
| Plain CSS | CSS3 | Game menu modal, settings panel UI | Consistent with all existing UI. Glassmorphism variables already defined in `global.css` (`--glass-blur`, `--glass-tint`, `--modal-backdrop-blur`). Zero new dependency. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| howler.js | 2.2.4 | Audio manager abstraction over Web Audio API | **OPTIONAL enhancement.** Use if autoplay policy resumption complexity and cross-browser edge cases become problematic during implementation. At 7kB gzipped with no dependencies, cost is low. The project already handles `new Audio()` failures silently — howler.js makes that pattern systematic. Evaluate after implementing raw Web Audio API; switch only if cross-browser bugs appear. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Chrome DevTools > Application > Local Storage | Verify settings persistence key/values | Audio volume settings will be stored under a key like `itv-settings`. Check here to validate persist middleware writes correctly on slider change. |
| Chrome DevTools > Sources > AudioContext inspector | Debug audio graph | Chrome 122+ shows active AudioContext nodes in DevTools. Useful for verifying GainNode connections and detecting leaked audio nodes. |

---

## Installation

```bash
# NO NEW REQUIRED DEPENDENCIES
# All needed capabilities are in existing packages or native browser APIs.

# OPTIONAL: howler.js (only if cross-browser audio edge cases surface)
pnpm add howler
pnpm add -D @types/howler
```

---

## Implementation Patterns

### Pattern 1: Web Audio API Audio Service (Primary Recommendation)

Create `apps/web/src/utils/audioService.ts` as a singleton that owns the `AudioContext`, GainNodes, and music playback loop. This is the appropriate architecture because:

- `AudioContext` must be created once and resumed on user gesture (browser autoplay policy requires a user gesture before `AudioContext` can produce sound)
- GainNodes for music/ambient/sfx are cheap to create but expensive to recreate — own them in a singleton
- The existing `playQuestCompleteSound()` in `audio.ts` can be replaced or delegated to the service

```typescript
// apps/web/src/utils/audioService.ts — skeleton pattern

class AudioService {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private currentMusicSource: AudioBufferSourceNode | null = null;

  // Called once on first user interaction (keydown, click)
  async init(): Promise<void> {
    if (this.ctx) return; // Already initialized
    this.ctx = new AudioContext();
    const master = this.ctx.createGain();
    master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.connect(master);
    this.ambientGain.connect(master);
    this.sfxGain.connect(master);
  }

  // Resume suspended context if needed (Chrome autoplay policy)
  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMusicVolume(value: number): void { // 0.0 to 1.0
    if (this.musicGain) this.musicGain.gain.value = value;
  }

  setSfxVolume(value: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = value;
  }

  setAmbientVolume(value: number): void {
    if (this.ambientGain) this.ambientGain.gain.value = value;
  }

  async playMusic(url: string, loop = true): Promise<void> {
    if (!this.ctx || !this.musicGain) return;
    // Stop existing track
    this.currentMusicSource?.stop();
    // Fetch, decode, create source, connect to musicGain, start looping
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(this.musicGain);
    source.start();
    this.currentMusicSource = source;
  }

  async playSfx(url: string): Promise<void> {
    if (!this.ctx || !this.sfxGain) return;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfxGain);
    source.start();
    // Source auto-disconnects when playback ends
  }
}

export const audioService = new AudioService();
```

**Autoplay policy compliance:** Call `audioService.init()` inside the first keyboard or click event handler that fires after the game loads (e.g., first `keydown` in HUD, or on the game menu open). `AudioContext` created before user gesture starts in `suspended` state and must be `resumed()`.

### Pattern 2: Settings Store with Zustand `persist`

```typescript
// apps/web/src/store/settingsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Audio
  musicVolume: number;       // 0.0 to 1.0
  ambientVolume: number;     // 0.0 to 1.0
  sfxVolume: number;         // 0.0 to 1.0
  // Interface
  showSecondActionBar: boolean;
  // Actions
  setMusicVolume: (v: number) => void;
  setAmbientVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setShowSecondActionBar: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 0.4,
      ambientVolume: 0.2,
      sfxVolume: 0.5,
      showSecondActionBar: true,
      setMusicVolume: (v) => set({ musicVolume: v }),
      setAmbientVolume: (v) => set({ ambientVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      setShowSecondActionBar: (v) => set({ showSecondActionBar: v }),
    }),
    {
      name: 'itv-settings',
      // partialize saves ONLY state values, not action functions.
      // Functions cannot be serialized to JSON.
      partialize: (state) => ({
        musicVolume: state.musicVolume,
        ambientVolume: state.ambientVolume,
        sfxVolume: state.sfxVolume,
        showSecondActionBar: state.showSecondActionBar,
      }),
    }
  )
);
```

Wire `settingsStore` subscriptions to `audioService` setter calls. On store hydration (page load), restore volumes immediately by subscribing to the store's hydration callback or using a `useEffect` that fires on mount.

### Pattern 3: ESC Key Modal Stack Management

The existing codebase has fragmented ESC handling: LoreCodex, NpcInteractionModal, and QuestLogPanel each register their own `window.addEventListener('keydown')` handler. This creates race conditions when multiple modals are open — all handlers fire simultaneously with no priority ordering.

**Solution: centralized modal stack in `gameStore`**

Add to `gameStore`:
```typescript
// Modal stack (ordered by open time — last entry is topmost/most recent)
openModalStack: string[];
pushModal: (id: 'inventory' | 'equipment' | 'abilities' | 'questLog' | 'npc' | 'lore' | 'storage' | 'gameMenu') => void;
popModal: () => void;
```

A single `keydown` handler at the `GameUI` level handles ESC:
```typescript
// In GameUI.tsx — one listener replaces all individual ESC handlers
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const { openModalStack, popModal, setShowGameMenu } = useGameStore.getState();
    if (openModalStack.length > 0) {
      popModal(); // Closes topmost modal, individual panels react via store subscription
    } else {
      setShowGameMenu(true); // No modals open — open game menu
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

Each panel registers itself when mounted:
```typescript
// In InventoryPanel.tsx
useEffect(() => {
  useGameStore.getState().pushModal('inventory');
  return () => useGameStore.getState().popModal();
}, []);
```

Individual components remove their own `Escape` key listeners — the central handler owns it.

**Why this is the right pattern:** The current approach (each component listens independently) means all handlers fire simultaneously. A stack model is the standard approach used in complex game UIs and is what the milestone feature description implies ("close modals one-by-one, then open menu").

### Pattern 4: Game Menu Modal (Pure React + CSS)

The game menu is a React component with a semi-transparent overlay, matching existing modal patterns (DeathScreen, QuestCompleteModal). No new library needed.

```tsx
// apps/web/src/ui/modals/GameMenu.tsx
// Sections:
// - Audio Settings: three <input type="range"> sliders (music, ambient, sfx)
// - Interface Settings: toggle for second action bar visibility
// - Logout button: clears auth store, navigates to login
```

Settings panel uses HTML `<input type="range" min="0" max="1" step="0.01">` — native, accessible, no library needed. Wire `onChange` to `useSettingsStore` setters, which trigger `audioService` volume updates via a `useEffect` subscription.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Web Audio API (direct) | howler.js | Use howler.js if cross-browser audio bugs appear (iOS Safari quirks, Chrome autoplay edge cases). Howler wraps Web Audio API, so switching is non-breaking — just replace AudioService internals. |
| Web Audio API (direct) | Phaser Sound Manager | Phaser has a built-in sound manager (`this.sound`) but it is scoped to Phaser scenes. The game menu, settings panel, and level-up notification are React components outside of Phaser scenes. Accessing Phaser audio from React requires coupling through the Game instance, which is fragile. Do not use. |
| `zustand/middleware` persist | Manual `localStorage` calls | Manual calls (existing pattern in actionBarStore) work but require write boilerplate everywhere. `persist` middleware centralizes this. For a settings store with 4 keys, the middleware is the cleaner choice. |
| Centralized ESC modal stack | Per-component ESC listeners | Per-component listeners (current approach) work for isolated panels but break when multiple modals are open. Stack pattern is required for the milestone's "close one-by-one" requirement. |
| HTML `<input type="range">` | Custom slider library | Native range inputs with CSS styling are sufficient. No visual complexity justifies adding a library. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Phaser Sound Manager for UI sounds | Phaser audio API is scoped to scenes. Accessing it from React components requires `game.getWorldScene().sound` — fragile coupling that breaks if the scene is not active. | Web Audio API singleton service |
| `new Audio()` for music loops | HTML5 Audio has an audible gap at the loop point — browsers re-buffer briefly. `new Audio()` also creates a new element per call, leaking memory if not tracked. Acceptable for one-shot SFX currently; unacceptable for continuous background music. | Web Audio API `AudioBufferSourceNode` with `loop = true` |
| Separate `localStorage` calls for each setting | Duplicates the write-on-change boilerplate already seen in actionBarStore. Settings are a cohesive group — manage them in one `persist` store. | `zustand/middleware` persist with partialize |
| `e.stopPropagation()` on individual modal ESC handlers | Fragile — handler registration order determines which fires first. No guaranteed priority. | Central ESC handler reading modal stack from gameStore |
| Playing music before first user interaction | Browser autoplay policy blocks `AudioContext.resume()` until user gesture. Attempting to play immediately results in silent failure or console errors in Chrome, Safari, and Edge. | Initialize `AudioContext` inside first keyboard/click handler after game loads |
| Preloading all music tracks up front | 4 tracks × average music file size adds several MB to initial load. Use lazy fetch-and-decode inside `playMusic()` instead. | Fetch and decode on first play; cache buffer for subsequent plays with a `Map<string, AudioBuffer>`. |

---

## Stack Patterns by Variant

**If music track needs to crossfade on zone change:**
- Use two `AudioBufferSourceNode` instances connected to `musicGain`, fade one out with `gainNode.gain.linearRampToValueAtTime()` while fading the other in
- Do not create a new `AudioContext` — reuse the singleton

**If the game menu is opened mid-combat:**
- ESC modal stack should NOT pause the game (Phaser continues running)
- The menu is a React overlay; the game canvas keeps running beneath it
- This is intentional for v1.21 — pausing Phaser would require additional scene management work

**If settings need to apply immediately (not on close):**
- Wire slider `onChange` directly to `setMusicVolume` which calls `audioService.setMusicVolume()` in real time
- No "Apply" button needed — real-time feedback is the correct UX for volume sliders

---

## Version Compatibility

| Package | Version in Use | Compatible With | Notes |
|---------|---------------|-----------------|-------|
| zustand | 4.5.x | `zustand/middleware` persist | `persist` middleware is bundled with Zustand 4.x. No separate install. Works with `immer` middleware already in use — wrap order matters: `create(persist(immer(...)))` or `create(immer(persist(...)))` depending on whether persisted state is mutable. |
| Web Audio API | Browser native | All modern browsers | Chrome 35+, Firefox 25+, Safari 14.1+, Edge 79+. Universal in all 2026 browsers. No polyfill needed. |
| howler.js (optional) | 2.2.4 | All modern browsers | Last release September 2024. Stable API, 7kB gzipped. Falls back to HTML5 Audio for environments without Web Audio API. |

---

## Integration Points

### Where `audioService` is initialized
- First `keydown` event in `HUD.tsx` (already has a handler) — add `audioService.init()` call there, or add a one-time `onClick` on the game canvas in `GameContainer`

### Where volume changes are wired
- `settingsStore` subscriptions (via `useEffect` or `subscribe` callback) call `audioService.setMusicVolume(v)` etc.
- Wiring lives in a single `useAudioSync` hook or at the top of `GameUI.tsx`

### Where music plays
- On `zone:state` socket event: pick a track by zone type (hub vs world biome) and call `audioService.playMusic(url)`
- Existing socket handler in `gameStore.ts` is the integration point

### Where level-up SFX fires
- In `statsStore` socket handler (existing `player:xp` or `player:level` event) — add `audioService.playSfx('/assets/audio/quest-complete.mp3')` when `leveledUp === true`

### Where modal stack lives
- Add `openModalStack`, `pushModal`, `popModal` to `gameStore.ts` (already the central UI state store)
- Each panel that can be ESC-closed registers itself on mount and deregisters on unmount

---

## Sources

- [Audio for Web Games — MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) — Web Audio API game patterns, GainNode channel architecture, autoplay policy compliance (HIGH confidence, official)
- [Autoplay guide for media and Web Audio APIs — MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) — Browser autoplay policy behavior, AudioContext suspend/resume lifecycle (HIGH confidence, official)
- [howler.js releases — GitHub](https://github.com/goldfire/howler.js/releases) — Confirmed latest version 2.2.4, September 2024 (HIGH confidence, official)
- [Phaser Audio Concepts — Phaser Docs](https://docs.phaser.io/phaser/concepts/audio) — Phaser Sound Manager scope limitation confirmed (scene-only, game-global management requires manual tracking) (HIGH confidence, official)
- [zustand persist middleware — pmndrs/zustand](https://github.com/pmndrs/zustand) — `persist` + `partialize` pattern confirmed for v4.5 (HIGH confidence, official repo)
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — AudioContext, GainNode, AudioBufferSourceNode API reference (HIGH confidence, official)

---

*Stack research for: UI Polish & Audio — Game Menu, Audio System, Settings Persistence (Into the Void v1.21)*
*Researched: 2026-02-26*
*Confidence: HIGH — all recommendations based on official MDN documentation, official library releases, and direct codebase inspection*
