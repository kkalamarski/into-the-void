# Phase 100: Audio Foundation - Research

**Researched:** 2026-02-26
**Domain:** Web Audio API, Zustand persist middleware, React event integration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Music behavior**
- Music starts after entering the game world (WorldScene load), not on login/character select screens
- Single ambient track looping for the whole world — no per-biome tracks in this phase
- Gapless loop — seamless audio buffer stitching via Web Audio API, no audible gap at loop point
- Music pauses when browser tab loses focus, resumes where it left off when tab regains focus

**Sound effects triggers**
- Events with SFX: level-up, quest complete, combat hits (deal/take damage), UI interactions (button clicks, modal open/close), gathering/resource collection
- Multiple sounds layer naturally — no priority/ducking system, all concurrent sounds play
- Same SFX can overlap (rapid combat hits = layered copies, not restart)
- UI sounds play everywhere — menus, pause screens, not just during active gameplay

**Volume & controls**
- 3 categories: Music, Effects, Ambient
- Master volume control + per-category sliders (master scales all proportionally)
- Default levels: Music 30%, Effects 70%, Ambient 50%
- Volume settings persist locally via Zustand persist middleware (localStorage)
- Changes heard immediately when adjusting sliders

**Audio assets & feel**
- Music mood: dark ambient / atmospheric (eerie, spacey — Subnautica / Dead Space vibe)
- SFX style: sci-fi with weight (futuristic but grounded — laser-ish combat, mechanical UI clicks, digital gathering chimes, not cartoony)
- Level-up / quest-complete: distinct fanfare moment (~1-2 seconds), celebratory, stands out
- Asset source: free/CC0 assets from the web (Freesound, OpenGameArt, etc.)

### Claude's Discretion
- Exact audio file formats (mp3, ogg, wav) and encoding
- AudioContext initialization and resume strategy for browser autoplay policy
- Audio store internal architecture
- Which specific free assets to use (as long as they match the dark ambient / sci-fi feel)
- Exact fade duration for tab focus/blur transitions

### Deferred Ideas (OUT OF SCOPE)
- Per-biome/zone music tracks with crossfade transitions — future audio expansion phase
- Environmental ambient sounds (wind, rain, creature noises) — future phase
- Combat music intensity changes — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUD-01 | Background music plays on a continuous gapless loop | Web Audio API `AudioBufferSourceNode` with `loop: true` — fetch+decode the file into a buffer, then loop the `AudioBufferSourceNode`. This gives a sample-accurate gapless loop with zero audible gap at the boundary. |
| AUD-02 | Music starts after first user interaction (autoplay policy compliance) | Create `AudioContext` on first user gesture (click/keydown) — or call `ctx.resume()` if context was created suspended. Attach a one-time document-level event listener before any audio plays. |
| AUD-03 | Level-up event plays the quest-complete sound effect | `levelUpDeltas` in `statsStore` is the canonical level-up signal. Subscribe to `useStatsStore` inside the audio manager, detect when `levelUpDeltas` changes from null to a value, and call `audioManager.playEffect('quest-complete')`. The existing `playQuestCompleteSound()` in `utils/audio.ts` already does this via `HTML5 Audio`; this phase replaces that function with a Web Audio API-backed version routed through `audioStore`. |
| AUD-04 | Music, effects, and ambient volumes are independently adjustable | `audioStore` holds `{ master, music, effects, ambient }` gain values. Each category's `GainNode` is set from `music * master`, `effects * master`, `ambient * master`. Changing a slider calls the store setter, which immediately updates the `GainNode.gain.value`. Persisted via Zustand `persist` middleware (same pattern as `authStore`). |
</phase_requirements>

---

## Summary

The project already has `Web Audio API` identified as the implementation technology (STATE.md decision: "Web Audio API (native) for gapless music loop — no new deps needed"). There are already music assets at `apps/web/public/assets/music/` (four `freesound_community-*.mp3` files) and one SFX asset (`assets/audio/quest-complete.mp3`). The existing `utils/audio.ts` contains a thin `HTML5 Audio` wrapper (`playQuestCompleteSound`) that Phase 100 will supersede with a proper Web Audio API service.

