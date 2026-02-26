# Project Research Summary

**Project:** Into the Void v1.21 — UI Polish & Audio
**Domain:** React + Phaser 3 Multiplayer MMO — Game Menu, Audio System, Settings Persistence, ESC Modal Management, Entity Rendering Fix
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

v1.21 is a UI polish and audio milestone layered onto an already-shipped game. The codebase has 7 independently-managed modal panels each with their own ESC key handlers — these fire simultaneously today, closing all open panels at once instead of one at a time. Four music tracks exist in `/public/assets/music/` but are never played. Volume controls, a game menu, and settings persistence are entirely absent. The entity selection indicator floats at visual sprite height rather than at the tile ground plane. All of these are table-stakes features that players notice immediately.

The recommended approach is to build in strict dependency order: entity anchor fix first (independent, validates rendering), then the audio foundation (audioStore + AudioManager singleton before any UI reads it), then the game menu and settings UI (after audioStore exists), then the ESC centralization (after the game menu exists as the "empty stack" target). Stack choices are zero-install — Web Audio API is native, Zustand persist middleware ships with the already-installed Zustand 4.5, and all UI follows existing plain CSS + glassmorphism patterns. Howler.js remains optional and should only be introduced if cross-browser audio edge cases emerge.

The central risk category is the React/Phaser dual-runtime boundary: Phaser owns canvas keyboard events, React owns HUD keyboard events, and both currently listen on `window` independently. Without a centralized ESC manager using `{ capture: true }` and `stopPropagation()`, pressing ESC will fire in both systems simultaneously — closing a modal AND triggering in-game actions (deselecting target, canceling pathfinding). Secondary risks are audio autoplay policy silently blocking music on fresh page loads, and a Zustand persist rehydration race that causes volume to snap audibly from default to saved settings after 200-500ms. Both have well-understood prevention patterns documented in the research.

## Key Findings

### Recommended Stack

The milestone requires no new runtime dependencies. Web Audio API (native browser) handles gapless music looping via `AudioBufferSourceNode` with `loop = true` — HTML5 `<audio>` has an audible gap at the loop point and is unsuitable for continuous background music. `zustand/middleware` persist ships with the already-installed Zustand 4.5 and handles settings persistence with the `partialize` option to avoid serializing non-serializable action functions. All UI is plain CSS consistent with existing modal patterns; glassmorphism variables (`--glass-blur`, `--glass-tint`, `--modal-backdrop-blur`) are already defined in `global.css`.

**Core technologies:**
- **Web Audio API (native)**: Music looping, per-category volume via GainNode graph — gapless loop, no dependency cost
- **Zustand `persist` middleware (bundled)**: Settings persistence to localStorage — already in dep tree, `partialize` avoids JSON serialization of functions
- **Plain CSS + React Portals**: Game menu overlay — consistent with all existing UI; Portal bypasses `.game-ui` stacking context
- **howler.js 2.2.4 (optional)**: Audio abstraction layer — only if cross-browser autoplay edge cases become problematic; 7kB gzipped, drop-in replacement for AudioService internals

### Expected Features

**Must have (table stakes) — v1.21:**
- ESC closes one modal at a time in LIFO order — universal MMO convention; current bug closes all simultaneously
- ESC opens game menu when modal stack is empty — Blizzard-established convention; every MMO player expects this
- Game menu with Resume, Settings, and Logout — structured overlay; Logout must call `gameSocket.disconnect()` then navigate to `/login`
- Settings: Music / Ambient / Effects volume sliders — three categories, real-time feedback, persisted to localStorage
- Settings: Second action bar visibility toggle — power user screen space control, persisted
- Background music looping from 4 existing tracks — 4 MP3 files exist in `/public/assets/music/`, zero content work needed
- Level-up sound effect (reuse quest-complete.mp3) — LevelUpNotification is visual-only; asymmetry vs. quest complete is noticeable
- Quest complete sound updated to respect effectsVolume — currently hardcoded at 0.3 in `audio.ts`
- Entity selection indicator anchored at tile base, not elevated sprite position — floating ring is a visible positioning bug

**Should have (competitive differentiators) — v1.21:**
- Per-category volume (Music / Ambient / Effects) — matches AAA MMO expectations; single master volume is underwhelming
- Real-time volume preview (no Apply button) — sliders update audio as you drag; standard modern UX

