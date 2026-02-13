# Architecture

**Analysis Date:** 2026-02-13

## Pattern Overview

**Overall:** Monorepo-based distributed game architecture with clear separation of concerns across three independent applications (API, Game Server, Web Client) sharing domain types.

**Key Characteristics:**
- NX-managed monorepo with apps and shared packages
- Microservices-inspired: REST API and WebSocket game server operate independently
- Event-driven client-server communication via Socket.IO
- Shared type definitions across all three applications
- Layered architecture in each app with distinct responsibilities

## Layers

**Presentation Layer (Web Client):**
- Purpose: Render game world and UI, handle player input
- Location: `apps/web/src/`
- Contains: React/Phaser game engine, UI components, state management
- Depends on: Socket.IO for networking, Zustand for state, shared-types for data contracts
- Used by: End players

**Game Simulation Layer (Game Server):**
- Purpose: Validate game logic, manage player state, broadcast world changes
- Location: `apps/game-server/src/`
- Contains: WebSocket gateway, game service, zone management, player tracking
- Depends on: database package for persistence, game-logic package for rules, shared-types for contracts
- Used by: Web clients via WebSocket

**Authentication & Profile Layer (REST API):**
- Purpose: Account management, character creation, authentication tokens
- Location: `apps/api/src/`
- Contains: NestJS controllers, JWT auth, password hashing, character CRUD
- Depends on: database package for data, Passport for auth
- Used by: Web client and game server for validation

**Data Access Layer (Database Package):**
- Purpose: Manage all database operations with type-safe queries
- Location: `packages/database/src/`
- Contains: Drizzle ORM schema, query functions, client initialization
- Depends on: PostgreSQL driver
- Used by: API and game server

**Domain Logic Layer (Shared Types):**
- Purpose: Define game world concepts and network contracts
- Location: `packages/shared-types/src/`
- Contains: Type definitions for entities, positions, events, messages
- Depends on: Nothing (pure TypeScript)
- Used by: All three applications

**Game Logic Layer (Game Logic Package):**
- Purpose: Implement game rules independent of runtime
- Location: `packages/game-logic/src/`
- Contains: Movement validation, combat mechanics, pathfinding, visibility
- Depends on: shared-types
- Used by: Game server for validation

**World Generation Layer (World Gen Package):**
- Purpose: Procedurally generate game world zones
- Location: `packages/world-gen/src/`
- Contains: Noise generation, biome generation, spawn point placement
- Depends on: shared-types for result types
- Used by: Game server during zone loading

## Data Flow

**Player Connection Flow:**

1. Web client connects via WebSocket to game-server
2. Client sends `auth` event with JWT token and character ID
3. Game server validates token with API
4. Game server retrieves player data and zone state
5. Player joins Socket.IO room for their zone
6. Server broadcasts `auth:success` and `zone:state` to player
7. Server notifies zone occupants with `player:joined`

**Player Movement Flow:**

1. Client detects keyboard input (WASD or arrows)
2. Client sends `player:move` event with direction to server
3. Game server calls `GameService.movePlayer()`:
   - Retrieves player from `PlayerService`
   - Calculates new position via `game-logic` package
   - Validates against collision map via `game-logic`
   - Checks for zone transition via `game-logic`
4. If zone unchanged: broadcasts `player:moved` to zone occupants
5. If zone changed: moves client to new room, sends `player:left` to old zone, sends `zone:state` to new zone
6. Server updates `PlayerService` with new position
7. Client optionally receives position update in next server sync

**Entity Interaction Flow:**

1. Client sends `player:interact` event with target entity ID
2. Game server retrieves entity from `ZonesService`
3. `GameService.handleInteraction()` determines entity type (mineral, item, creature)
4. Applies appropriate state change (deactivate, add to inventory, initiate combat)
5. Broadcasts `entity:update` or `combat:start` to zone occupants

**Chat Broadcasting Flow:**

1. Client sends `chat:send` event with message and channel
2. Game server retrieves player from `PlayerService`
3. Broadcasts based on channel:
   - `zone`: emit to zone room only
   - `global`: emit to all connected sockets
   - `whisper`: emit to target player's socket only

**State Management:**

- **Server State:** Maintained in memory by services (players, zones, entities)
- **Client State:** Managed by Zustand store (`gameStore.ts`)
- **Persistent State:** Stored in PostgreSQL via database package
- **Transient State:** Zone data cached in-memory, cleaned up after 5 minutes of inactivity

