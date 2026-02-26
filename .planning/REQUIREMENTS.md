# Requirements: Into the Void

**Defined:** 2026-02-26
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.21 Requirements

Requirements for UI Polish & Audio milestone. Each maps to roadmap phases.

### ESC Management

- [ ] **ESC-01**: Player can close the topmost open modal by pressing ESC
- [ ] **ESC-02**: ESC closes modals one-by-one in LIFO order until none remain
- [ ] **ESC-03**: Pressing ESC when no modals are open opens the game menu

### Audio

- [ ] **AUD-01**: Background music plays on a continuous gapless loop
- [ ] **AUD-02**: Music starts after first user interaction (autoplay policy compliance)
- [ ] **AUD-03**: Level-up event plays the quest-complete sound effect
- [ ] **AUD-04**: Music, effects, and ambient volumes are independently adjustable

### Game Menu & Settings

- [ ] **MENU-01**: Player can open/close game menu overlay
- [ ] **MENU-02**: Game menu shows audio settings with sliders for music, effects, and ambient
- [ ] **MENU-03**: Game menu shows interface setting to toggle secondary action bar visibility
- [ ] **MENU-04**: Player can log out from the game menu
- [ ] **MENU-05**: Settings persist across browser sessions via localStorage

### Entity Rendering

- [x] **REND-01**: Entities render anchored at base tile position, not elevated above it
- [x] **REND-02**: Selection indicator aligns with entity base tile position

## Future Requirements

None identified for this milestone.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Zone-specific music tracks | Single playlist loop sufficient for v1.21; zone-aware audio in future |
| Ambient sound effects (environmental) | Ambient volume slider included but no ambient audio assets exist yet |
| Keybinding remapping | Settings scope limited to audio + interface for this milestone |
| Graphics settings (quality, resolution) | Not needed for color-tile rendering |
| Accessibility settings (colorblind, font size) | Future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ESC-01 | Phase 102 | Pending |
| ESC-02 | Phase 102 | Pending |
| ESC-03 | Phase 102 | Pending |
| AUD-01 | Phase 100 | Pending |
| AUD-02 | Phase 100 | Pending |
| AUD-03 | Phase 100 | Pending |
| AUD-04 | Phase 100 | Pending |
| MENU-01 | Phase 101 | Pending |
| MENU-02 | Phase 101 | Pending |
| MENU-03 | Phase 101 | Pending |
| MENU-04 | Phase 101 | Pending |
| MENU-05 | Phase 101 | Pending |
| REND-01 | Phase 99 | Complete |
| REND-02 | Phase 99 | Complete |

**Coverage:**
- v1.21 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 — traceability populated after roadmap creation*
