---
phase: quick-9
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - .env
  - .env.example
  - apps/api/src/instrument.ts
  - apps/api/src/main.ts
  - apps/api/src/app/app.module.ts
  - apps/game-server/src/instrument.ts
  - apps/game-server/src/main.ts
  - apps/game-server/src/app/app.module.ts
autonomous: true
requirements: [SENTRY-CONFIG]

must_haves:
  truths:
    - "Sentry SDK initializes on both API and game-server startup"
    - "Unhandled exceptions in both apps are captured and reported to Sentry"
    - "SENTRY_DSN is read from environment variable, not hardcoded"
  artifacts:
    - path: "apps/api/src/instrument.ts"
      provides: "Sentry initialization for API app"
      contains: "Sentry.init"
    - path: "apps/game-server/src/instrument.ts"
      provides: "Sentry initialization for game-server app"
      contains: "Sentry.init"
    - path: ".env.example"
      provides: "SENTRY_DSN env var template"
      contains: "SENTRY_DSN"
  key_links:
    - from: "apps/api/src/main.ts"
      to: "apps/api/src/instrument.ts"
      via: "top-of-file import"
      pattern: "import.*instrument"
    - from: "apps/game-server/src/main.ts"
      to: "apps/game-server/src/instrument.ts"
      via: "top-of-file import"
      pattern: "import.*instrument"
    - from: "apps/api/src/app/app.module.ts"
      to: "@sentry/nestjs"
      via: "SentryModule.forRoot() in imports"
      pattern: "SentryModule"
    - from: "apps/game-server/src/app/app.module.ts"
      to: "@sentry/nestjs"
      via: "SentryModule.forRoot() in imports"
      pattern: "SentryModule"
---

<objective>
Configure Sentry error tracking for both NestJS backend applications (apps/api and apps/game-server).

Purpose: Enable production error monitoring so unhandled exceptions, crashes, and performance issues are automatically reported to Sentry.
Output: Both apps initialize Sentry on startup and report unhandled exceptions via the `@sentry/nestjs` SDK.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.env.example
@apps/api/src/main.ts
@apps/api/src/app/app.module.ts
@apps/game-server/src/main.ts
@apps/game-server/src/app/app.module.ts

<interfaces>
<!-- Both apps are NestJS 10 apps using esbuild (thirdParty: false, so deps are NOT bundled). -->
<!-- Both use ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }). -->
<!-- No existing exception filters in either app. -->

From apps/api/src/main.ts:
```typescript
// Standard NestJS bootstrap with ValidationPipe, CORS, global prefix 'api'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
```

From apps/game-server/src/main.ts:
```typescript
// Standard NestJS bootstrap with CORS only
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
```

From apps/api/src/app/app.module.ts:
```typescript
@Module({
  imports: [ConfigModule.forRoot({...}), DatabaseModule, AuthModule, CharactersModule, ModerationModule],
  controllers: [HealthController],
})
export class AppModule {}
```

From apps/game-server/src/app/app.module.ts:
```typescript
@Module({
  imports: [ConfigModule.forRoot({...}), DatabaseModule, GameModule, ZonesModule],
  controllers: [HealthController],
})
export class AppModule {}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install @sentry/nestjs and add SENTRY_DSN to env files</name>
  <files>
    .env
    .env.example
  </files>
  <action>
1. Install the Sentry NestJS SDK at the workspace root:
   ```
   pnpm add @sentry/nestjs
   ```
   This installs `@sentry/nestjs` which includes `@sentry/node` as a dependency. No other Sentry packages are needed.

2. Add `SENTRY_DSN` to `.env.example` under a new `# Sentry` section (after the `# Environment` section):
   ```
   # Sentry
   SENTRY_DSN=
   ```

3. Add `SENTRY_DSN` to `.env` with the actual DSN value:
   ```
   # Sentry
   SENTRY_DSN=https://73ec17de3a7655558a45a694567d2d98@o4511070650826752.ingest.de.sentry.io/4511070653382736
   ```
  </action>
  <verify>
    Run `pnpm list @sentry/nestjs` to confirm installation. Grep .env.example for SENTRY_DSN to confirm env template updated.
  </verify>
  <done>@sentry/nestjs is installed, SENTRY_DSN present in both .env and .env.example</done>
