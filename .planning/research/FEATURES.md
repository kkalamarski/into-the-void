# Feature Research

**Domain:** 2D Browser MMO — UI Polish & Audio (v1.21)
**Researched:** 2026-02-26
**Confidence:** HIGH

---

## Context: What Already Exists

Before categorizing features, the existing state must be understood because it determines what is "new" vs what is a fix.

**Already shipped:**
- 7 modal/panel types (Inventory, Equipment, Abilities, Quest Log, NPC Interaction, Lore Codex, Personal Storage) — each has its own independent ESC handler registered via `window.addEventListener('keydown', ...)`
- Quest Complete modal with audio (`new Audio('/assets/audio/quest-complete.mp3')`) — hardcoded 30% volume, no settings
- Level-up notification (visual only, no sound) — `LevelUpNotification.tsx`
- Dual action bar (always visible, no toggle)
- No game menu, no settings UI, no audio manager, no centralized ESC stack

**Known ESC problem:** Each panel/modal registers its own ESC listener independently. When multiple panels are open, pressing ESC fires all handlers simultaneously — every open panel closes at once instead of closing one at a time (LIFO). InventoryPanel, EquipmentPanel, and AbilitiesPanel have no ESC handlers at all — they cannot be closed with ESC.

**Audio assets available (not yet wired to music system):**
- `/public/assets/audio/quest-complete.mp3` (existing SFX)
- `/public/assets/music/freesound_community-ethereal-ambient-music-55115.mp3`
- `/public/assets/music/freesound_community-ghosts-play-piano-26550.mp3`
- `/public/assets/music/freesound_community-kalimba-atmosphere-32457.mp3`
- `/public/assets/music/freesound_community-wandering-6394.mp3`

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| ESC closes one modal at a time (LIFO) | Universal game UI convention — WoW, RuneScape, Albion Online, every desktop MMO. "Close last opened first" is the only acceptable behavior. Albion Online's forum thread explicitly demanded this and it was added. | MEDIUM | Must replace 7 independent ESC listeners with a single centralized modal stack managed in Zustand. Panels register on open, deregister on close. |
| ESC opens game menu when no modals open | Established convention since Blizzard games. Expected by any MMO player as the "all closed, now what?" state. | LOW | Trigger only after stack empties. Add `showGameMenu` boolean to gameStore or settingsStore. |
| Game menu with Resume / Settings / Logout | Players expect a structured overlay when pressing ESC with nothing open. "Resume" returns to game, "Settings" opens settings, "Logout" disconnects and redirects. | LOW | Simple React overlay with 3 buttons. No backend required. Logout calls `gameSocket.disconnect()` then routes to `/login`. |
| Settings panel with audio volume controls | Any game with sound must have volume controls. Separate sliders for Music, Ambient, and Effects are expected — not just a master volume. Streamers and players want fine-grained control. | MEDIUM | 3 range inputs (0–100). Values persist to `localStorage` so they survive page refresh. Applied to audio manager on change in real-time. |
| Background music looping | Silence during gameplay is jarring once players know audio exists. 4 tracks are already present in `/public/assets/music/`. Playing them in a loop on game load is expected. | LOW | Howler.js Howl with `loop: true`. Pick track randomly on load. Fade in on connect. Respect music volume setting. |
| Level-up sound effect | LevelUpNotification already plays visually. Quest complete plays a sound — level-up should too. Players notice the asymmetry. | LOW | Reuse `quest-complete.mp3` (specified in PROJECT.md). Trigger from the same location `player:xp` fires with `leveledUp: true` in gameStore. Apply effects volume. |
| Audio settings persist across sessions | Volume settings lost on page refresh is a universal frustration — documented across Unity, UE4, Godot, and browser game forums. | LOW | Read from `localStorage` on app init. Write on every slider change. Single `audioSettings` JSON key. |
| Interface settings: toggle second action bar | Power users want to reclaim screen space. Second action bar is always visible with no toggle. Settings is the natural home for this. | LOW | Add `showSecondActionBar` boolean to settingsStore or gameStore. ActionBar reads this flag. Persist to localStorage. |
| Entity selection indicator at base tile | Selection ring appears at sprite visual height (elevated by `elevationOffset = 24`). Players expect the ring to sit at ground level — the entity's actual position on the tile, not floating in space. | MEDIUM | Separate the visual sprite offset from the ground-level indicator position. Shadow and selection ring should share the same Y anchor at `screenPos.y` (no offset), while the sprite renders at `y - elevationOffset`. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but add value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-category volume (Music / Ambient / Effects) | Most indie browser games ship only a master volume slider. Three categories match AAA MMO expectations (WoW, FFXIV, RuneScape all have this). Gives players meaningful control. | LOW | Three independent volume multipliers in settingsStore. Audio manager applies correct multiplier per sound category. |
| Real-time volume preview | Sliders that update audio as you drag (no Apply button needed) match modern UX expectations. Players can hear changes immediately. | LOW | Debounced event handler on range input. Update audioManager on each change event. |
| Centralized ESC modal stack with priority | Most browser games never fix the "all modals close at once" bug. A proper LIFO stack is the professional solution — signals a polished product. | MEDIUM | Priority rules: NPC modal honors `isPending` guard before closing. Game menu is lowest priority (only when stack is empty). |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full game pause (freeze Phaser) | Players expect pause menus to stop the game. | Into the Void is multiplayer — pausing the client doesn't pause the server. Other players keep moving. Entity positions desync. Players can take damage during menu. | Game menu is an overlay that does not pause the Phaser scene. Consistent with all MMOs. Note this in menu UI if needed. |
| Master volume only (no categories) | Simpler to implement. | Discards ambient/music/effects distinction. Players who want music at 0% but SFX at 100% (common for streamers, people with audio sensitivities) have no option. | Three independent sliders with sensible defaults (music: 40%, ambient: 50%, effects: 70%). |
| Howler.js for one-shot SFX | Howler.js is the "correct" tool for game audio. | Adds a dependency for something `new Audio()` already handles. One-shot SFX (quest complete, level-up) don't need loop management or fade APIs. | Use Howler.js only for music looping. Keep `new Audio()` for one-shot SFX with volume applied before play. |
| react-howler declarative wrapper | Popular npm package for audio in React components. | Audio lifecycle should not be tied to component mount/unmount. Music looping is application-level, not component-level. | Singleton `audioManager` module (imperative), called from event handlers and store actions. |
| Keybind customization in settings | Natural extension of a settings panel. | High complexity — requires input capture UI, conflict detection, and persistence schema. Disproportionate to v1.21 scope. | Hardcoded keys are fine now. Flag for a future UI polish milestone. |
| Video/graphics quality settings | Players expect modern settings menus to include graphics options. | Phaser renders to canvas — resolution and quality control is at scene level, not a simple CSS slider. Wrong scope for v1.21. | Defer until performance complaints warrant investigation. |
| Save settings to server/database | Settings feel complete if they follow across devices. | Over-engineering for v1.21. Adds API endpoint, schema migration, and synchronization logic. | localStorage is sufficient. Server persistence is a future enhancement if multi-device usage becomes common. |
| Autoplay music without user interaction | Feels immersive to have music start immediately. | Browser autoplay policy blocks audio that starts before user interaction. Will fail silently or console-error on Chrome, Firefox, Safari. | Play music on first user interaction (click, keypress). The existing `playQuestCompleteSound()` already handles this correctly with `.catch()`. |

