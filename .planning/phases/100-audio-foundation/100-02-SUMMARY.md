---
phase: 100-audio-foundation
plan: 02
subsystem: ui
tags: [audio, web-audio-api, zustand, react, sfx, phaser]

# Dependency graph
requires:
  - phase: 100-01
    provides: AudioManager singleton (audio.ts) and audioStore with volume settings
provides:
  - GameContainer first-gesture gate initializes AudioContext on first click/keydown
  - Tab visibility listener pauses/resumes music on blur/focus
  - WorldScene.create() triggers background music loop on zone load
  - questStore.quest:completed plays quest-complete SFX via audioManager
  - statsStore level-up detection plays quest-complete SFX via audioManager
  - gameStore combat:damage plays hit SFX via audioManager
  - gameStore gathering:result plays gathering SFX via audioManager
  - Three SFX audio assets (combat hit, UI click, gathering chime)
affects:
  - 100-03
  - 101-game-menu
  - Any future feature that needs audio integration

# Tech tracking
tech-stack:
  added: [ffmpeg (build-time synthesis of SFX assets)]
  patterns: [audioManager.playEffect fire-and-forget for all SFX calls, audioManager.init() on first gesture, handleVisibilityChange for tab blur/focus]

key-files:
  created:
    - apps/web/public/assets/audio/sfx-combat-hit.mp3
    - apps/web/public/assets/audio/sfx-ui-click.mp3
    - apps/web/public/assets/audio/sfx-gathering.mp3
  modified:
    - apps/web/src/components/GameContainer.tsx
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/store/questStore.ts
    - apps/web/src/store/statsStore.ts
    - apps/web/src/store/gameStore.ts

key-decisions:
  - "SFX assets synthesized with ffmpeg (pink noise + sine wave) since no auth-free download sources available at generation time"
  - "combat:damage SFX placed after worldScene guard — plays for all combat events received by this client"
  - "gathering SFX placed after error early-return — only plays on success result"
  - "statsStore audioManager.playEffect called inside immer set() callback — safe because playEffect is async fire-and-forget with no state mutation"

patterns-established:
  - "First-gesture gate: document.addEventListener with { once: true } in GameContainer useEffect"
  - "Tab visibility: separate useEffect for visibilitychange → audioManager.handleVisibilityChange"
  - "Event-driven SFX: audioManager.playEffect('/assets/audio/sfx-name.mp3') in socket event handlers"

requirements-completed: [AUD-01, AUD-02, AUD-03, AUD-04]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 100 Plan 02: Audio Integration Summary

**AudioManager wired into game lifecycle — first-gesture init, background music on WorldScene load, and SFX on quest/level/combat/gathering events, with 3 synthesized audio assets**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-26T13:52:40Z
- **Completed:** 2026-02-26T13:57:48Z
- **Tasks:** 2
- **Files modified:** 5 modified, 3 created

## Accomplishments
- Replaced broken `playQuestCompleteSound` import (build was failing) with `audioManager.playEffect`
- Wired AudioContext initialization to first user gesture (click/keydown) in GameContainer
- Background music starts when WorldScene loads, pauses on tab blur and resumes on focus
- Level-up, quest-complete, combat hit, and gathering success all trigger SFX
- Three new synthesized MP3 SFX assets added (all under 15KB each)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire audio lifecycle into GameContainer, WorldScene, and store event handlers** - `b869429` (feat)
2. **Task 2: Source and add SFX audio assets** - `624759d` (chore)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified
- `apps/web/src/components/GameContainer.tsx` - Added first-gesture gate and visibilitychange listener
- `apps/web/src/game/scenes/WorldScene.ts` - Added audioManager import + startMusic call at end of create()
- `apps/web/src/store/questStore.ts` - Replaced playQuestCompleteSound import with audioManager.playEffect
- `apps/web/src/store/statsStore.ts` - Added audioManager import + playEffect call on level-up detection
- `apps/web/src/store/gameStore.ts` - Added audioManager import + playEffect for combat hit and gathering SFX
- `apps/web/public/assets/audio/sfx-combat-hit.mp3` - Sci-fi impact sound (pink noise + sine, 0.4s, 7KB)
- `apps/web/public/assets/audio/sfx-ui-click.mp3` - Mechanical click (800Hz sine, 0.15s, 3KB)
- `apps/web/public/assets/audio/sfx-gathering.mp3` - Ascending digital chime (600/900Hz, 0.6s, 10KB)

## Decisions Made
- SFX assets synthesized with ffmpeg (pink noise + sine wave synthesis) since direct download from Freesound/Pixabay requires authentication or manual steps
- combat:damage SFX plays for all received damage events (not just local player), since the event only fires when the server sends it and server already filters by zone

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial attempt at background ffmpeg command ran indefinitely (amix without -t flag didn't terminate). Fixed by using explicit `-t` flag on the final ffmpeg output command to cap duration at 0.4s.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All audio integration points from Plan 01 are now connected
- Phase 100 audio foundation complete (Plans 01 + 02)
- UI click SFX asset (`sfx-ui-click.mp3`) is staged and ready for Phase 101 game menu wiring
- AudioManager lifecycle is fully operational for any future audio events

---
*Phase: 100-audio-foundation*
*Completed: 2026-02-26*
