# Testing Patterns

**Analysis Date:** 2026-02-13

## Test Framework

**Runner:**
- Vitest
- Configured in Nx project via `@nx/vite:test` executor
- Configuration: `tsconfig.spec.json` sets up Vitest globals and types

**Assertion Library:**
- Vitest built-in assertions (via `vitest/globals`)
- TypeScript types available: `vitest/globals` type definitions

**Run Commands:**
```bash
nx run-many -t test              # Run all tests
nx run [app]:test                # Run tests for specific app
npm run test                     # Run via npm shortcut
```

**Current Status:**
- No test files currently exist in the codebase
- All projects configured with `passWithNoTests: true` in `project.json`
- Test infrastructure is set up and ready but tests need to be written

## Test File Organization

**Location:**
- Co-located: Test files live next to source files in `src/` directory
- Naming follows `*.test.ts` or `*.spec.ts` convention
- Configured in `tsconfig.spec.json` to include `src/**/*.test.ts` and `src/**/*.spec.ts`

**Naming:**
- Format: `[component/service-name].test.ts` or `[component/service-name].spec.ts`
- Examples (to be created):
  - `apps/api/src/auth/auth.service.test.ts`
  - `apps/api/src/auth/auth.controller.test.ts`
  - `apps/api/src/characters/characters.service.test.ts`
  - `apps/web/src/store/gameStore.test.ts`

**Structure:**
```
apps/api/src/
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.test.ts      ← Test file
│   ├── auth.controller.ts
│   ├── auth.controller.test.ts    ← Test file
│   └── ...
├── characters/
│   ├── characters.service.ts
│   ├── characters.service.test.ts ← Test file
│   └── ...
```

## Test Structure

**NestJS Service Test Pattern** (to be followed for `DatabaseService`, `AuthService`, `CharactersService`):

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';

describe('AuthService', () => {
  let service: AuthService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: {
            getClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create an account with valid credentials', async () => {
      // Test implementation
    });

    it('should throw ConflictException if email already exists', async () => {
      // Test implementation
    });
  });
});
```

**React Component Test Pattern** (to be followed for `GameUI.tsx`, `ChatPanel.tsx`, `HUD.tsx`):

```typescript
import React from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameUI } from './GameUI';

describe('GameUI', () => {
  it('should render login screen when no player', () => {
    // Mock useGameStore to return null player
    render(<GameUI />);
    expect(screen.getByText('Into the Void')).toBeInTheDocument();
  });

  it('should render HUD when player exists', () => {
    // Mock useGameStore with player data
    render(<GameUI />);
    expect(screen.getByText(/Lv\./)).toBeInTheDocument();
  });
});
```

**Patterns:**
- Use `beforeEach()` for setup/initialization
- Use `afterEach()` for cleanup (if needed)
- Use `describe()` blocks to organize related tests
- Use `it()` for individual test cases
- Descriptive test names that explain expected behavior

## Mocking

**Framework:**
- For NestJS: `@nestjs/testing` Test utilities with `jest.fn()` or Vitest mocking
- For React: `vitest.mock()` for module mocking
- For dependencies: Mock via Nx Test module provider overrides

**Patterns:**

NestJS Service Mocking:
```typescript
// Mock DatabaseService in test module
{
  provide: DatabaseService,
  useValue: {
    getClient: jest.fn().mockReturnValue({ /* mock db */ }),
    getPool: jest.fn(),
  },
}
```

React Hook Mocking:
```typescript
// Mock useGameStore in React component tests
vitest.mock('../store/gameStore', () => ({
  useGameStore: vitest.fn(() => ({
    player: null,
    showChat: false,
    // ... other state
  })),
}));
```

**What to Mock:**
- External services (DatabaseService, ConfigService)
- HTTP clients and API calls
- Store/state management (useGameStore)
- Socket.io client (gameSocket)
- Third-party libraries with side effects
- Environment variables via ConfigService mock

**What NOT to Mock:**
- Pure utility functions
- DTOs and type definitions
- NestJS decorators and built-in providers
- Authentication guards (unless testing auth flow specifically)
- Business logic you want to test (keep unmocked)

## Fixtures and Factories

**Test Data:**

To be created following these patterns:

```typescript
// Example fixture: tests/fixtures/auth.fixtures.ts
export const mockRegisterDto = {
  email: 'test@example.com',
  password: 'Password123',
};

