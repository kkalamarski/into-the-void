# Requirements: Into the Void

**Defined:** 2026-03-25
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.34 Requirements

Requirements for gameplay bugfix milestone.

### Debug Overlay

- [ ] **DBG-01**: Debug overlay shows correct tile type and elevation for the player's current position, using zone-local coordinates for array lookup

### Creature AI

- [ ] **AI-01**: Creatures move according to their behavior (wander, flee, chase) — visible movement on screen within a few seconds of zone load
- [ ] **AI-02**: Creature position updates broadcast to client and rendered correctly

### Abilities

- [ ] **ABIL-01**: Player can attack a creature by selecting it and pressing an ability hotkey — damage dealt, floating numbers visible
- [ ] **ABIL-02**: Player can gather from a resource node by selecting it and pressing gather — mini-game starts
- [ ] **ABIL-03**: When an ability fails, the player sees a visible error message (not silent failure)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New abilities or combat features | Fix existing, don't add new |
| Creature pixel movement rewrite | Fix current tile-based AI first, pixel movement for creatures is a separate milestone |
| New gathering mechanics | Fix existing gather flow |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DBG-01 | Phase 159 | Pending |
| AI-01 | Phase 159 | Pending |
| AI-02 | Phase 159 | Pending |
| ABIL-01 | Phase 160 | Pending |
| ABIL-02 | Phase 160 | Pending |
| ABIL-03 | Phase 160 | Pending |

**Coverage:**
- v1.34 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