</task>

<task type="auto">
  <name>Task 2: Configure Sentry in both NestJS apps (instrument.ts, main.ts, app.module.ts)</name>
  <files>
    apps/api/src/instrument.ts
    apps/api/src/main.ts
    apps/api/src/app/app.module.ts
    apps/game-server/src/instrument.ts
    apps/game-server/src/main.ts
    apps/game-server/src/app/app.module.ts
  </files>
  <action>
The `@sentry/nestjs` SDK requires three integration points per app: (1) an `instrument.ts` that initializes Sentry BEFORE anything else, (2) importing that file at the very top of `main.ts`, and (3) adding `SentryModule.forRoot()` to the app module plus the global `SentryGlobalFilter`.

**For apps/api:**

1. Create `apps/api/src/instrument.ts`:
   ```typescript
   import * as Sentry from '@sentry/nestjs';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV || 'development',
     // Only send events when DSN is configured
     enabled: !!process.env.SENTRY_DSN,
   });
   ```

2. Update `apps/api/src/main.ts` — add `import './instrument';` as the VERY FIRST line (before all other imports). Keep everything else unchanged.

3. Update `apps/api/src/app/app.module.ts`:
   - Import `SentryModule` from `@sentry/nestjs/setup`
   - Import `SentryGlobalFilter` from `@sentry/nestjs/setup`
   - Import `APP_FILTER` from `@nestjs/core`
   - Add `SentryModule.forRoot()` to the `imports` array (place it first, before ConfigModule)
   - Add a `providers` array with `{ provide: APP_FILTER, useClass: SentryGlobalFilter }` to register the global exception filter

**For apps/game-server:**

4. Create `apps/game-server/src/instrument.ts`:
   ```typescript
   import * as Sentry from '@sentry/nestjs';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV || 'development',
     enabled: !!process.env.SENTRY_DSN,
   });
   ```

5. Update `apps/game-server/src/main.ts` — add `import './instrument';` as the VERY FIRST line (before all other imports). Keep everything else unchanged.

6. Update `apps/game-server/src/app/app.module.ts`:
   - Same pattern as the API app module: add `SentryModule.forRoot()` to imports (first position) and `SentryGlobalFilter` as `APP_FILTER` provider.

IMPORTANT: The `import './instrument'` MUST be the first import in main.ts for both apps. Sentry needs to hook into Node.js before any other modules load. Do NOT use `Sentry.setupNestErrorHandler(app)` — that is the older API. The `SentryModule.forRoot()` + `SentryGlobalFilter` approach is the current `@sentry/nestjs` pattern.
  </action>
  <verify>
    Run `pnpm build` to verify both apps compile without errors. Check that instrument.ts is the first import in both main.ts files. Check that SentryModule.forRoot() is in both app.module.ts files.
  </verify>
  <done>
    Both apps have instrument.ts with Sentry.init(), main.ts imports instrument first, app.module.ts includes SentryModule.forRoot() and SentryGlobalFilter as APP_FILTER. `pnpm build` succeeds.
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` completes without errors for both api and game-server
2. `grep -r "Sentry.init" apps/api/src/instrument.ts apps/game-server/src/instrument.ts` shows both files
3. `grep -n "import.*instrument" apps/api/src/main.ts apps/game-server/src/main.ts` shows it as the first import in each
4. `grep "SentryModule" apps/api/src/app/app.module.ts apps/game-server/src/app/app.module.ts` shows module registration in both
5. `grep "SentryGlobalFilter" apps/api/src/app/app.module.ts apps/game-server/src/app/app.module.ts` shows filter registration in both
6. `grep "SENTRY_DSN" .env .env.example` confirms env var in both files
</verification>

<success_criteria>
- @sentry/nestjs is installed as a workspace dependency
- SENTRY_DSN is in .env (with actual value) and .env.example (empty placeholder)
- Both apps/api and apps/game-server have instrument.ts with Sentry.init()
- Both apps import instrument.ts as the first line in main.ts
- Both apps register SentryModule.forRoot() and SentryGlobalFilter in their app.module.ts
- `pnpm build` succeeds for both applications
</success_criteria>

<output>
After completion, create `.planning/quick/9-configure-sentry-error-tracking-for-api-/9-SUMMARY.md`
</output>