**Defer to v1.x (after validation):**
- Music crossfade on zone transition — natural next step once audio manager exists
- Additional SFX (combat hit, item pickup, death)
- Keybind customization in settings

**Defer to v2+:**
- Server-persisted settings (multi-device)
- Graphics quality settings
- Per-biome music tracks

### Architecture Approach

The architecture preserves the existing store-per-concern pattern: a new `audioStore.ts` owns volume levels and mute state (Zustand + persist), `actionBarStore.ts` gets the `showSecondaryBar` toggle (natural owner), and `gameStore.ts` gets `showGameMenu` + `toggleGameMenu()`. An invisible `AudioManager.tsx` React component owns the HTML5 Audio lifecycle and subscribes to `audioStore` — it is mounted once in `GameUI.tsx` and handles `visibilitychange` manually since Phaser's `pauseOnBlur: true` only covers Phaser's own sound pipeline. ESC handling is centralized in a single `window.addEventListener` in `GameUI.tsx` with a priority-ordered if/else chain reading Zustand store snapshots at event time; per-component ESC handlers in `QuestLogPanel.tsx` (lines 30-38), `NpcInteractionModal.tsx` (lines 222-232), and `LoreCodex.tsx` (lines 27-31) are removed. The game menu is rendered as a React Portal to `document.body` to escape the `.game-ui` CSS stacking context.

**Major components:**
1. `audioStore.ts` (NEW) — musicVolume, ambientVolume, effectsVolume, isMuted; localStorage persistence via Zustand persist; `_hasHydrated` flag prevents initialization race condition
2. `AudioManager.tsx` (NEW) — invisible component mounted once in GameUI; owns HTMLAudioElement lifecycle for music, handles visibilitychange, subscribes to audioStore
3. `GameMenu.tsx` (NEW) — React Portal to `document.body`; Settings tab (volume sliders + secondary bar toggle) + Logout button
4. `GameUI.tsx` (MODIFY) — central ESC handler with `{ capture: true }` priority if/else chain; mounts AudioManager and GameMenu conditionally
5. `EntityRenderer.ts` (MODIFY) — fix container.y calculation: `tileBase = screenPos.y + (ISO_TILE_HEIGHT / 2)` at lines 146 and 764

### Critical Pitfalls

1. **Audio autoplay silently blocked** — `AudioContext` and `new Audio().play()` called before user gesture: music never plays, no console error, impossible to debug on production. Prevention: implement "unlock on first interaction" pattern with a module-level `audioUnlocked` flag; defer `play()` until the first keydown or click event fires after game load. Never start music in Phaser scene `create()`.

2. **ESC fires in both Phaser and React simultaneously** — Phaser's KeyboardPlugin and React component handlers both listen on `window`. Without `{ capture: true }` + `e.stopPropagation()` in the central handler, pressing ESC closes a modal AND deselects the in-game combat target in the same frame. Prevention: single handler in `GameUI.tsx` with capture phase, stops propagation after consuming the event.

3. **Audio objects leak memory** — `new Audio()` on every `playQuestCompleteSound()` call accumulates unreleased HTMLAudioElement instances; changing music zone without destroying the previous track results in overlapping music. Prevention: singleton `AudioManager` class that tracks the current music instance and calls `.pause(); .src = ''` before switching, with an SFX pool that reuses elements by key.

4. **Game menu z-index trapped by `.game-ui` stacking context** — `.game-ui` has `position: absolute; z-index: 100` which creates a CSS stacking context; children cannot escape it regardless of their own z-index value. Prevention: render `GameMenu.tsx` via React Portal (`createPortal(element, document.body)`); establish a CSS z-index scale as CSS variables (`--z-hud: 100`, `--z-modal: 500`, `--z-game-menu: 1000`).

5. **Settings persistence race condition causes audible volume snap** — Zustand persist rehydrates asynchronously; AudioManager may start music at default volume (0.4) before the stored value (0.0) is applied, causing an audible snap 200-500ms after load. Prevention: add `_hasHydrated: boolean` flag with `onRehydrateStorage` callback; AudioManager waits for `_hasHydrated === true` before reading initial volume.