---

## Feature Dependencies

```
[Centralized ESC Modal Stack]
    └──requires──> [Modal open/close state unified via stack in Zustand]
                       └──requires──> [Remove 7 independent ESC listeners]
                           └──enables──> [ESC opens Game Menu when stack empty]

[Game Menu]
    └──requires──> [ESC Modal Stack (game menu is lowest priority)]
    └──contains──> [Settings Panel link]
    └──contains──> [Logout Button]

[Settings Panel]
    └──contains──> [Audio Settings (Music / Ambient / Effects sliders)]
    └──contains──> [Interface Settings (toggle second action bar)]
    └──requires──> [Audio Manager to exist before sliders have effect]

[Audio Manager (singleton)]
    └──controls──> [Background Music (Howler.js loop)]
    └──controls──> [Level-up Sound (new Audio + effects volume)]
    └──controls──> [Quest Complete Sound (update existing to use effectsVolume)]
    └──persists via──> [localStorage audioSettings key]
    └──reads from──> [app init / settings slider change]

[Background Music]
    └──requires──> [Audio Manager]
    └──volume controlled by──> [Music volume slider in Settings]
    └──starts on──> [first user interaction after WebSocket connect]

[Level-up Sound]
    └──triggered by──> [player:xp event with leveledUp: true in gameStore.ts]
    └──volume controlled by──> [Effects volume from Audio Manager]

[Quest Complete Sound (existing)]
    └──update to read──> [Effects volume from Audio Manager]
    └──currently: hardcoded 0.3 in audio.ts]

[Interface Settings: Second Action Bar Toggle]
    └──adds to──> [settingsStore or gameStore]
    └──read by──> [ActionBar.tsx]
    └──persists via──> [localStorage]

[Entity Base Anchor Fix]
    └──standalone Phaser rendering fix — no dependencies on other v1.21 features]
    └──modifies──> [EntityRenderer.ts: selection indicator Y relative to ground]
    └──modifies or creates──> [TargetHighlight positioning]
```

