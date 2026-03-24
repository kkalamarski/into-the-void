# Quick Task 16: Add Service Worker for Asset Caching

## Metadata
- **Date:** 2026-03-24
- **Description:** Add a service worker to the web app that caches all game assets (sprites, textures, audio files, fonts) for offline/fast loading with cache-first strategy for static assets and network-first for API/WebSocket calls.

## Must Haves

### Truths
- Service worker file exists at `apps/web/public/sw.js`
- Service worker is registered from `apps/web/src/main.tsx`
- Cache-first strategy is used for static assets (images, audio, fonts)
- Network-first strategy is used for API calls (`/api/`) and WebSocket (`socket.io`)
- Cache versioning is implemented for cache invalidation

### Artifacts
- `apps/web/public/sw.js` — the service worker
- `apps/web/src/serviceWorkerRegistration.ts` — registration utility
- `apps/web/src/main.tsx` — updated to register service worker

### Key Links
- `apps/web/vite.config.ts` — Vite config (no plugin needed, using manual SW)
- `apps/web/public/assets/` — all game assets to cache
- `apps/web/index.html` — entry point

## Tasks

### Task 1: Create the service worker file
- **files:** `apps/web/public/sw.js`
- **action:** Create a service worker that:
  1. Defines a cache version constant (`CACHE_VERSION = 'itv-assets-v1'`)
  2. On `install`: opens cache and pre-caches critical shell assets (index.html)
  3. On `activate`: cleans up old cache versions
  4. On `fetch`: uses cache-first for asset requests matching patterns (`/assets/`, `.png`, `.mp3`, `.woff`, `.woff2`, `.ttf`, `.json` in assets dir), network-first for API/WebSocket (`/api/`, `socket.io`, `/auth/`), and network-first with cache fallback for navigation/HTML requests
- **verify:** File exists at `apps/web/public/sw.js`, contains `addEventListener('install')`, `addEventListener('activate')`, `addEventListener('fetch')`, cache-first and network-first logic
- **done:** Service worker file complete with both caching strategies

### Task 2: Create registration utility and wire into main.tsx
- **files:** `apps/web/src/serviceWorkerRegistration.ts`, `apps/web/src/main.tsx`
- **action:**
  1. Create `serviceWorkerRegistration.ts` that exports a `register()` function which checks for SW support, registers `/sw.js`, and handles updates (logs update available)
  2. Update `main.tsx` to import and call `register()` after app render
- **verify:** `serviceWorkerRegistration.ts` exists with `register` export, `main.tsx` imports and calls it
- **done:** Service worker registration wired into app entry point

### Task 3: Commit all changes
- **files:** all modified/created files
- **action:** Stage and commit with message `feat(quick-16): add service worker for game asset caching`
- **verify:** `git log -1` shows commit
- **done:** Changes committed