The core challenge is three-pronged: (1) gapless looping via `AudioBufferSourceNode` instead of `<audio>` element, (2) browser autoplay policy compliance by deferring `AudioContext` creation/resume until first user gesture, and (3) a Zustand store with `persist` middleware that holds gain values and immediately applies them to the audio graph. All of these are well-supported by Web Audio API primitives available natively in Chromium, Firefox, and Safari — no library required.

SFX integration points are already present in the codebase: `questStore.ts` calls `playQuestCompleteSound()` on `quest:completed`, and `statsStore.ts` computes `levelUpDeltas` when a level-up is detected. These call-sites become the integration points for the new `audioStore` dispatching approach.

**Primary recommendation:** Build a singleton `AudioManager` class (not a React hook, because it holds live Web Audio graph objects) that exposes `playMusic(src)`, `playEffect(sfxName)`, and `setVolume(category, value)`. Wire it to a Zustand `audioStore` for persisted volume state; keep the audio graph object itself outside Zustand (not serializable). Subscribe to `statsStore`/`gameStore` events inside `audioManager.init()` to trigger SFX automatically.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | Native (browser) | Audio graph, mixing, gapless loop | Spec-level gapless buffer loop with `AudioBufferSourceNode.loop`; no audible gap unlike `<audio>` element looping |
| Zustand `persist` middleware | ^4.5.0 (already in dep tree) | Persist volume settings to localStorage | Already used in `authStore` and `combatLogStore`; zero new deps |
| Zustand `immer` middleware | ^11.1.4 (already in dep tree) | Immutable state updates | Already used in `statsStore`, `actionBarStore` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand/middleware` `persist` | (already installed) | localStorage persistence for volume settings | Required — user decisions specify "volume settings persist locally via Zustand persist middleware" |
| `zustand/middleware` `immer` | (already installed) | Cleaner state mutations in audioStore | Optional but consistent with other stores |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Audio API | `<audio>` element | `<audio>` has audible gap at loop point (~100-200ms on most browsers) — ruled out by AUD-01 |
| Web Audio API | Howler.js / Tone.js | No new deps needed; Howler wraps Web Audio API anyway; project is greenfield audio so no migration cost |
| Zustand persist | Manual `localStorage.getItem/setItem` | ActionBarStore uses manual approach; authStore uses `persist` middleware; either works — `persist` is cleaner for this use case with multiple keys |

**Installation:** No new packages required. All dependencies are in the existing dep tree.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/src/
├── store/
│   └── audioStore.ts          # Volume state (persisted), music/sfx trigger actions
├── utils/
│   └── audio.ts               # REPLACE: AudioManager singleton class
└── game/
    └── scenes/
        └── WorldScene.ts      # Call audioManager.startMusic() in create()
```

### Pattern 1: AudioManager Singleton (Non-React audio graph holder)

**What:** A class (not a hook) that owns the `AudioContext`, `GainNode` chain, and `AudioBufferSourceNode` for music. Non-React because the audio graph is imperative and stateful across component lifecycles.

**When to use:** Any time long-lived audio objects must survive React re-renders.

**Example:**

