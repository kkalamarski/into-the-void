# Phase 100: Audio Foundation - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Background music plays on a continuous gapless loop and game events trigger sound effects, all volume-controlled per category. This phase delivers the audio system, store, and initial asset integration. Zone-specific music, environmental ambient sounds, and advanced audio features are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Music behavior
- Music starts after entering the game world (WorldScene load), not on login/character select screens
- Single ambient track looping for the whole world — no per-biome tracks in this phase
- Gapless loop — seamless audio buffer stitching via Web Audio API, no audible gap at loop point
- Music pauses when browser tab loses focus, resumes where it left off when tab regains focus

### Sound effects triggers
- Events with SFX: level-up, quest complete, combat hits (deal/take damage), UI interactions (button clicks, modal open/close), gathering/resource collection
- Multiple sounds layer naturally — no priority/ducking system, all concurrent sounds play
- Same SFX can overlap (rapid combat hits = layered copies, not restart)
- UI sounds play everywhere — menus, pause screens, not just during active gameplay

### Volume & controls
- 3 categories: Music, Effects, Ambient
- Master volume control + per-category sliders (master scales all proportionally)
- Default levels: Music 30%, Effects 70%, Ambient 50%
- Volume settings persist locally via Zustand persist middleware (localStorage)
- Changes heard immediately when adjusting sliders

### Audio assets & feel
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

</decisions>

<specifics>
## Specific Ideas

- Dark ambient music should feel like exploring an alien void — not horror, but eerie and vast
- Combat SFX should feel impactful despite the top-down pixel art view — "sci-fi with weight" means you hear the hit land
- UI clicks should be subtle mechanical sounds, not loud or distracting

</specifics>

<deferred>
## Deferred Ideas

- Per-biome/zone music tracks with crossfade transitions — future audio expansion phase
- Environmental ambient sounds (wind, rain, creature noises) — future phase
- Combat music intensity changes — future phase

</deferred>

---

*Phase: 100-audio-foundation*
*Context gathered: 2026-02-26*
