# Codebase Structure

**Analysis Date:** 2026-02-13

## Directory Layout

```
into-the-void/
├── apps/                       # Independent applications
│   ├── api/                    # REST API for auth & character management
│   ├── game-server/            # WebSocket game server
│   └── web/                    # React + Phaser game client
├── packages/                   # Shared libraries
│   ├── database/               # ORM schema, migrations, queries
│   ├── game-logic/             # Game rules (movement, combat, visibility)
│   ├── shared-types/           # TypeScript type definitions
│   └── world-gen/              # Procedural world generation
├── lore/                       # Game narrative and world documents
├── .planning/codebase/         # Analysis documents (this directory)
├── nx.json                     # NX workspace configuration
├── tsconfig.base.json          # Base TypeScript configuration
├── package.json                # Workspace dependencies
└── .prettierrc                 # Code formatting rules
```

## Directory Purposes

**apps/api:**
- Purpose: HTTP REST API for account and character management
- Contains: NestJS controllers, services, middleware, DTOs
- Key files: `src/main.ts` (entry), `src/app/app.module.ts` (module setup)

**apps/game-server:**
- Purpose: Real-time game simulation and player synchronization
- Contains: WebSocket gateway, game logic orchestration, player/zone management
- Key files: `src/main.ts` (entry), `src/game/game.gateway.ts` (WebSocket handlers)

**apps/web:**
- Purpose: Browser-based game client and UI
- Contains: React components, Phaser scenes, socket client, Zustand store
- Key files: `src/main.tsx` (entry), `src/App.tsx` (React root), `src/game/Game.ts` (Phaser setup)

**packages/database:**
- Purpose: Data persistence layer with type-safe queries
- Contains: Drizzle ORM schema definitions, query functions, database client
- Key files: `src/client.ts` (connection), `src/schema/index.ts` (all tables), `src/queries/` (typed queries)

**packages/game-logic:**
- Purpose: Game rules and mechanics isolated from runtime
- Contains: Movement validation, combat calculations, pathfinding, visibility
- Key files: `src/movement/validation.ts`, `src/combat/damage.ts`, `src/interaction/interaction.ts`

**packages/shared-types:**
- Purpose: Single source of truth for all TypeScript types
- Contains: Core types (Player, Entity, Position), game types (Combat, Inventory), network events
- Key files: `src/index.ts` (barrel export), `src/core/` (domain), `src/network/` (events)

**packages/world-gen:**
- Purpose: Procedural generation for infinite, reproducible world
- Contains: Simplex noise, chunk generation, biome logic, spawn placement
- Key files: `src/generation/chunk.ts`, `src/noise/simplex.ts`, `src/random/seeded-random.ts`

**lore/:**
- Purpose: World-building documentation and narrative content
- Contains: Faction descriptions, setting documents, game lore
- Key files: None specified (narrative documents)

**.planning/codebase/:**
- Purpose: Analysis documents for code navigation and decision-making
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Key files: These documents guide future development

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Bootstraps NestJS REST API server
- `apps/game-server/src/main.ts`: Bootstraps NestJS WebSocket server
- `apps/web/src/main.tsx`: Mounts React application to DOM

**Configuration:**
- `tsconfig.base.json`: Shared TypeScript settings and path aliases
- `nx.json`: Monorepo structure, caching, plugins
- `package.json`: Workspace dependencies and npm scripts
- `.prettierrc`: Code formatting rules (2-space indent, single quotes)

**Core Logic:**
- `apps/api/src/auth/auth.service.ts`: JWT generation, password hashing, token validation
- `apps/game-server/src/game/game.service.ts`: Movement, interactions, zone state
- `apps/game-server/src/zones/zones.service.ts`: Zone loading, entity management, cleanup
- `packages/database/src/client.ts`: PostgreSQL connection and Drizzle setup
- `packages/game-logic/src/movement/validation.ts`: Movement rules
- `packages/world-gen/src/generation/chunk.ts`: Terrain and spawn generation

**Networking & State:**
- `apps/web/src/network/socket.ts`: Socket.IO singleton client
- `apps/web/src/store/gameStore.ts`: Zustand state management
- `apps/game-server/src/game/game.gateway.ts`: WebSocket event handlers
- `packages/shared-types/src/network/events.ts`: Socket event type definitions

**Rendering:**
- `apps/web/src/game/Game.ts`: Phaser game initialization
- `apps/web/src/game/scenes/WorldScene.ts`: Main game world rendering
- `apps/web/src/game/scenes/BootScene.ts`: Asset initialization
- `apps/web/src/game/scenes/PreloadScene.ts`: Asset loading
- `apps/web/src/ui/GameUI.tsx`: React UI overlay

