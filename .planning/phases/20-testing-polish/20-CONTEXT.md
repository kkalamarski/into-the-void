# Phase 20: Testing & Polish - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate cross-chunk gameplay, resolve edge cases found during testing, and polish the UX for the v1.4 infinite world system. This is a validation and fix phase — no new features.

</domain>

<decisions>
## Implementation Decisions

### Validation Scenarios
- Focus on rapid back-and-forth movement at chunk boundaries (stress test boundary handling)
- Test long-distance pathfinding (click-to-move destinations 2+ chunks away)
- Validate entity visibility comprehensively: cross-chunk tracking AND spawn timing in loading chunks
- Disconnection/reconnection during chunk loading is a critical test scenario (verify state recovery)

### Issue Triage
- Fix all found issues immediately — no deferral for v1.4
- If a fix requires significant refactoring, do it properly (quality over speed)
- Track issues in STATE.md blockers section
- Update PROJECT.md Known Issues after each fix (keep it current)

### UX Polish
- Chunk loading should feel subtle — brief visual cue that something is loading nearby
- Chunk tiles appear instantly (no fade or reveal animation needed)
- Biome indicator already has sufficient polish from Phase 19 hysteresis
- General polish pass with Claude's judgment on visual rough edges

### Memory/Performance Thresholds
- Test 30+ chunk transitions before declaring "no memory leak"
- Memory should return to baseline after transitions (no growth acceptable)
- Use both Browser DevTools profiling AND observed smoothness
- Fix consistent stutters; one-time hiccups are acceptable

### Claude's Discretion
- Specific DevTools profiling approach (heap snapshots, timeline recordings)
- Order and structure of test scenarios
- Visual polish opportunities not explicitly specified

</decisions>

<specifics>
## Specific Ideas

- Rapid boundary crossing is the key stress test (player moving back and forth quickly)
- Long-distance pathfinding validates the full chunk streaming pipeline
- Network resilience (disconnect/reconnect mid-load) is critical for v1.4 quality bar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-testing-polish*
*Context gathered: 2026-02-17*