6. **Entity anchor fix breaks TargetHighlight and shadow positions** — fixing `container.y` in EntityRenderer shifts all child elements (shadow, health bar, selection indicator). Fix must be coordinated across `EntityRenderer.ts` (`createEntityContainer` + `updateEntityPosition`) and verified against `TargetHighlight.ts`. Prevention: treat as a single coordinated commit; verify shadow and ring still sit at tile base after the change.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Entity Rendering Fix
**Rationale:** Entirely self-contained — no dependencies on audio, ESC stack, or game menu. Zero risk of interference with other work. Validates the `ISO_TILE_HEIGHT / 2` anchor math before the codebase grows. Ships independently as a visible correctness fix.
**Delivers:** Entity sprites, selection rings, and shadows anchored at tile base; no more floating entities on elevated tiles.
**Implements:** `EntityRenderer.ts` lines 146 and 764 — `tileBase = screenPos.y + (ISO_TILE_HEIGHT / 2)`.
**Avoids:** Entity anchor fix coordinated with TargetHighlight and shadow positions in one commit — do not split across phases.

### Phase 2: Audio Foundation
**Rationale:** Audio store and AudioManager must exist before any Settings UI can be built (sliders need something to control). Level-up and quest-complete sound updates are independent of the game menu and can ship here. Establishes the singleton pattern and prevents memory leak from the start.
**Delivers:** `audioStore.ts` with persist + `_hasHydrated` guard; `AudioManager.tsx` with music loop and visibilitychange handler; `playLevelUpSound()` wired to `player:xp` event in `gameStore.ts`; `playQuestCompleteSound()` using effectsVolume instead of hardcoded 0.3.
**Uses:** Web Audio API (native) with HTML5 Audio fallback pattern; Zustand persist middleware.
**Avoids:** Audio autoplay unlock-on-first-gesture pattern; singleton prevents memory leak; `_hasHydrated` prevents rehydration race condition.

### Phase 3: Game Menu + Settings UI
**Rationale:** Requires audioStore from Phase 2 (settings sliders read and write volume). Settings must exist before ESC centralization because the ESC handler's "stack empty" branch opens the game menu. Establishes the React Portal pattern and z-index scale before other modals need to layer above it.
**Delivers:** `GameMenu.tsx` (React Portal targeting `document.body`); Settings tab with Music/Ambient/Effects sliders + secondary action bar toggle; Logout button (`gameSocket.disconnect()` + `navigate('/login')`); `showSecondaryBar` added to `actionBarStore.ts` with localStorage; conditional second ActionBar in `HUD.tsx`.
**Avoids:** React Portal bypasses `.game-ui` stacking context; z-index CSS variable scale prevents future conflicts.

### Phase 4: ESC Centralization + Shortcuts
**Rationale:** Must come last because it depends on the game menu (Phase 3) existing as the ESC "open when stack empty" target. Removes 3 existing per-component ESC handlers — this must happen after all other phases are stable to avoid regressing modal behavior. Menu shortcut button (M key) is added alongside the ESC work.
**Delivers:** Central ESC handler in `GameUI.tsx` with `{ capture: true }` and priority-ordered if/else chain (NPC → Lore → Quest Log → Abilities → Equipment → Inventory → Chat → GameMenu toggle); per-component ESC handlers removed from `QuestLogPanel.tsx`, `NpcInteractionModal.tsx`, `LoreCodex.tsx`; Menu button added to `GameShortcuts.tsx`.
**Avoids:** `{ capture: true }` + `e.stopPropagation()` prevents Phaser from receiving ESC simultaneously; NPC modal `isPending` guard is honored (NPC checked first, close only if not pending).

### Phase Ordering Rationale

- Phase 1 first: zero dependencies, risk-free, immediately visible fix.
- Phase 2 before Phase 3: Settings UI sliders have no effect without audioStore and AudioManager already running.
- Phase 3 before Phase 4: The central ESC handler's final branch (`toggleGameMenu()`) requires `GameMenu.tsx` to exist and `showGameMenu` to be in `gameStore.ts` — otherwise the ESC handler opens nothing.
- Phase 4 last: Removing per-component ESC handlers is safest when all other v1.21 UI work is already tested and stable.
- NpcInteractionModal `isPending` guard is preserved in Phase 4 by making the centralized handler check `isPending` before calling `setInteractingNpc(null)`.

### Research Flags

