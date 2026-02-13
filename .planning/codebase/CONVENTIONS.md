# Coding Conventions

**Analysis Date:** 2026-02-13

## Naming Patterns

**Files:**
- Services: `[name].service.ts` (e.g., `auth.service.ts`, `database.service.ts`)
- Controllers: `[name].controller.ts` (e.g., `auth.controller.ts`, `characters.controller.ts`)
- Modules: `[name].module.ts` (e.g., `auth.module.ts`, `characters.module.ts`)
- Guards: `[name].guard.ts` (e.g., `jwt-auth.guard.ts`)
- Strategies: `[name].strategy.ts` (e.g., `jwt.strategy.ts`)
- DTOs: `[name].dto.ts` (e.g., `auth.dto.ts`, `character.dto.ts`)
- React Components: PascalCase with `.tsx` extension (e.g., `GameUI.tsx`, `ChatPanel.tsx`, `HUD.tsx`)
- Stores: `[name]Store.ts` (e.g., `gameStore.ts`)
- Utilities/Helpers: camelCase (e.g., `socket.ts`)

**Functions:**
- camelCase for all functions: `async register()`, `getProfile()`, `loadZone()`, `validateToken()`
- Private methods prefixed with `private`: `private generateToken()`, `private setConnectionState()`
- Async functions always marked with `async` keyword

**Variables:**
- camelCase for constants and variables: `connectionState`, `chatMessages`, `healthPercent`, `maxAge`
- UPPER_SNAKE_CASE for module-level constants: `MAX_CHARACTERS_PER_ACCOUNT`, `JWT_SECRET`
- React state variables: camelCase (e.g., `message`, `showInventory`)

**Types:**
- Interfaces: PascalCase (e.g., `GameState`, `JwtPayload`, `ZoneState`)
- Type aliases: PascalCase (e.g., `DbClient`, `ServerEventHandlers`)
- Enum-like string unions: camelCase values (e.g., `'disconnected'`, `'authenticated'`, `'error'`)

## Code Style

**Formatting:**
- Tool: Prettier 3.2.0
- Single quotes (`singleQuote: true`)
- Trailing comma on multi-line objects/arrays (`trailingComma: 'es5'`)
- Tab width: 2 spaces
- Line length: 100 characters (`printWidth: 100`)
- Semicolons required (`semi: true`)

**Linting:**
- Tool: ESLint 8.57.0 with TypeScript plugin
- Configuration: `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`
- Configs included: `eslint-config-prettier` (disables conflicting rules)
- Run linting: `nx run-many -t lint`

## Import Organization

**Order:**
1. External/Third-party imports (NestJS, React, Phaser, etc.)
2. Internal shared imports from `@into-the-void/*` aliases
3. Local relative imports from sibling/parent directories

**Examples:**
```typescript
// NestJS decorators and utilities
import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Third-party libraries
import * as bcrypt from 'bcrypt';
import { create } from 'zustand';
import React from 'react';

// Internal shared types/utilities
import { RegisterDto, LoginDto } from './dto/auth.dto';
import {
  createAccount,
  findAccountByEmail,
  findAccountById,
} from '@into-the-void/database';
import { Player, ConnectionState } from '@into-the-void/shared-types';

// Local relative imports
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
```

**Path Aliases:**
Used for internal shared packages from `tsconfig.base.json`:
- `@into-the-void/shared-types` → `packages/shared-types/src/index.ts`
- `@into-the-void/game-logic` → `packages/game-logic/src/index.ts`
- `@into-the-void/database` → `packages/database/src/index.ts`
- `@into-the-void/world-gen` → `packages/world-gen/src/index.ts`

## Error Handling

**Patterns:**
- NestJS exceptions for HTTP errors:
  - `ConflictException` for duplicate resources (e.g., `throw new ConflictException('Email already registered')`)
  - `UnauthorizedException` for auth failures (e.g., `throw new UnauthorizedException('Invalid credentials')`)
  - `ForbiddenException` for permission denied (e.g., `throw new ForbiddenException('Character does not belong to this account')`)
  - `NotFoundException` for missing resources (e.g., `throw new NotFoundException('Character not found')`)
