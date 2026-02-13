# External Integrations

**Analysis Date:** 2026-02-13

## APIs & External Services

**Game Communication:**
- Socket.IO WebSocket Server/Client - Real-time multiplayer game synchronization
  - SDK/Client: `socket.io` (server), `socket.io-client` (browser)
  - Port: 3001 (configurable via `GAME_SERVER_PORT`)
  - CORS Origin: `process.env.CORS_ORIGIN` or `http://localhost:5173`

**REST API:**
- NestJS HTTP Server for authentication and character management
  - Server location: `apps/api/src/main.ts`
  - Port: 3000 (configurable via `API_PORT`)
  - Global prefix: `/api`
  - CORS Origin: `process.env.CORS_ORIGIN` or `http://localhost:5173`

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` env var (default: `postgresql://postgres:postgres@localhost:5432/into_the_void`)
  - Alternative config via: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
  - Client: `pg` (node-postgres)
  - ORM: `drizzle-orm` with strict schema validation
  - Connection pool: Max 20 connections, 30s idle timeout, 2s connection timeout
  - Schema location: `packages/database/src/schema/`
  - Tables: accounts, characters, factions, structures, discoveries, inventory
  - Migrations: Drizzle Kit managed, output to `packages/database/drizzle/`

**Caching/Session:**
- Redis (declared but not actively implemented)
  - Connection: `REDIS_URL` env var (default: `redis://localhost:6379`)
  - Alternative config via: `REDIS_HOST`, `REDIS_PORT`
  - Client: `ioredis` (installed, not yet integrated)
  - Status: Available for future implementation

**File Storage:**
- Local filesystem only - No cloud storage integrations

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `apps/api/src/auth/` module
  - JWT Strategy: `@nestjs/jwt` with `passport-jwt`
  - Passport default strategy: 'jwt'
  - JWT Secret: `JWT_SECRET` env var (default: 'dev-secret-change-in-production')
  - JWT Expiry: `JWT_EXPIRES_IN` env var (default: '7d')
  - Password hashing: bcrypt (v5.1.0)
  - Auth flow:
    1. Login via REST API endpoint in `apps/api/src/auth/auth.controller.ts`
    2. Returns JWT token
    3. Client sends token to game server via Socket.IO `auth` event
    4. Game server validates via JWT strategy in `apps/game-server`

**No External Identity Providers:**
- OAuth2, OpenID Connect, or third-party auth not implemented
- Only username/password and JWT token-based auth

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, DataDog, or similar integration

**Logs:**
- Console logging only (`console.log`, `console.error`)
- Examples in:
  - `apps/api/src/database/database.service.ts` - Database connection logs
  - `apps/game-server/src/game/game.gateway.ts` - Player connection/disconnect logs
  - `apps/web/src/network/socket.ts` - Client-side connection logs

**Alerting:**
- Not implemented

## CI/CD & Deployment

**Hosting:**
- Not configured - Local development only
- Ready for: Docker containerization, Kubernetes, or traditional VPS deployment

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, CircleCI, or Jenkins configuration

**Build Commands:**
- Development: `npm run dev:api`, `npm run dev:game-server`, `npm run dev:web`
- Production build: `npm run build` (builds all apps)
- Database: `npm run db:generate`, `npm run db:migrate`, `npm run db:push`

## Environment Configuration

**Required env vars for development:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `JWT_SECRET` - Secret key for signing JWTs (must change in production)
- `JWT_EXPIRES_IN` - JWT token expiration (default: '7d')
- `API_PORT` - REST API server port (default: 3000)
- `API_HOST` - REST API bind address (default: 0.0.0.0)
- `GAME_SERVER_PORT` - WebSocket server port (default: 3001)
- `GAME_SERVER_HOST` - WebSocket server bind address (default: 0.0.0.0)
- `VITE_API_URL` - Client-side API endpoint (default: http://localhost:3000)
- `VITE_GAME_SERVER_URL` - Client-side game server endpoint (default: http://localhost:3001)
- `WORLD_SEED` - Procedural world generation seed
- `NODE_ENV` - Environment mode (development/production)
- `CORS_ORIGIN` - CORS allowed origin (default: http://localhost:5173)

**Secrets location:**
- Local development: `.env` file (in .gitignore)
- Example template: `.env.example` (committed to repo)
- Production: Environment variables via deployment platform or secret manager

## Webhooks & Callbacks

**Incoming Webhooks:**
- Not implemented - No external service callbacks

**Outgoing Webhooks:**
- Not implemented - No events sent to external services

## Real-Time Features

**WebSocket Communication:**

**Game Server Gateway** (`apps/game-server/src/game/game.gateway.ts`):

Client Events (sent from browser):
- `auth` - Authentication with JWT token and character ID
- `player:move` - Movement request with direction
- `player:interact` - Interaction with entities
- `chat:send` - Chat message with channel and content

Server Events (broadcast from game server):
- `auth:success` - Authentication successful with player data
- `auth:error` - Authentication failed
- `zone:state` - Current zone state and entities
- `zone:update` - Zone changes
- `entity:spawn` - New entity appears
- `entity:despawn` - Entity removed
- `entity:update` - Entity property changes
- `player:joined` - New player entered zone
- `player:left` - Player left zone
- `player:moved` - Player moved within zone
- `combat:start` - Combat initiated
- `combat:result` - Combat outcome
- `combat:end` - Combat concluded
- `chat:message` - Chat message received
- `inventory:update` - Player inventory changed
- `error` - Generic error response

**Socket.IO Rooms:**
- Zone-based rooms: Players join rooms named by `zoneId` for zone-scoped broadcasts
- Direct socket emission: Point-to-point messages via socket ID

## Data Flow & Integration Points

**Authentication Flow:**
1. User registers/logs in via `apps/api/src/auth/auth.controller.ts` REST endpoint
2. API returns JWT token
3. Client stores token and connects WebSocket to game server at `VITE_GAME_SERVER_URL`
4. Client sends `auth` event with token and characterId
5. Game server validates JWT using `apps/api/src/auth/strategies/jwt.strategy.ts`
6. Game server loads player data from PostgreSQL via `apps/database` package
7. Player joins zone and receives `zone:state`

**Game Loop Integration:**
1. Player sends movement/interaction commands via Socket.IO
2. Game server processes via `apps/game-server/src/game/game.service.ts`
3. Updates stored in PostgreSQL if persistent changes
4. Broadcasts relevant state changes to zone room
5. Client updates via Phaser game engine and Zustand store

---

*Integration audit: 2026-02-13*
