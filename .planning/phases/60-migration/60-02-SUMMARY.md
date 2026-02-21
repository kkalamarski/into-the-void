---
phase: 60
plan: "02"
subsystem: tooling
tags: [eslint, validation, migration-safety]
dependency_graph:
  requires: [60-01]
  provides: [compile-time-validation]
  affects: [items-package, ci-pipeline]
tech_stack:
  added:
    - "@typescript-eslint/utils 8.56.0"
  patterns:
    - "Custom ESLint rules for domain-specific validation"
    - "Flat ESLint config (ESLint 8.x)"
key_files:
  created:
    - eslint-rules/no-legacy-stat-buff.ts
    - eslint-rules/tsconfig.json
    - eslint-rules/dist/no-legacy-stat-buff.js
    - eslint.config.mjs
  modified:
    - .gitignore
    - CLAUDE.md
    - package.json
    - pnpm-lock.yaml
decisions:
  - "ESLint custom rules compiled to dist/ and committed (needed at runtime)"
  - "Rule scoped to packages/items/src/definitions/** to avoid false positives"
  - "Rollback documentation added to CLAUDE.md for operational reference"
metrics:
  duration_seconds: 255
  duration_minutes: 4.25
  tasks_completed: 3
  files_created: 4
  files_modified: 4
  commits: 3
  completed_date: "2026-02-21"
---

# Phase 60 Plan 02: Compile-Time Validation Summary

**One-liner:** Custom ESLint rule preventing legacy stat_buff pattern with duration:0, ensuring migration safety

## What Was Built

### Custom ESLint Rule: no-legacy-stat-buff

Created a TypeScript ESLint rule that detects and prevents the deprecated `stat_buff` with `duration: 0` pattern:

**Rule behavior:**
- Flags `{ type: 'stat_buff', ..., duration: 0 }` as an error
- Allows `{ type: 'stat_buff', ..., duration: >0 }` (valid consumable buffs)
- Provides helpful error message directing to stats effect migration guide
- Uses AST analysis to detect object literal patterns

**Integration:**
- Configured in `eslint.config.mjs` with flat config format
- Scoped to `packages/items/src/definitions/**/*.ts` only
- Integrated with Nx workspace lint targets
- TypeScript parser enabled for proper TS file analysis

### Rollback Documentation

Added comprehensive rollback procedure to CLAUDE.md:
- 4-step process using pre-phase-60-migration tag
- Includes verification commands
- Documents how to disable ESLint rule if needed
- Tested and verified rollback capability

## Implementation Details

### Task 1: Custom ESLint Rule (Commit: 281f872)

**Created:**
- `eslint-rules/no-legacy-stat-buff.ts` - Custom ESLint rule implementation
- `eslint-rules/tsconfig.json` - TypeScript config for rule compilation

**Dependencies added:**
- `@typescript-eslint/utils@8.56.0` - ESLint rule creation utilities

**Rule implementation:**
```typescript
// Helper functions for AST traversal
function getLiteralValue(node) { /* ... */ }
function getPropertyValue(props, key) { /* ... */ }

// Rule checks ObjectExpression nodes for:
// 1. type: 'stat_buff'
// 2. duration: 0
// Reports error with migration guidance
```

### Task 2: ESLint Configuration (Commit: f771d3c)

**Created:**
- `eslint.config.mjs` - Flat ESLint config with custom rule
- `eslint-rules/dist/` - Compiled JavaScript rule (committed for runtime use)

**Modified:**
- `.gitignore` - Added exception for `!eslint-rules/dist/` (needed for ESLint runtime)

**Configuration structure:**
```javascript
{
  files: ['packages/items/src/definitions/**/*.ts'],
  languageOptions: { parser: tsParser },
  plugins: { 'custom-rules': { rules: { 'no-legacy-stat-buff': rule } } },
  rules: { 'custom-rules/no-legacy-stat-buff': 'error' }
}
```

**Why commit dist/?** ESLint runs in Node.js and cannot directly import TypeScript files. The compiled JavaScript must be available at runtime.

### Task 3: Rollback Documentation (Commit: b3880d3)

**Modified:**
- `CLAUDE.md` - Added "Migration Rollback Procedures" section

**Rollback procedure includes:**
1. Revert item definitions from pre-phase-60-migration tag
2. Disable ESLint rule in config
3. Verify rollback with grep and tests
4. Commit rollback changes

**Tested:**
- Successfully checked out old files from tag
- Verified old stat_buff pattern present
- Restored migrated state
- All tests passed

## Verification Results