### Dependency Notes

- **ESC modal stack requires removing 7 independent listeners:** `LoreCodex.tsx` (line 27-31), `NpcInteractionModal.tsx` (line 222-233), `QuestLogPanel.tsx` (line 30-38) all have active ESC listeners. `InventoryPanel`, `EquipmentPanel`, `AbilitiesPanel` have none. All must be unified under one stack-based handler.

- **NpcInteractionModal special case:** Has an `isPending` guard — ESC is blocked during pending trade/quest operations. The centralized stack must honor this: before popping NPC modal, check `isPending` and skip if true.

- **Settings panel requires audio manager:** Sliders are meaningless without something to control. Audio manager should be initialized at app startup (not when settings panel renders).

- **Level-up sound update needs audio manager:** Currently `playQuestCompleteSound()` uses `AUDIO_VOLUME = 0.3` hardcoded. After this milestone, both quest complete and level-up sounds should read `effectsVolume` from the audio manager.

- **Entity anchor fix is independent:** Standalone change to `EntityRenderer.ts`. No connection to ESC stack, audio, or settings. Can be implemented in any phase.

---

## MVP Definition

### Launch With (v1.21)

- [ ] Centralized ESC modal stack — fixes "all modals close at once" bug, enables one-by-one closing
- [ ] ESC opens game menu when stack is empty
- [ ] Game menu with Resume, Settings, and Logout
- [ ] Settings panel: Music / Ambient / Effects volume sliders (real-time, persisted to localStorage)
- [ ] Settings panel: toggle second action bar visibility (persisted)
- [ ] Background music looping from existing tracks, respects music volume setting
- [ ] Level-up sound effect (reuse quest-complete.mp3) with effects volume applied
- [ ] Quest complete sound updated to use effects volume (not hardcoded 0.3)
- [ ] Entity selection indicator anchored at base tile (ground level), not at elevated sprite position

### Add After Validation (v1.x)

- [ ] Music cross-fade on zone transition — polish, medium complexity, natural next step once audio manager exists
- [ ] Additional SFX (combat hit, item pickup, death) — expand audio utility with audio manager established
- [ ] Keybind customization in settings — once settings panel exists, keybinds are the natural extension

### Future Consideration (v2+)

- [ ] Server-persisted settings — needed only if multi-device usage is reported
- [ ] Graphics quality settings — only if performance complaints arise
- [ ] Per-biome music tracks — content pipeline decision once music system proves stable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Centralized ESC modal stack | HIGH (fixes live bug) | MEDIUM | P1 |
| ESC opens game menu | HIGH | LOW | P1 |
| Game menu (Resume / Settings / Logout) | HIGH | LOW | P1 |
| Audio settings (3 category sliders) | HIGH | LOW | P1 |
| localStorage persistence for audio | HIGH | LOW | P1 |
| Background music loop | HIGH | LOW | P1 |
| Level-up sound effect | MEDIUM | LOW | P1 |
| Quest complete sound uses effectsVolume | MEDIUM | LOW | P1 |
| Interface settings (2nd action bar toggle) | MEDIUM | LOW | P1 |
| Entity anchor fix (ground-level selection ring) | HIGH (visual correctness) | MEDIUM | P1 |
| Music cross-fade on zone transition | MEDIUM | MEDIUM | P2 |
| Additional combat/pickup SFX | MEDIUM | LOW | P2 |
| Keybind customization | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.21
- P2: Should have when capacity allows
- P3: Nice to have, future milestone