export const mockAccount = {
  id: 'account-1',
  email: 'test@example.com',
  createdAt: new Date(),
  lastLoginAt: null,
};

// Example factory: tests/factories/character.factory.ts
export function createCharacter(overrides = {}) {
  return {
    id: 'char-1',
    name: 'TestChar',
    accountId: 'account-1',
    factionId: 'faction-1',
    level: 1,
    xp: 0,
    ...overrides,
  };
}
```

**Location:**
- Fixtures: `tests/fixtures/` directory at project root
- Factories: `tests/factories/` directory at project root
- Alternative: Inline fixtures in test files if only used locally

## Coverage

**Requirements:** Not enforced (no coverage thresholds set)

**View Coverage:**
```bash
nx run-many -t test -- --coverage   # Generate coverage report (when tests added)
```

**Coverage goals** (recommended for future implementation):
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

## Test Types

**Unit Tests:**
- Scope: Individual services, controllers, utilities
- Approach: Test one unit in isolation with mocked dependencies
- Example targets:
  - `AuthService.register()` - test registration logic with mocked DatabaseService
  - `CharactersService.createCharacter()` - test character creation with mocks
  - `gameSocket.connect()` - test socket connection logic

**Integration Tests:**
- Scope: Multiple services working together
- Approach: Test actual interactions between services (minimal mocking)
- Not yet implemented; should test:
  - Full auth flow: register → login → validate token
  - Character creation → inventory initialization
  - Zone loading → entity spawning

**E2E Tests:**
- Framework: Not currently used
- Recommended: Playwright or Cypress for web app UI testing
- Should test complete user workflows:
  - Login → character select → join game
  - Chat message send/receive
  - Inventory open/close

## Common Patterns

**Async Testing:**

```typescript
// Vitest/Jest with async/await
describe('AuthService', () => {
  it('should register user', async () => {
    const result = await service.register(mockRegisterDto);
    expect(result).toHaveProperty('token');
  });
});

// Or with .resolves matcher
it('should login user', () => {
  return expect(service.login(mockLoginDto)).resolves.toHaveProperty('token');
});
```

**Error Testing:**

```typescript
describe('AuthService', () => {
  it('should throw ConflictException on duplicate email', async () => {
    // Mock database to return existing account
    jest.spyOn(db, 'findAccountByEmail').mockResolvedValue(existingAccount);

    await expect(service.register(mockRegisterDto))
      .rejects
      .toThrow(ConflictException);
  });
});
```

**Testing with Dependencies:**

```typescript
describe('CharactersService', () => {
  let service: CharactersService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CharactersService,
        {
          provide: DatabaseService,
          useValue: { getClient: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CharactersService);
    databaseService = module.get(DatabaseService);
  });

  it('should get account characters', async () => {
    const mockChars = [createCharacter()];
    jest.spyOn(databaseService, 'getClient')
      .mockReturnValue({ characters: mockChars });

    const result = await service.getAccountCharacters('account-1');
    expect(result).toHaveLength(1);
  });
});
```

## Test Infrastructure Notes

**Configuration Files:**
- `apps/api/tsconfig.spec.json` - TypeScript config for API tests
- `apps/web/tsconfig.spec.json` - TypeScript config for web tests
- `apps/game-server/tsconfig.spec.json` - TypeScript config for game-server tests

**Dependencies Available:**
- `@nestjs/testing` - NestJS test utilities (in devDependencies)
- `vitest` - Test framework (in devDependencies)
- `@testing-library/react` - React component testing (install if needed)
- `@testing-library/jest-dom` - DOM matchers (install if needed)

**Running Tests for Specific App:**
```bash
nx run api:test                      # API app only
nx run web:test                      # Web app only
nx run game-server:test              # Game server app only
nx run-many -t test --projects=api,web  # Multiple specific apps
```

---

*Testing analysis: 2026-02-13*
