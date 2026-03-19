---
phase: quick-9
plan: 1
subsystem: observability
tags: [sentry, error-tracking, monitoring, nestjs, api, game-server]
dependency_graph:
  requires: []
  provides: [sentry-error-tracking]
  affects: [apps/api, apps/game-server]
tech_stack:
  added: ["@sentry/nestjs@10.44.0"]
  patterns: [SentryModule.forRoot(), SentryGlobalFilter as APP_FILTER, instrument.ts initialization pattern]
key_files:
  created:
    - apps/api/src/instrument.ts
    - apps/game-server/src/instrument.ts
  modified:
    - apps/api/src/main.ts
    - apps/api/src/app/app.module.ts
    - apps/game-server/src/main.ts
    - apps/game-server/src/app/app.module.ts
    - .env.example
decisions:
  - "SENTRY_DSN is read from env var with enabled: !!process.env.SENTRY_DSN so apps run silently without DSN in development"
  - "SentryGlobalFilter registered as APP_FILTER for automatic unhandled exception capture"
metrics:
  duration: ~10min
  completed: "2026-03-19"
  tasks: 2
  files: 8
---

# Quick Task 9: Configure Sentry Error Tracking Summary

**One-liner:** Sentry error tracking integrated into both NestJS apps via @sentry/nestjs with instrument.ts init pattern, SentryModule.forRoot(), and SentryGlobalFilter as global exception handler.

## What Was Done

Configured Sentry error monitoring for `apps/api` (REST API on port 3000) and `apps/game-server` (WebSocket server on port 3001) using the official `@sentry/nestjs` SDK.

## Tasks Completed

### Task 1: Install @sentry/nestjs and add SENTRY_DSN to env files

- Installed `@sentry/nestjs@10.44.0` at workspace root using `pnpm add @sentry/nestjs -w`
- Added `SENTRY_DSN=` placeholder to `.env.example` under `# Sentry` section
- Added `SENTRY_DSN` with the actual DSN value to `.env`

**Commit:** `8118a6f`

### Task 2: Configure Sentry in both NestJS apps

Created `apps/api/src/instrument.ts` and `apps/game-server/src/instrument.ts`, each initializing Sentry before any other module loads:

```typescript
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.SENTRY_DSN,
});
```

Updated both `main.ts` files to import `./instrument` as the very first line.

Updated both `app.module.ts` files to add:
- `SentryModule.forRoot()` as first entry in `imports` array
- `{ provide: APP_FILTER, useClass: SentryGlobalFilter }` in `providers` array

**Commit:** `09cb5b7`

## Verification

All plan verification checks passed:

1. `pnpm build` completed successfully for all 12 projects
2. `Sentry.init` present in both `instrument.ts` files
3. `import './instrument'` is line 1 in both `main.ts` files
4. `SentryModule.forRoot()` registered in both `app.module.ts` files
5. `SentryGlobalFilter` registered as `APP_FILTER` in both `app.module.ts` files
6. `SENTRY_DSN` present in both `.env` and `.env.example`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/api/src/instrument.ts` — FOUND
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/instrument.ts` — FOUND
- Commit `8118a6f` — FOUND
- Commit `09cb5b7` — FOUND