- Console logging for errors: `console.error('message:', error)` in services/utilities
- Check for null/undefined before operations (defensive pattern):
  ```typescript
  const isOwner = await isCharacterOwnedByAccount(db, characterId, accountId);
  if (!isOwner) {
    throw new ForbiddenException('Character does not belong to this account');
  }
  ```

## Logging

**Framework:** console (native JavaScript)

**Patterns:**
- `console.log()` for info messages (e.g., `console.log('Connected to game server')`)
- `console.error()` for errors (e.g., `console.error('Connection error:', error)`)
- `console.warn()` for warnings (e.g., `console.warn('Cannot emit: not connected')`)
- Included in development and error scenarios

## Comments

**When to Comment:**
- Complex logic that isn't self-explanatory
- Business rule constraints (e.g., `// Check character limit`, `// Verify ownership`)
- Workarounds or known limitations (e.g., `// In a more complete implementation, we'd invalidate the token`)
- Zone/section separators for major code blocks

**JSDoc/TSDoc:**
- Not extensively used in this codebase
- Interfaces document their structure implicitly through TypeScript

## Function Design

**Size:** Most functions 20-50 lines; service methods follow single-responsibility principle

**Parameters:**
- Inject dependencies via constructor in NestJS services (dependency injection pattern)
- DTOs for request validation (e.g., `RegisterDto`, `LoginDto`)
- Use object/interface parameters for multiple related arguments
- Example: `async updateEntity(zoneId: string, entityId: string, changes: Partial<Entity>): Promise<void>`

**Return Values:**
- Services return DTOs/response objects, not raw database entities
- Example in `CharactersService.getAccountCharacters()`:
  ```typescript
  return characters.map((char) => ({
    id: char.id,
    name: char.name,
    faction: char.factionId,
    level: char.level,
    createdAt: char.createdAt,
    lastPlayedAt: char.lastPlayedAt,
  }));
  ```
- Boolean predicates return `boolean` (e.g., `async validateToken(): Promise<boolean>`)
- Async functions always return `Promise<T>`

## Module Design

**Exports:**
- NestJS modules export services/providers via `exports: []` array
- Example: `exports: [AuthService]` in `AuthModule` so other modules can inject it
- React components export as named exports: `export const GameUI: React.FC = () => {}`
- Store exports singleton instance: `export const useGameStore = create<GameState>(...)`
- Socket utility exports singleton: `export const gameSocket = new GameSocket()`

**Barrel Files:**
- Not extensively used; imports reference specific files directly
- Example: `import { AuthService } from './auth.service'` not `from './auth'`

## Type Strictness

**TypeScript Configuration:**
- Strict mode enabled: `"strict": true`
- No implicit any: `"noImplicitAny": true`
- Strict null checks: `"strictNullChecks": true`
- All functions must have explicit return types
- Example: `async register(dto: RegisterDto): Promise<{ account: ...; token: string }>`

## Class Decorators (NestJS)

**Services:**
```typescript
@Injectable()
export class AuthService { }
```

**Controllers:**
```typescript
@Controller('auth')
export class AuthController { }
```

**Modules:**
```typescript
@Module({
  imports: [...],
  controllers: [...],
  providers: [...],
  exports: [...]
})
export class AuthModule { }
```

**Lifecycle Hooks:**
- Implement `OnModuleInit` for startup logic
- Implement `OnModuleDestroy` for cleanup logic
- Examples: `DatabaseService` connects on init, `ZonesService` starts cleanup intervals

## React Component Patterns

**Functional Components with Hooks:**
- All components are functional components with `.tsx` extension
- Use `React.FC` type annotation
- Example: `export const GameUI: React.FC = () => { }`

**State Management:**
- Use Zustand for global state: `const { state } = useGameStore()`
- Use local useState for form inputs: `const [message, setMessage] = useState('')`
- Example in `ChatPanel.tsx`: form state with `useState`, global chat via `useGameStore`

**Effects:**
- Use `useEffect` for side effects
- Example: Auto-scroll in `ChatPanel` when messages change

---

*Convention analysis: 2026-02-13*
