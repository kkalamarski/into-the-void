---
phase: 100-audio-foundation
plan: 01
subsystem: ui
tags: [web-audio-api, zustand, persist, audio, gapless-loop, sfx-cache]

# Dependency graph
requires: []
provides:
  - AudioManager singleton with Web Audio API gain chain (masterGain -> destination)
  - Gapless music looping via AudioBufferSourceNode with loop=true
  - SFX buffer cache via Map<string, AudioBuffer> for zero-decode-cost repeat plays
  - audioStore with Zustand persist middleware for persistent volume settings
  - 4 independent volume categories: master, music, effects, ambient
affects:
  - 100-02 (callers of playQuestCompleteSound must migrate to audioManager.playEffect)
  - 100-audio-foundation (all subsequent plans build on these two files)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Web Audio API gain chain for hierarchical volume control
    - Lazy require() inside private method to break circular import (audioStore <-> audioManager)
    - Zustand persist partialize to exclude non-serializable functions

key-files:
  created:
    - apps/web/src/store/audioStore.ts
  modified:
    - apps/web/src/utils/audio.ts

key-decisions:
  - "AudioContext created synchronously (before any await) inside init() for Safari gesture association"
  - "Lazy require() in syncVolumesFromStore() breaks circular dependency without dynamic import()"
  - "musicStarted boolean guard prevents music restart on WorldScene re-init / zone transitions"
  - "sfxCache Map stores decoded AudioBuffer per src URL to skip fetch+decode on repeat plays"
  - "stopMusic() added (not in plan) to allow future zone-transition music changes"

patterns-established:
  - "AudioManager: init-on-gesture pattern — AudioContext created lazily, never at module load time"
  - "Volume setters are null-safe — may be called before init() during Zustand persist hydration"
  - "audioStore -> audioManager import is one-way; reverse direction uses lazy require() in method"

requirements-completed: [AUD-01, AUD-02, AUD-04]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 100 Plan 01: Audio Foundation Summary

**Web Audio API AudioManager singleton with 4-category gain chain and Zustand persist audioStore — gapless looping, SFX buffer cache, volume persistence**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-26T00:08:25Z
- **Completed:** 2026-02-26T00:10:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Built AudioManager class with Web Audio gain chain: musicGain/effectsGain/ambientGain -> masterGain -> ctx.destination
- Implemented startMusic() with AudioBufferSourceNode loop=true for gapless playback (no HTML5 Audio gap)
- Implemented playEffect() with sfxCache Map — first play fetches and decodes, all subsequent plays skip decode
- Created audioStore with Zustand persist (localStorage key: audio-settings), defaults master=1.0 / music=0.3 / effects=0.7 / ambient=0.5
- Volume setters in audioStore immediately propagate to AudioManager gain nodes

## Task Commits

Each task was committed atomically:

1. **Task 1: Build AudioManager singleton with Web Audio graph** - `45b39e1` (feat)
2. **Task 2: Create audioStore with Zustand persist middleware** - `a6b1263` (feat)

## Files Created/Modified
- `apps/web/src/utils/audio.ts` - Replaced HTML5 Audio with AudioManager class; exports audioManager singleton
- `apps/web/src/store/audioStore.ts` - New Zustand persist store with 4 volume categories

## Decisions Made
- AudioContext created synchronously inside init() (before any await) — required for Safari's gesture association rule
- Used lazy `require('../store/audioStore')` inside private `syncVolumesFromStore()` method to break the circular dependency (audioStore imports audioManager; audio.ts can't import audioStore at module level)
- Added `stopMusic()` method (slight plan addition, Rule 2) to allow future zone-transition music changes — omitting it would make the musicStarted guard permanently block any music restart

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added stopMusic() method**
- **Found during:** Task 1 (AudioManager implementation)
- **Issue:** Plan included musicStarted guard to prevent restart on zone re-init, but provided no way to stop/restart music for intentional zone transitions. Without stopMusic(), the musicStarted guard would permanently block all music changes after the first start.
- **Fix:** Added stopMusic() that calls source.stop() safely (try/catch), nulls musicSource, and resets musicStarted to false.
- **Files modified:** apps/web/src/utils/audio.ts
- **Verification:** Method present in final file, no impact on other tasks
- **Committed in:** 45b39e1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** stopMusic() is required for musicStarted guard to be useful in practice. No scope creep.

## Issues Encountered
- Expected build failure: `questStore.ts` still imports removed `playQuestCompleteSound` from audio.ts. This is explicitly documented in the plan as expected and will be fixed in Plan 02.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AudioManager singleton and audioStore are fully implemented and ready
- Plan 02 must update questStore.ts (and any other callers) to remove the old playQuestCompleteSound import
- Build will fail until Plan 02 fixes the caller: `apps/web/src/store/questStore.ts:4`

---
*Phase: 100-audio-foundation*
*Completed: 2026-02-26*