```typescript
// apps/web/src/utils/audio.ts
// Source: MDN Web Audio API docs https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicStarted = false;

  // Call on first user gesture
  async init(): Promise<void> {
    if (this.ctx) return; // Already initialized

    this.ctx = new AudioContext();

    // Build gain node chain: source → categoryGain → masterGain → destination
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.effectsGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.effectsGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Apply persisted volumes from audioStore
    this.syncVolumesFromStore();
  }

  // Resume suspended context (autoplay policy)
  async ensureRunning(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async startMusic(src: string): Promise<void> {
    if (!this.ctx || this.musicStarted) return;

    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    this.musicBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true; // Gapless - sample-accurate loop
    this.musicSource.connect(this.musicGain!);
    this.musicSource.start();
    this.musicStarted = true;
  }

  async playEffect(src: string): Promise<void> {
    if (!this.ctx) return;
    await this.ensureRunning();

    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.effectsGain!);
    source.start(); // Fires and forgets — overlap supported natively
  }

  setMasterVolume(value: number): void {
    if (this.masterGain) this.masterGain.gain.value = value;
  }

  setMusicVolume(value: number): void {
    if (this.musicGain) this.musicGain.gain.value = value;
  }

  setEffectsVolume(value: number): void {
    if (this.effectsGain) this.effectsGain.gain.value = value;
  }

  setAmbientVolume(value: number): void {
    if (this.ambientGain) this.ambientGain.gain.value = value;
  }

  handleVisibilityChange(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) {
      this.ctx.suspend(); // Pause on tab hide
    } else {
      this.ctx.resume(); // Resume on tab show
    }
  }

  private syncVolumesFromStore(): void {
    const { master, music, effects, ambient } = useAudioStore.getState();
    this.setMasterVolume(master);
    this.setMusicVolume(music);
    this.setEffectsVolume(effects);
    this.setAmbientVolume(ambient);
  }
}

export const audioManager = new AudioManager();
```

### Pattern 2: Zustand `persist` store for volume state

**What:** Store holds only serializable state (numeric gain values). Audio graph is NOT stored in Zustand — kept in the `AudioManager` singleton.

**When to use:** Whenever volume state must survive page refresh.

**Example:**

```typescript
// apps/web/src/store/audioStore.ts
// Source: Zustand persist middleware — same pattern as authStore.ts in this codebase

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  master: number;
  music: number;
  effects: number;
  ambient: number;
  setMaster: (v: number) => void;
  setMusic: (v: number) => void;
  setEffects: (v: number) => void;
  setAmbient: (v: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      master: 1.0,
      music: 0.3,    // Default Music 30%
      effects: 0.7,  // Default Effects 70%
      ambient: 0.5,  // Default Ambient 50%

      setMaster: (v) => { set({ master: v }); audioManager.setMasterVolume(v); },
      setMusic: (v) => { set({ music: v }); audioManager.setMusicVolume(v); },
      setEffects: (v) => { set({ effects: v }); audioManager.setEffectsVolume(v); },
      setAmbient: (v) => { set({ ambient: v }); audioManager.setAmbientVolume(v); },
    }),
    {
      name: 'audio-settings',  // localStorage key
      partialize: (state) => ({
        master: state.master,
        music: state.music,
        effects: state.effects,
        ambient: state.ambient,
      }),
    }
  )
);
```

**Note on circular import:** `audioStore.ts` imports `audioManager` from `audio.ts`, and `audio.ts` imports `useAudioStore` from `audioStore.ts`. Break this with a lazy import or by having `audioManager.init()` subscribe to store changes rather than importing the store at module level.

### Pattern 3: Autoplay policy compliance via first-gesture gate

**What:** Create `AudioContext` (or call `ctx.resume()`) only inside a user gesture handler. In a React app, attach a one-time capture-phase event listener on `document` that calls `audioManager.init()` then removes itself.

**When to use:** Mandatory for Chrome, Firefox, Safari — all three require a user gesture before audio plays.

**Example:**

```typescript
// In GameContainer.tsx or a dedicated useAudioInit hook

useEffect(() => {
  const handleFirstGesture = async () => {
    await audioManager.init();
    document.removeEventListener('click', handleFirstGesture);
    document.removeEventListener('keydown', handleFirstGesture);
  };

  document.addEventListener('click', handleFirstGesture, { once: true });
  document.addEventListener('keydown', handleFirstGesture, { once: true });

  return () => {
    document.removeEventListener('click', handleFirstGesture);
    document.removeEventListener('keydown', handleFirstGesture);
  };
}, []);
```

### Pattern 4: Tab visibility pause/resume

