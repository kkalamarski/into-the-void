# Technology Stack

**Analysis Date:** 2026-02-13

## Languages

**Primary:**
- TypeScript 5.4.0 - All backend and frontend code
- JavaScript - Configuration files and utilities

**Secondary:**
- SQL - PostgreSQL database queries via Drizzle ORM

## Runtime

**Environment:**
- Node.js >= 20.0.0 (specified in `package.json` engines)

**Package Manager:**
- pnpm 9.0.0
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core Backend:**
- NestJS 10.3.0 - REST API and WebSocket game server (`apps/api`, `apps/game-server`)

**Core Frontend:**
- React 18.2.0 - Web application (`apps/web`)
- Vite 5.2.0 - Frontend build tool and dev server
- Phaser 3.80.0 - 2D game engine for client-side game rendering

**State Management:**
- Zustand 4.5.0 - Client-side state management (`apps/web/src/store/gameStore.ts`)

**Testing:**
- Not yet configured in package.json

**Build/Dev:**
- Nx 20.0.0 - Monorepo orchestration (`package.json` scripts use `nx run-many`)
- ESBuild 0.21.0 - Bundler for backend
- TypeScript ESLint 7.0.0 - Linting
- Prettier 3.2.0 - Code formatting
- SWC 1.5.0 - TypeScript transpiler

## Key Dependencies

**Critical:**
- `drizzle-orm` 0.30.0 - TypeScript ORM for type-safe database queries
- `pg` 8.11.0 - PostgreSQL client library
- `socket.io` 4.7.0 - WebSocket server for real-time game communication
- `socket.io-client` 4.7.0 - WebSocket client for frontend
- `ioredis` 5.4.0 - Redis client (declared but not actively used yet)

**Authentication:**
- `passport` 0.7.0 - Authentication middleware
- `passport-jwt` 4.0.0 - JWT strategy for Passport
- `@nestjs/jwt` 10.2.0 - JWT module for NestJS
- `bcrypt` 5.1.0 - Password hashing

**Utilities:**
- `class-validator` 0.14.0 - DTO validation
- `class-transformer` 0.5.1 - DTO transformation
- `reflect-metadata` 0.2.0 - Decorator metadata support for decorators
- `rxjs` 7.8.0 - Reactive programming library (NestJS dependency)

**Web Server:**
- `@nestjs/platform-express` 10.3.0 - Express adapter for NestJS REST API
- `@nestjs/platform-socket.io` 10.3.0 - Socket.IO adapter for NestJS WebSocket gateway

## Configuration

**Environment:**
- Configuration managed via `@nestjs/config` (ConfigModule)
- Environment file: `.env` (example provided at `.env.example`)
- Key variables: `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `API_PORT`, `API_HOST`, `GAME_SERVER_PORT`, `GAME_SERVER_HOST`, `VITE_API_URL`, `VITE_GAME_SERVER_URL`, `WORLD_SEED`, `NODE_ENV`

**Build:**
- TypeScript config: `tsconfig.base.json` - Strict mode enabled, target ES2022
- Path aliases defined for monorepo packages:
  - `@into-the-void/shared-types` → `packages/shared-types/src/index.ts`
  - `@into-the-void/game-logic` → `packages/game-logic/src/index.ts`
  - `@into-the-void/database` → `packages/database/src/index.ts`
  - `@into-the-void/world-gen` → `packages/world-gen/src/index.ts`
- Vite config: `apps/web/vite.config.ts` - React plugin, NX TS path plugin
- Drizzle config: `packages/database/drizzle.config.ts` - PostgreSQL dialect, migrations output to `packages/database/drizzle/`

## Platform Requirements

**Development:**
- Node.js 20.0.0 or higher
- PostgreSQL database instance
- Redis instance (optional - not actively used yet)
- pnpm package manager

**Production:**
- Node.js 20.0.0 or higher
- PostgreSQL database
- Redis instance (optional)
- Docker recommended for containerization (not configured yet)

## Monorepo Structure

**Apps:**
- `apps/api` - REST API server running on port 3000
- `apps/game-server` - WebSocket game server running on port 3001
- `apps/web` - React web client on port 5173 (dev), 4300 (preview)

**Packages:**
- `packages/database` - Drizzle ORM schemas and query builders
- `packages/shared-types` - Shared TypeScript types for client/server communication
- `packages/game-logic` - Game mechanics and rules engine
- `packages/world-gen` - Procedural world generation

---

*Stack analysis: 2026-02-13*
