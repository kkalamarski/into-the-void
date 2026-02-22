# Requirements: Into the Void

**Defined:** 2026-02-22
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.16 Requirements

Requirements for UI Polish milestone. Each maps to roadmap phases.

### NPC Interaction

- [ ] **NPC-01**: Fix double-modal bug where two windows appear for same NPC
- [ ] **NPC-02**: Single unified NPC window with tab navigation (Dialogue/Trade/Quests)
- [ ] **NPC-03**: ESC key properly closes unified window without cascade bugs
- [ ] **NPC-04**: Tab state defaults intelligently (quests tab if NPC has ready quests)

### Quest UI

- [ ] **QUEST-01**: Quest objective tracker HUD widget showing active quest progress
- [ ] **QUEST-02**: Quest tracker positioned near minimap with collapsible objectives
- [ ] **QUEST-03**: Quest markers (yellow !) displayed above NPCs with available quests
- [ ] **QUEST-04**: Quest markers (yellow ?) displayed above NPCs with turn-in ready quests
- [ ] **QUEST-05**: "Quest Complete" banner with visual feedback on completion
- [ ] **QUEST-06**: Quest completion audio cue

### Visual Polish

- [ ] **VIS-01**: Design token expansion (animation timing, shadows, glassmorphism)
- [ ] **VIS-02**: GPU-accelerated hover states on all buttons and tabs
- [ ] **VIS-03**: Smooth transitions on modal open/close (150ms fade)
- [ ] **VIS-04**: Glassmorphism effect on NPC modal (backdrop-filter blur)
- [ ] **VIS-05**: Consistent spacing and typography across all panels
- [ ] **VIS-06**: Active/focus states on interactive elements
- [ ] **VIS-07**: Micro-interactions on button press (scale feedback)

### Error Handling

- [ ] **ERR-01**: Loading spinner on async action buttons during pending state
- [ ] **ERR-02**: Toast notifications for trade/quest errors outside modal
- [ ] **ERR-03**: Prevent modal close while async operation pending

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Quest Features

- **QUEST-10**: Quest reward selection UI (choose between multiple rewards)
- **QUEST-11**: Quest chain visualization ("Part 3 of 5")
- **QUEST-12**: Smart quest tracker sorting by proximity

### Trading Enhancements

- **TRADE-01**: Vendor buyback tab (last 12 sold items)
- **TRADE-02**: Stock visualization for limited items

### UI Theming

- **THEME-01**: Faction-specific UI theming (colors based on player faction)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-accept/auto-complete quests | Removes player agency, breaks immersion |
| Quest mini-map markers with GPS | Removes exploration, use zone hints instead |
| Multiple simultaneous NPC windows | Window management nightmare |
| Auto-sell junk items | Players accidentally lose quest items |
| Immersive dialogue presentation | Requires content restructuring, v2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NPC-01 | — | Pending |
| NPC-02 | — | Pending |
| NPC-03 | — | Pending |
| NPC-04 | — | Pending |
| QUEST-01 | — | Pending |
| QUEST-02 | — | Pending |
| QUEST-03 | — | Pending |
| QUEST-04 | — | Pending |
| QUEST-05 | — | Pending |
| QUEST-06 | — | Pending |
| VIS-01 | — | Pending |
| VIS-02 | — | Pending |
| VIS-03 | — | Pending |
| VIS-04 | — | Pending |
| VIS-05 | — | Pending |
| VIS-06 | — | Pending |
| VIS-07 | — | Pending |
| ERR-01 | — | Pending |
| ERR-02 | — | Pending |
| ERR-03 | — | Pending |

**Coverage:**
- v1.16 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 (pending roadmap)

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after initial definition*