**What:** Listen to `document.visibilitychange` and call `audioContext.suspend()` / `audioContext.resume()`.

**Example:**

```typescript
// In the same useEffect as first-gesture gate, or a separate useEffect

useEffect(() => {
  const handleVisibility = () => {
    audioManager.handleVisibilityChange(document.hidden);
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, []);
```

### Pattern 5: WorldScene music start trigger

**What:** Music starts when `WorldScene.create()` is called (entering the game world). This is locked by user decision. The correct hookup is calling `audioManager.startMusic(src)` from `WorldScene.create()`.

**Important:** WorldScene runs in a Phaser context (not React). `audioManager` is a plain singleton so it can be imported directly from a Phaser scene.

```typescript
// In WorldScene.create()
import { audioManager } from '../../utils/audio';

create(): void {
  // ... existing init code ...

  // Start background music (will no-op if AudioContext not yet initialized due to autoplay policy)
  // By the time WorldScene loads, the user has already interacted with the game (login flow)
  audioManager.startMusic('/assets/music/freesound_community-ethereal-ambient-music-55115.mp3');
}
```

**Note:** By the time `WorldScene.create()` runs, the player has definitely interacted with the page (they clicked through login → character select → game). So the `AudioContext` will have been initialized by the first-gesture gate. `startMusic()` must handle the case where `init()` hasn't been called yet (guard with early return).

### Pattern 6: SFX trigger integration into existing stores

**What:** The existing `questStore.ts` already calls `playQuestCompleteSound()`. Replace that call with `audioManager.playEffect('/assets/audio/quest-complete.mp3')`. For level-up, subscribe to `statsStore` changes inside the init phase.

**Level-up SFX (AUD-03):** Per the requirement, level-up plays the quest-complete sound. The signal is `levelUpDeltas` in `statsStore` becoming non-null. Options:
1. Add a `useStatsStore.subscribe` callback in `audioStore.ts` or in `audioManager.init()`.
2. Or call from `statsStore.ts`'s `setStats` action directly after detecting a level-up (same pattern as how `addChatMessage` is called there).

Option 2 is simpler and consistent with how `questStore.ts` already calls `playQuestCompleteSound()`.

**Combat hit SFX:** The `combat:damage` event is handled in `gameStore.ts`. Add `audioManager.playEffect('/assets/audio/sfx-combat-hit.mp3')` inside the handler, distinguishing `isLocalPlayer` (take-hit vs deal-hit if different sounds desired).

**UI SFX:** Wire via React event handlers on button components (onClick, onKeyDown for modal open/close).

**Gathering SFX:** Fire from `gathering:result` handler in `gameStore.ts`.

### Anti-Patterns to Avoid

- **Creating `AudioContext` at module load time:** Will throw `NotAllowedError` in Chrome, silently fail in Safari. Always defer until user gesture.
- **Using `<audio>` element loop for background music:** Introduces audible gap at loop point (the browser reloads/seeks the source). Use `AudioBufferSourceNode` with `loop: true` instead.
- **Storing `AudioContext` or `GainNode` in Zustand:** These are non-serializable objects. Zustand persist will fail to serialize them. Keep the audio graph in the `AudioManager` singleton, only numeric values in the store.
- **Calling `source.start()` twice on the same `AudioBufferSourceNode`:** Throws `InvalidStateError`. Each time a sound plays, create a new `AudioBufferSourceNode`. Fire-and-forget pattern is correct for SFX.
- **Fetching + decoding SFX on every play call:** For frequently played sounds (combat hits), pre-decode and cache the `AudioBuffer` on first load. Subsequent plays create a new source node from the cached buffer.
- **Not handling `AudioContext.state === 'suspended'`:** Safari creates the context in 'suspended' state even after a gesture in some cases. Always call `ctx.resume()` before playing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gapless loop | Custom seek/reload logic on `ended` event | `AudioBufferSourceNode.loop = true` | Buffer-based loop is sample-accurate; seek-on-end has 1-200ms gap |
| Volume persistence | Manual `localStorage.getItem/setItem` calls | Zustand `persist` middleware | Handles hydration, SSR edge cases, type safety; already used in `authStore` |
| Audio loading | Manual `XMLHttpRequest` | `fetch()` + `ctx.decodeAudioData()` | Modern, promise-based, no extra code |
| Concurrent SFX | Audio pool / queue | Fire-and-forget new `AudioBufferSourceNode` per play | Web Audio naturally supports concurrent playback; pool only needed for 50+ simultaneous sounds |