Phases with well-documented patterns (no additional research needed):
- **Phase 1 (Entity Anchor Fix):** Two-line coordinate calculation change with a clear mathematical basis. All affected files and line numbers are pinpointed.
- **Phase 3 (Game Menu + Settings):** React Portal is official React API; Zustand persist is extensively documented. All integration points confirmed by codebase audit.
- **Phase 4 (ESC Centralization):** Priority-ordered if/else is the standard pattern; all 3 existing ESC handler locations are pinpointed with line numbers.

Phases that may benefit from additional investigation during execution:
- **Phase 2 (Audio Foundation):** Browser autoplay policy behavior varies between Chrome, Firefox, and iOS Safari. The unlock-on-first-gesture pattern is well-understood but iOS Safari has stricter rules and deserves explicit device testing before shipping.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations based on official MDN documentation and direct codebase inspection. No speculative dependencies — all are native APIs or already-installed packages. |
| Features | HIGH | Feature set derived from direct codebase audit (all 7 panels inspected, ESC handlers line-numbered, audio assets confirmed present). Cross-validated against MMO conventions (Albion Online, WoW, FFXIV precedents). |
| Architecture | HIGH | Full codebase read performed — component responsibilities, store shapes, and file locations are confirmed, not inferred. All integration points (specific line numbers in EntityRenderer, QuestLogPanel, NpcInteractionModal, LoreCodex) are verified. |
| Pitfalls | HIGH | Six pitfalls identified from official sources (Chromium autoplay policy, Phaser GitHub issues, Zustand GitHub discussions, CSS stacking context spec). All mapped to specific existing code locations. |

**Overall confidence:** HIGH

### Gaps to Address

- **iOS Safari autoplay behavior:** The unlock-on-first-gesture pattern is documented for Chrome and Firefox. iOS Safari has additional restrictions (volume cannot be set programmatically for the first play on some versions). Validate on a real iOS device or simulator during Phase 2 execution.
- **Phaser keyboard plugin interaction with central ESC handler:** Research confirms `{ capture: true }` + `stopPropagation()` prevents Phaser from receiving the event, but this should be verified against the specific Phaser 3 version in use during Phase 4 testing — Phaser 3.60+ updated its keyboard capture internals.
- **NPC modal `isPending` guard field name:** The research flags this requirement but the exact state field name in `npcStore` should be confirmed against the live store interface before Phase 4 implementation.

## Sources

### Primary (HIGH confidence)
- MDN: Audio for Web Games — Web Audio API GainNode architecture, autoplay policy compliance
- MDN: Autoplay guide for media and Web Audio APIs — Browser autoplay policy lifecycle
- MDN: Web Audio API reference — AudioContext, GainNode, AudioBufferSourceNode
- Chrome for Developers: Autoplay policy — Chrome-specific thresholds and MEI
- howler.js GitHub (v2.2.4, September 2024) — confirmed latest stable release
- Phaser Docs: Audio Concepts — Sound Manager scope confirmed as scene-only
- zustand/pmndrs GitHub — persist + partialize pattern for v4.5
- React Docs: createPortal — official Portal API
- Codebase direct analysis: `apps/web/src/utils/audio.ts`, `apps/web/src/game/rendering/EntityRenderer.ts`, `apps/web/src/store/gameStore.ts`, `apps/web/src/ui/GameUI.tsx`, `QuestLogPanel.tsx` (line 30), `NpcInteractionModal.tsx` (line 222), `LoreCodex.tsx` (line 27)

### Secondary (MEDIUM confidence)
- Albion Online forum: ESC key closes windows — community validation of LIFO ESC convention
- Bradley Bernard: Close stacked modals via ESC (Vue.js pattern) — implementation pattern for modal stack
- web.dev: Game Menu component pattern — design reference
- developerway.com: Positioning, Stacking Context, and Portals in React — Portal z-index bypass rationale
- DEV Community: Making Zustand Persist Play Nice with Async Storage — `_hasHydrated` flag pattern

### Tertiary (confirmatory)
- Phaser GitHub #2280, #5224, #5456 — Audio memory leak issues informing singleton pattern recommendation
- Zustand GitHub Discussion #2619 — persist + component mount race condition
- Smashing Magazine: Unstacking CSS Stacking Contexts (January 2026) — stacking context debugging
- Phaser Discourse: Retaining Keyboard Inputs with Modal Scenes — `keyboard.enabled = false` pattern reference
- HTML5 Game Devs: Phaser stealing keypress focus — Phaser global keyboard capture behavior

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