| Criterion | Status | Details |
|-----------|--------|---------|
| ESLint rule exists | ✓ PASS | eslint-rules/no-legacy-stat-buff.ts created and compiled |
| Rule configured | ✓ PASS | eslint.config.mjs enables rule for items definitions |
| Lint passes on migrated code | ✓ PASS | nx run items:lint exits 0 |
| Rule detects legacy pattern | ✓ PASS | Test file with duration:0 triggers error |
| Rollback tag exists | ✓ PASS | pre-phase-60-migration tag found |
| Rollback procedure works | ✓ PASS | Successfully reverted and restored files |
| Tests pass | ✓ PASS | game-logic tests: 16 passed |

### Rule Detection Test

Created temporary file with legacy pattern:
```typescript
const bad = { type: 'stat_buff', stat: 'power', amount: 5, duration: 0 };
```

**Result:** ESLint correctly reported error:
```
Use 'stats' effect type instead of stat_buff with duration: 0.
Example: { type: 'stats', power: 5 } instead of...
```

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Satisfied

**From Phase 60 Research:**
- **MIGR-02:** ✓ Build-time validation prevents regression (ESLint rule)
- **MIGR-03:** ✓ Rollback procedure documented and tested

**Must-haves satisfied:**
- ✓ ESLint fails on stat_buff with duration:0
- ✓ ESLint passes on stat_buff with duration>0 (consumable buffs)
- ✓ Lint command exits 0 after migration complete
- ✓ Rollback procedure documented and tested

## Integration Points

### Affects CI/Pipeline
- Any CI lint job will now fail if legacy pattern reintroduced
- Prevents accidental regression during future item additions
- Developers get immediate feedback in IDE (if ESLint plugin enabled)

### Nx Workspace Integration
- Rule runs via `nx run items:lint` (existing target)
- No changes needed to project.json
- Works with Nx caching (deterministic results)

### Future Item Definitions
- New items must use `{ type: 'stats', ... }` for equipment bonuses
- Consumable buffs can still use `{ type: 'stat_buff', duration: >0 }`
- Clear error messages guide developers to correct pattern

## Key Decisions

**1. Commit compiled dist/ folder**
- **Decision:** Add gitignore exception for eslint-rules/dist/
- **Rationale:** ESLint runs in Node.js, needs JavaScript not TypeScript
- **Alternative considered:** Use tsx or ts-node loader (adds runtime dependency)
- **Outcome:** Simple, no extra dependencies, works reliably

**2. Scope rule to definitions/ only**
- **Decision:** `files: ['packages/items/src/definitions/**/*.ts']`
- **Rationale:** Avoid false positives in test fixtures or migration code
- **Outcome:** Focused validation, no noise

**3. Use flat config format**
- **Decision:** Create eslint.config.mjs (ESLint 8.x flat config)
- **Rationale:** Modern ESLint format, better programmatic control
- **Outcome:** Clean config, easy to extend

## Self-Check: PASSED

**Files created:**
- ✓ eslint-rules/no-legacy-stat-buff.ts exists
- ✓ eslint-rules/tsconfig.json exists
- ✓ eslint-rules/dist/no-legacy-stat-buff.js exists
- ✓ eslint.config.mjs exists

**Commits exist:**
- ✓ 281f872: chore(60-02): create custom ESLint rule
- ✓ f771d3c: chore(60-02): configure ESLint with custom rule
- ✓ b3880d3: docs(60-02): document and verify rollback procedure

**Functionality verified:**
- ✓ Rule detects legacy pattern (tested with temp file)
- ✓ Lint passes on clean codebase
- ✓ Rollback procedure works (tested dry-run)
- ✓ Tests pass (16/16 in game-logic)

## Next Steps

**Phase 60 complete after this plan.** Migration system now includes:
1. ✓ Item definitions migrated (60-01)
2. ✓ Compile-time validation (60-02 - this plan)
3. ✓ Rollback capability (60-02 - this plan)

**Recommendations for Phase 61+:**
- Consider extending rule to check for stats effect structure validity
- Add ESLint rule for other effect types as patterns emerge
- Document stats aggregation order (noted in STATE.md as pending)

## Commits

| Hash | Message |
|------|---------|
| 281f872 | chore(60-02): create custom ESLint rule no-legacy-stat-buff |
| f771d3c | chore(60-02): configure ESLint with custom rule |
| b3880d3 | docs(60-02): document and verify rollback procedure |

**Total commits:** 3 (all task commits, no fixups)
**Execution time:** 4.25 minutes
**Tasks:** 3/3 complete
**Success criteria:** All met ✓

---

## Self-Check Verification

All files exist: ✓
All commits exist: ✓
Functionality verified: ✓

**Result: PASSED** - All claims in summary verified against actual project state.