**Key insight:** Web Audio API natively supports everything required here. The complexity is in initialization sequencing (autoplay) and architecture (where to place the audio graph vs. Zustand state), not in the audio primitives themselves.

---

## Common Pitfalls

### Pitfall 1: Autoplay Policy — Context Created But Still Blocked

**What goes wrong:** Developer calls `new AudioContext()` inside the first-gesture handler, but the context still ends up in `suspended` state when `startMusic()` is called later.

**Why it happens:** In some browsers (especially Safari), creating the `AudioContext` inside an async function's continuation (after `await`) is no longer counted as "within a user gesture." The gesture association is lost after the first `await`.

**How to avoid:** Create `AudioContext` synchronously in the gesture handler (before any `await`), then do async work after. Or always call `ctx.resume()` before every playback call, not just on init.

**Warning signs:** Music plays in Chrome but not Safari; `ctx.state` logs as `'suspended'` after `init()`.

### Pitfall 2: SFX Buffer Decode on Every Play (Performance)

**What goes wrong:** Each combat hit calls `fetch()` → `decodeAudioData()`, creating visible CPU spikes during combat.

**Why it happens:** Audio decode is not free — PCM conversion takes ~5-20ms per file.

**How to avoid:** Cache `AudioBuffer` objects after first decode. Map of `src → AudioBuffer` in `AudioManager`. Subsequent calls to `playEffect(src)` skip fetch+decode and create only a new `BufferSourceNode`.

**Warning signs:** CPU usage spikes during rapid combat; occasional audio stutter.

### Pitfall 3: Music Restarts on WorldScene Re-Init

**What goes wrong:** On zone transitions, `WorldScene.create()` is called again (Phaser scene restart), triggering `audioManager.startMusic()` a second time, which would stop + restart the music.

**Why it happens:** Phaser restarts the scene lifecycle on zone transition.

**How to avoid:** Guard in `startMusic()` with `if (this.musicStarted) return;`. Music only starts once per `AudioManager` lifetime. The user decision says "single ambient track looping for the whole world" — no restart needed across zones.

**Warning signs:** Audible music restart/gap when walking between zones.

### Pitfall 4: Volume Setters Race with AudioContext Init

**What goes wrong:** User adjusts volume slider before clicking anywhere in the game world. `audioStore` setters try to call `audioManager.setMusicVolume()`, but `musicGain` is null (context not yet created).

**Why it happens:** The persist middleware restores volume on page load (before first gesture), and if the settings modal is accessible before the game starts, the setters fire on null nodes.

**How to avoid:** Guard all `GainNode.gain.value` assignments with null checks. The AudioManager methods already show `if (this.musicGain) this.musicGain.gain.value = value`. Call `syncVolumesFromStore()` at end of `init()` so persisted volumes apply once the graph exists.

**Warning signs:** `TypeError: Cannot set properties of null` in console.

### Pitfall 5: `visibilitychange` Fires After Page Load

**What goes wrong:** `document.visibilitychange` is attached, and the tab is immediately considered "not hidden" on mount, inadvertently calling `ctx.resume()` before init.

**Why it happens:** `document.hidden` is `false` on initial load, but the event doesn't fire; however, if the handler is written carelessly it may call resume on an uninitialized context.

**How to avoid:** Guard `handleVisibilityChange` with `if (!this.ctx) return;` as the first line.

---

## Code Examples

### SFX Buffer Cache Pattern