## Key Abstractions

**Player:**
- Purpose: Represents an authenticated character in the game world
- Examples: `apps/game-server/src/game/player.service.ts`, `packages/shared-types/src/core/player.ts`
- Pattern: Player data split into internal (game server) and public (broadcast) forms for privacy

**Zone:**
- Purpose: Spatial subdivision of the world for efficient updates and state management
- Examples: `apps/game-server/src/zones/zones.service.ts`, `packages/shared-types/src/core/zone.ts`
- Pattern: Zone ID derived from coordinates (z_X_Y), zones load on-demand, auto-cleanup on inactivity

**Entity:**
- Purpose: Any interactive object in the world (minerals, items, creatures)
- Examples: `packages/shared-types/src/core/entity.ts`, `apps/web/src/game/scenes/WorldScene.ts`
- Pattern: Entities tied to zones, identified by compound ID (zoneId_spawnId_x_y)

**ChunkData:**
- Purpose: Procedurally generated terrain and spawn point data for a zone
- Examples: `packages/world-gen/src/generation/chunk.ts`, `packages/shared-types/src/core/zone.ts`
- Pattern: Generated once per zone via seeded world seed, includes collision map and spawn points

**Movement Validation:**
- Purpose: Ensure player can only move to valid positions
- Examples: `packages/game-logic/src/movement/validation.ts`
- Pattern: Checks collision map, prevents out-of-bounds, determines zone transitions

**Position:**
- Purpose: Represent location in world (x, y coordinates + zone ID)
- Examples: `packages/shared-types/src/core/position.ts`
- Pattern: Zone ID identifies chunk, (x,y) identifies position within chunk

## Entry Points

**Web Client:**
- Location: `apps/web/src/main.tsx`
- Triggers: Browser loads HTML, mounts React root
- Responsibilities: Bootstrap React app, initialize Phaser game engine, establish WebSocket connection

**REST API:**
- Location: `apps/api/src/main.ts`
- Triggers: `npm run dev:api`
- Responsibilities: Start NestJS server on port 3000, enable CORS, apply global validation pipes

**Game Server:**
- Location: `apps/game-server/src/main.ts`
- Triggers: `npm run dev:game-server`
- Responsibilities: Start NestJS WebSocket server on port 3001, enable CORS for WebSocket, load spawn zone

**Web Initialization Sequence:**
1. `main.tsx` mounts React app
2. `App.tsx` initializes Phaser game engine (`Game.ts`)
3. `Game.ts` loads scenes: BootScene → PreloadScene → WorldScene
4. `WorldScene` establishes socket connection and registers event handlers
5. Zustand store connects socket handlers to React state

## Error Handling

**Strategy:** Three-tier error handling with different patterns per layer.

**Web Client:**
- UI shows connection state (connecting, connected, error, authenticated)
- Socket errors trigger reconnection attempts
- Failed movements show error toast (intended, not implemented yet)

**Game Server:**
- WebSocket handlers catch exceptions, emit error events to client
- Failed movement validation returns error result to player
- Interaction failures return error code and message

**REST API:**
- Global ValidationPipe transforms input validation errors to 400 responses
- JWT guard returns 401 for auth failures
- Services throw NestJS exceptions (ConflictException, NotFoundException, ForbiddenException)

## Cross-Cutting Concerns

**Logging:** Console.log used throughout (development pattern, should be replaced with proper logger)

**Validation:**
- API: class-validator + class-transformer for DTOs (input validation)
- Game Server: game-logic functions validate movement and interactions
- Web Client: Type safety via TypeScript, optional runtime validation

**Authentication:**
- Strategy: JWT-based stateless auth
- API endpoint: `POST /api/auth/login` returns token
- Game Server: Validates token during WebSocket auth handshake
- Web Client: Stores token in browser, sends with auth message

**Authorization:**
- API: Character ownership verified via `isCharacterOwnedByAccount()` before mutations
- Game Server: Only authenticated players can send commands
- Web Client: UI reflects player's own character data only

**Type Safety:**
- Shared types exported from `packages/shared-types` prevent schema drift
- Client events typed as `ClientEvents` interface
- Server events typed as `ServerEvents` interface
- Position and Entity types used consistently across apps

---

*Architecture analysis: 2026-02-13*