## Naming Conventions

**Files:**
- `.service.ts`: NestJS injectable services (business logic)
- `.controller.ts`: NestJS HTTP endpoints
- `.gateway.ts`: NestJS WebSocket handlers
- `.module.ts`: NestJS module declarations
- `.dto.ts`: Data transfer objects (input validation)
- `.ts`: Pure functions (game-logic package)
- `.tsx`: React components
- `index.ts`: Barrel exports

**Directories:**
- `src/`: Source code
- `src/app/`: Application bootstrap and configuration
- `src/auth/`: Authentication logic
- `src/characters/`: Character CRUD operations
- `src/game/`: Game simulation logic
- `src/zones/`: Zone/chunk management
- `src/database/`: Database client setup
- `src/ui/`: React UI components
- `src/network/`: Network communication
- `src/store/`: State management
- `src/game/scenes/`: Phaser scenes
- `src/schema/`: ORM table definitions
- `src/queries/`: Typed database queries
- `src/core/`: Core type definitions
- `src/game/`: Game-specific types
- `src/network/`: Network type definitions

**Variables & Functions:**
- camelCase: functions, variables, properties
- PascalCase: classes, interfaces, types, components
- UPPERCASE: constants, enum values
- prefix `$`: reactive/observable streams (Zustand selectors, RxJS)
- prefix `handle`: event handlers
- prefix `on`: lifecycle callbacks, event listeners
- prefix `get`: methods that retrieve/compute values
- prefix `set`: methods that update state

**Classes & Types:**
- `Service`: NestJS service (injectable, contains business logic)
- `Controller`: NestJS controller (HTTP endpoints)
- `Gateway`: WebSocket gateway
- `Module`: NestJS module (dependency injection container)
- `Scene`: Phaser scene
- `Dto`: Data transfer object (input validation)
- `Public`: Type for broadcasting (stripped sensitive fields)
- `Result`: Return type from operations (success/error)

## Where to Add New Code

**New Feature (Backend):**
- Primary code: `apps/game-server/src/[feature]/` (new module)
- Shared logic: `packages/game-logic/src/[domain]/` (reusable rules)
- Type definitions: `packages/shared-types/src/[category]/`
- Database: `packages/database/src/schema/` + `packages/database/src/queries/`
- Tests: `apps/game-server/src/[feature]/[feature].spec.ts`

**New Feature (API):**
- Primary code: `apps/api/src/[feature]/` (controller, service, DTO)
- Type definitions: `packages/shared-types/src/[category]/`
- Database queries: `packages/database/src/queries/[feature].ts`
- Tests: `apps/api/src/[feature]/[feature].spec.ts`

**New Component (Frontend):**
- Implementation: `apps/web/src/ui/[feature]/` or `apps/web/src/ui/[panel]/`
- Styling: co-locate `.css` with component or use `apps/web/src/styles/`
- Tests: `apps/web/src/ui/[component].spec.tsx`

**New Shared Type:**
- Type definitions: `packages/shared-types/src/[core|game|network]/[name].ts`
- Network events: `packages/shared-types/src/network/events.ts` (edit interfaces)
- Export: Add to `packages/shared-types/src/index.ts`

**New Game Logic:**
- Implementation: `packages/game-logic/src/[domain]/[function].ts`
- Export: Add to `packages/game-logic/src/index.ts`
- Tests: `packages/game-logic/src/[domain]/[function].spec.ts`

**Utilities:**
- Shared helpers across all apps: `packages/shared-utils/src/` (new package if needed)
- App-specific helpers: `apps/[app]/src/utils/`
- Constants: `packages/shared-types/src/constants.ts` or per-package

## Special Directories

**node_modules/:**
- Purpose: Installed npm packages via pnpm
- Generated: Yes (from pnpm-lock.yaml)
- Committed: No (in .gitignore)

**dist/ or build/:**
- Purpose: Compiled output
- Generated: Yes (via build targets)
- Committed: No (in .gitignore)

**.nx/:**
- Purpose: NX cache and workspace metadata
- Generated: Yes (by NX)
- Committed: No (in .gitignore)

**public/ (web app):**
- Purpose: Static assets served to browser
- Contains: `public/assets/` for game sprites and sounds
- Generated: No (manually added)
- Committed: Yes

**migrations/ (database package):**
- Purpose: Database schema changes (if Drizzle migrations enabled)
- Generated: Yes (via `db:generate` script)
- Committed: Yes (for reproducibility)

---

*Structure analysis: 2026-02-13*