```typescript
// Source: MDN AudioBufferSourceNode — verified against Web Audio API spec

class AudioManager {
  private sfxCache: Map<string, AudioBuffer> = new Map();

  async playEffect(src: string): Promise<void> {
    if (!this.ctx || !this.effectsGain) return;
    await this.ensureRunning();

    let buffer = this.sfxCache.get(src);
    if (!buffer) {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.sfxCache.set(src, buffer);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.effectsGain);
    source.start(); // Concurrent with other playing sources — no conflict
    // source auto-disconnects when playback ends (no cleanup needed)
  }
}
```

### Persisted Zustand Store Pattern (same as authStore.ts in codebase)

```typescript
// Source: Zustand docs + authStore.ts in this codebase

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      master: 1.0,
      music: 0.3,
      effects: 0.7,
      ambient: 0.5,
      setMaster: (v) => { set({ master: v }); audioManager.setMasterVolume(v); },
      setMusic: (v) => { set({ music: v }); audioManager.setMusicVolume(v); },
      setEffects: (v) => { set({ effects: v }); audioManager.setEffectsVolume(v); },
      setAmbient: (v) => { set({ ambient: v }); audioManager.setAmbientVolume(v); },
    }),
    {
      name: 'audio-settings',
      partialize: (state) => ({
        master: state.master,
        music: state.music,
        effects: state.effects,
        ambient: state.ambient,
      }),
    }
  )
);
```

### Level-Up SFX Hook in statsStore.ts

```typescript
// Existing level-up detection code in statsStore.ts — add SFX call after levelUpDeltas is set

if (Object.keys(deltas).length > 0) {
  state.levelUpDeltas = deltas;
  // Play quest-complete fanfare for level-up (AUD-03)
  // audioManager imported from '../utils/audio'
  audioManager.playEffect('/assets/audio/quest-complete.mp3');
}
```

---

## Existing Codebase Integration Points

### What already exists

| File | Existing | Phase 100 action |
|------|----------|-----------------|
| `apps/web/src/utils/audio.ts` | `playQuestCompleteSound()` using `new Audio()` (HTML5) | Replace entire file with `AudioManager` class |
| `apps/web/src/store/questStore.ts` | Calls `playQuestCompleteSound()` on `quest:completed` | Replace call with `audioManager.playEffect('/assets/audio/quest-complete.mp3')` |
| `apps/web/src/store/statsStore.ts` | Detects level-up via `levelUpDeltas` | Add `audioManager.playEffect(...)` call after setting `levelUpDeltas` |
| `apps/web/src/store/gameStore.ts` | Handles `combat:damage` socket event | Add `audioManager.playEffect('/assets/audio/sfx-combat-hit.mp3')` in handler |
| `apps/web/public/assets/audio/quest-complete.mp3` | Exists | Re-use as-is for quest-complete and level-up SFX |
| `apps/web/public/assets/music/*.mp3` | 4 files: `ethereal-ambient-music`, `ghosts-play-piano`, `kalimba-atmosphere`, `wandering` | Select one for the background loop; `ethereal-ambient-music-55115.mp3` is the best match for "eerie, spacey" feel |
| `apps/web/src/components/GameContainer.tsx` | First-touch point after game init | Add first-gesture gate + visibilitychange listener here |
| `apps/web/src/game/scenes/WorldScene.ts` | `create()` lifecycle method | Call `audioManager.startMusic()` here |

### New files to create

| File | Purpose |
|------|---------|
| `apps/web/src/store/audioStore.ts` | Zustand persist store for volume state |
| `apps/web/public/assets/audio/sfx-combat-hit.mp3` | Combat hit SFX asset (fetch from Freesound) |
| `apps/web/public/assets/audio/sfx-ui-click.mp3` | UI click SFX asset |
| `apps/web/public/assets/audio/sfx-gathering.mp3` | Gathering/resource collection SFX |

### SFX assets needed (not yet in `/public/assets/audio/`)

The project currently only has `quest-complete.mp3`. Additional SFX required by the locked decisions:

| SFX | Event | Recommended source style |
|-----|-------|--------------------------|
| `sfx-combat-hit-deal.mp3` | Dealing damage (`combat:damage` where attacker = local player) | Laser/energy pulse — sci-fi impact |
| `sfx-combat-hit-take.mp3` | Taking damage (`combat:damage` where defender = local player) | Distinct from deal-hit — heavier thud |
| `sfx-ui-click.mp3` | UI button clicks, modal open/close | Subtle mechanical click |
| `sfx-gathering.mp3` | `gathering:result` success | Digital chime, mineral extraction sound |

These should be fetched from Freesound.org (CC0 or CC BY license) or OpenGameArt.org and placed in `/public/assets/audio/`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<audio>` element for looping music | `AudioBufferSourceNode` with `loop: true` | Web Audio API (2011 spec, widely supported since ~2013) | No audible gap at loop point |
| `Audio.play()` for SFX | `AudioBufferSourceNode` per play | Web Audio API | Supports unlimited concurrent copies without stopping previous |
| `new AudioContext()` at module load | Create on first user gesture | Chrome 71+ autoplay policy (2018) | Required to avoid `NotAllowedError` |

**Deprecated/outdated:**
- `new Audio()` approach in current `utils/audio.ts`: Fine for one-shot non-critical sounds, but does not support the audio graph, gain nodes, or gapless looping needed here.

---

## Open Questions

1. **Which music track to use for the background loop?**
   - What we know: Four tracks exist at `public/assets/music/`. `freesound_community-ethereal-ambient-music-55115.mp3` is the strongest name-match for "dark ambient / atmospheric."
   - What's unclear: Track quality/length not audited during research.
   - Recommendation: Use `ethereal-ambient-music-55115.mp3` as the primary. If it doesn't match the desired feel, `kalimba-atmosphere-32457.mp3` is the backup. This is Claude's discretion.

2. **iOS Safari autoplay behavior**
   - What we know: STATE.md flags "iOS Safari autoplay restrictions may differ from Chrome/Firefox — validate on device during execution."
   - What's unclear: iOS Safari requires a user gesture AND the `AudioContext.resume()` call must happen synchronously within the gesture handler. Async continuations lose the gesture association.
   - Recommendation: Create `AudioContext` synchronously in the gesture handler before any `await` to preserve gesture association. Test on iOS during execution.

3. **Should combat hit SFX distinguish deal-hit vs take-hit?**
   - What we know: The locked decisions list "combat hits (deal/take damage)" as one SFX trigger, not two separate SFX.
   - What's unclear: Whether one SFX file serves both or two files are needed.
   - Recommendation: Start with a single `sfx-combat-hit.mp3` for both. This is Claude's discretion.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Audio API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API — AudioBufferSourceNode, AudioContext, GainNode patterns verified against spec
- MDN AudioBufferSourceNode.loop — https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop — confirms `loop: true` provides gapless looping
- MDN Autoplay guide — https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide — gesture requirement documented
- Zustand persist middleware — already in use in `authStore.ts` (HIGH confidence — codebase evidence)
- Codebase — `apps/web/src/utils/audio.ts`, `apps/web/src/store/questStore.ts`, `apps/web/src/store/statsStore.ts`, `apps/web/src/store/authStore.ts` — direct code inspection

### Secondary (MEDIUM confidence)
- STATE.md decision: "Audio: Web Audio API (native) for gapless music loop — no new deps needed" — confirms technology choice
- Existing music assets confirmed at `apps/web/public/assets/music/` via `find` command

### Tertiary (LOW confidence)
- iOS Safari gesture association behavior — documented in MDN Autoplay guide but iOS-specific quirks require device validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Web Audio API is native, Zustand persist is already installed and in use
- Architecture: HIGH — patterns derived directly from existing codebase conventions and MDN specs
- Pitfalls: HIGH — derived from Web Audio API spec constraints and existing code inspection

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (Web Audio API is stable; Zustand 4.x is stable)