---

## Implementation Notes (Inform Roadmap Phase Splitting)

### ESC Modal Stack — Central Architectural Change

The canonical pattern (confirmed by Albion Online forum thread, Vue.js stacked modal article, LIFO convention in all major UI kits):

1. Maintain `modalStack: string[]` in Zustand (or a dedicated `modalStore`)
2. Each panel calls `pushModal('inventory')` on open, `popModal('inventory')` on close
3. Single global ESC keydown listener (in `GameUI.tsx` or a dedicated hook) pops the top item
4. When stack is empty and ESC pressed, open game menu
5. NpcInteractionModal's `isPending` guard must be honored — pop checks isPending before closing

This is the foundation other features depend on. Should be Phase 1 of the milestone.

### Audio Manager — Singleton Module Pattern

Use a singleton module-level manager (`audioManager.ts`) rather than a React component. This ensures audio lifecycle is not tied to component mount/unmount.

```typescript
// apps/web/src/utils/audioManager.ts
interface AudioSettings {
  musicVolume: number;    // 0–1, default 0.4
  ambientVolume: number;  // 0–1, default 0.5
  effectsVolume: number;  // 0–1, default 0.7
}

class AudioManager {
  loadSettings(): void   // reads from localStorage on init
  saveSettings(): void   // writes to localStorage on change
  setMusicVolume(v: number): void
  setAmbientVolume(v: number): void
  setEffectsVolume(v: number): void
  playMusic(src: string): void  // Howler.js Howl, loop:true
  playEffect(src: string): void // new Audio() + effectsVolume
  stopMusic(): void
}

export const audioManager = new AudioManager();
```

Howler.js recommended for music (loop, fade, Web Audio API backend). `new Audio()` stays for one-shot SFX (existing pattern) with volume from audioManager applied before play.

### Entity Rendering Fix — Anchor Point Separation

Current issue in `EntityRenderer.ts`:
- `elevationOffset = 24` (entity sprite hovers above ground)
- Container position: `screenPos.y - (elevation * ELEVATION_HEIGHT_STEP)`
- Sprite inside container: `y = -this.elevationOffset`
- Selection indicator: positioned relative to container, inherits elevation visually

Fix: Selection indicator (ring/circle) should render at `y = 0` relative to the container base (which is screen position of tile center). The sprite renders at `y = -elevationOffset`. Shadow already does this correctly with `setOrigin(0.5, 0.5)` at ground. Selection ring must match the shadow position, not the sprite visual position.

---

## Sources

- [Albion Online: ESC key should close windows](https://forum.albiononline.com/index.php/Thread/4151-Esc-key-should-close-windows/) — MEDIUM confidence (community validation of convention)
- [Simply Accessible: ESC key to close modals and menus](http://simplyaccessible.com/article/closing-modals/) — HIGH confidence (accessibility standard)
- [Bradley Bernard: Close stacked modals via ESC (Vue.js pattern)](https://bradleybernard.com/blog/close-stacked-modals-intelligently-via-esc-hotkey-in-vue-js) — MEDIUM confidence (implementation pattern)
- [Howler.js official](https://howlerjs.com/) — HIGH confidence (official docs)
- [Howler.js npm](https://www.npmjs.com/package/howler) — HIGH confidence (official package)
- [MDN Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) — HIGH confidence (official spec)
- [web.dev: Game Menu component pattern](https://web.dev/patterns/components/game-menu) — MEDIUM confidence (design reference)
- Codebase direct analysis: `apps/web/src/utils/audio.ts`, `apps/web/src/game/rendering/EntityRenderer.ts`, `apps/web/src/store/gameStore.ts`, `apps/web/src/ui/GameUI.tsx`, panel ESC handler audit — HIGH confidence (source of truth)

---

*Feature research for: Into the Void v1.21 UI Polish & Audio*
*Researched: 2026-02-26*
