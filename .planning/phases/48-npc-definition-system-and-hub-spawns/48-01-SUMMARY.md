---
phase: 48-npc-definition-system-and-hub-spawns
plan: 01
subsystem: npc
tags: [typescript, registry, discriminated-union, nx, esbuild]

requires:
  - phase: 34-entity-registry
    provides: EntityDefinition/EntityRegistry pattern that NpcDefinition/NpcRegistry mirrors

provides:
  - NpcType union ('trader' | 'guard' | 'faction_rep' | 'ambient' | 'service')
  - NpcDefinition discriminated union with 5 typed variants
  - NpcRegistry singleton with get/has/getAllIds/getByType/getByFaction/size
  - @into-the-void/npcs path alias in tsconfig.base.json
  - packages/npcs nx workspace package with build/lint/test targets

affects:
  - 48-02-npc-definitions (registers concrete NPC definitions)
  - 48-03-hub-spawns (uses NpcRegistry to spawn NPCs in hub zones)

tech-stack:
  added: []
  patterns: [NpcRegistry singleton mirrors EntityRegistry, fallback unknown NPC prevents crashes]

key-files:
  created:
    - packages/npcs/src/types.ts
    - packages/npcs/src/registry.ts
    - packages/npcs/src/index.ts
    - packages/npcs/package.json
    - packages/npcs/project.json
    - packages/npcs/tsconfig.lib.json
  modified:
    - tsconfig.base.json

key-decisions:
  - "NPC package mirrors entities pattern exactly (commonjs type, src/index.ts main, @nx/vite:test)"
  - "NpcFaction uses 'verdant' | 'helix' | 'nexus' | 'neutral' matching lore factions"
  - "Fallback UNKNOWN_NPC is 'ambient' type with magenta color (0xff00ff) matching entities fallback convention"

patterns-established:
  - "NpcRegistry.get(id): returns typed NpcDefinition, falls back to UNKNOWN_NPC with console.warn"
  - "NpcRegistry.getByType(npcType): filters all registered NPCs by type"
  - "NpcRegistry.getByFaction(faction): filters by faction alignment"

duration: 5min
completed: 2026-02-19
---

# Phase 48 Plan 01: NPC Definition System Summary

**@into-the-void/npcs workspace package with NpcDefinition discriminated union (5 types) and NpcRegistry singleton mirroring EntityRegistry pattern**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-19T23:26:18Z
- **Completed:** 2026-02-19T23:31:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created packages/npcs nx workspace package with build/lint/test targets matching entities/items pattern
- Implemented NpcDefinition discriminated union covering Trader, Guard, FactionRep, Ambient, and Service NPC types
- Implemented NpcRegistry singleton with get/has/getAllIds/getByType/getByFaction/size methods
- Registered @into-the-void/npcs path alias in tsconfig.base.json
- Build passes via `nx run npcs:build` producing dist/packages/npcs/

## Task Commits

Each task was committed atomically:

1. **Task 1: Create packages/npcs directory structure and config files** - `b712e22` (chore)
2. **Task 2: Create NPC types and registry implementation** - `e01046d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/npcs/src/types.ts` - NpcType, NpcFaction, DialogueLine, TradeItem, BaseNpcDefinition, and 5 NPC variant interfaces forming NpcDefinition discriminated union
- `packages/npcs/src/registry.ts` - NpcRegistryImpl class with UNKNOWN_NPC fallback; exported as NpcRegistry singleton
- `packages/npcs/src/index.ts` - Barrel exports for all types and NpcRegistry
- `packages/npcs/package.json` - Workspace package config (commonjs, workspace:* deps)
- `packages/npcs/project.json` - NX targets: esbuild build, eslint lint, vite test
- `packages/npcs/tsconfig.lib.json` - Extends tsconfig.base.json with declaration output
- `tsconfig.base.json` - Added @into-the-void/npcs path alias

## Decisions Made

- Package config mirrors entities/items (commonjs, src/index.ts as main) rather than the plan template which suggested esm/dist — following actual project conventions (deviation Rule 1)
- NpcFaction matches lore factions: verdant, helix, nexus, and neutral for unaffiliated
- Fallback UNKNOWN_NPC uses ambient type with magenta color (0xff00ff) — consistent with EntityRegistry fallback pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Pattern match] Used commonjs package type and src/index.ts as main instead of esm/dist**
- **Found during:** Task 1 (config files creation)
- **Issue:** Plan template specified `"type": "module"` and `"main": "./dist/index.js"` but all existing packages (entities, items) use `"type": "commonjs"` and `"main": "./src/index.ts"`. Using the template values would break the project's import resolution.
- **Fix:** Applied actual project pattern: commonjs type, src/index.ts main, dist/packages/npcs output path, @nx/vite:test executor
- **Files modified:** packages/npcs/package.json, packages/npcs/project.json, packages/npcs/tsconfig.lib.json
- **Verification:** `nx run npcs:build` succeeds, producing dist/packages/npcs/index.cjs and index.js
- **Committed in:** b712e22 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (pattern match to existing project conventions)
**Impact on plan:** Essential for build success. No scope creep.

## Issues Encountered

None - build succeeded with standard nx/esbuild warnings about generatePackageJson and lockfile pruning (these are cosmetic warnings present in all packages, not errors).

## Next Phase Readiness

- @into-the-void/npcs package ready for Plan 48-02 to add concrete NPC definitions
- NpcRegistry.registerAll() prepared for calling from definitions module
- Path alias works from any package in the monorepo

---
*Phase: 48-npc-definition-system-and-hub-spawns*
*Completed: 2026-02-19*

## Self-Check: PASSED

All files verified present:
- packages/npcs/src/types.ts - FOUND
- packages/npcs/src/registry.ts - FOUND
- packages/npcs/src/index.ts - FOUND
- packages/npcs/package.json - FOUND
- packages/npcs/project.json - FOUND
- packages/npcs/tsconfig.lib.json - FOUND

All commits verified:
- b712e22 - FOUND
- e01046d - FOUND

Path alias verified:
- @into-the-void/npcs in tsconfig.base.json - FOUND
