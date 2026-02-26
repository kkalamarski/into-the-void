---
phase: 104-moderation-persistence
plan: 01
subsystem: database
tags: [drizzle, postgres, moderation, mute, block]

requires:
  - phase: 103-chat-foundation
    provides: chat infrastructure that moderation builds upon
provides:
  - player_mutes and player_blocks Drizzle ORM tables
  - Seven query functions (addMute, removeMute, getMutes, addBlock, removeBlock, getBlocks, isBlocked)
  - Types exported from @into-the-void/database
affects: [104-02, 105-chatservice, 107-moderation-controls]

tech-stack:
  added: []
  patterns: [idempotent-inserts-onConflictDoNothing, composite-unique-constraints]

key-files:
  created:
    - packages/database/src/schema/moderation.ts
    - packages/database/src/queries/moderation.ts
  modified:
    - packages/database/src/schema/index.ts
    - packages/database/src/queries/index.ts
    - packages/database/src/index.ts

key-decisions:
  - "Used onConflictDoNothing + fallback select for idempotent addMute/addBlock"
  - "isBlocked uses reverse lookup (blockedBy checks if B blocked A)"

patterns-established:
  - "Idempotent insert pattern: onConflictDoNothing().returning() + fallback select for existing row"

requirements-completed: [MOD-04]

duration: 8min
completed: 2026-02-26
---

# Plan 104-01: Moderation Schema Summary

**Drizzle ORM player_mutes and player_blocks tables with seven CRUD query functions exported from @into-the-void/database**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created player_mutes table with UUID PK, character FK references (cascade delete), and composite unique constraint on (characterId, mutedCharacterId)
- Created player_blocks table with same structure for blocked characters
- Implemented seven query functions: addMute, removeMute, getMutes, addBlock, removeBlock, getBlocks, isBlocked
- All types and functions re-exported through barrel files and accessible via @into-the-void/database
- Schema pushed to PostgreSQL via drizzle-kit push

## Task Commits

1. **Task 1: Create moderation schema tables and query functions** - `6720d91` (feat)
2. **Task 2: Push schema to database** - executed as part of Task 1 commit (schema push is runtime-only)

## Files Created/Modified
- `packages/database/src/schema/moderation.ts` - playerMutes and playerBlocks table definitions with composite unique constraints
- `packages/database/src/queries/moderation.ts` - Seven CRUD query functions for mute/block operations
- `packages/database/src/schema/index.ts` - Added moderation re-export
- `packages/database/src/queries/index.ts` - Added moderation queries re-export
- `packages/database/src/index.ts` - Added top-level moderation queries re-export

## Decisions Made
- Used Drizzle object-style extra config for unique constraints (matching character-rewards.ts pattern)
- isBlocked performs reverse lookup: checks if blockedByCharacterId has blocked characterId

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Drizzle unique constraint syntax**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Plan suggested array-style `(table) => [...]` for extra config, but project's Drizzle version requires object-style `(table) => ({...})`
- **Fix:** Changed to object-style matching existing character-rewards.ts pattern
- **Verification:** TypeScript compilation passes cleanly
- **Committed in:** 6720d91

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Syntax fix necessary for compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database persistence layer complete for mute/block operations
- Plan 104-02 can now build REST API endpoints on top of these query functions
- Phase 105 (ChatService) can use isBlocked for server-side block enforcement

---
*Phase: 104-moderation-persistence*
*Completed: 2026-02-26*
