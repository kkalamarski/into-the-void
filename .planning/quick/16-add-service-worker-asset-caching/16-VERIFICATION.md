status: passed

# Verification: Quick Task 16 — Service Worker Asset Caching

## Must Haves Check

| # | Must Have | Status |
|---|-----------|--------|
| 1 | Service worker file exists at `apps/web/public/sw.js` | PASS |
| 2 | Service worker registered from `apps/web/src/main.tsx` | PASS |
| 3 | Cache-first strategy for static assets (images, audio, fonts) | PASS |
| 4 | Network-first strategy for API (`/api/`) and WebSocket (`socket.io`) | PASS |
| 5 | Cache versioning for invalidation (`CACHE_VERSION = 'itv-assets-v1'`) | PASS |

## Artifacts Check

| Artifact | Exists |
|----------|--------|
| `apps/web/public/sw.js` | Yes |
| `apps/web/src/serviceWorkerRegistration.ts` | Yes |
| `apps/web/src/main.tsx` (updated) | Yes |

## Details

- **sw.js**: Contains `install`, `activate`, `fetch` event listeners. `cacheFirst()` handles `.png`, `.mp3`, `.woff`, `.woff2`, `.ttf`, `.svg`, and `/assets/` paths. `networkFirst()` handles `/api/`, `socket.io`, `/auth/`, and Vite dev resources.
- **serviceWorkerRegistration.ts**: Exports `register()` and `unregister()`. Handles localhost dev mode, update detection, and offline fallback.
- **main.tsx**: Imports and calls `register()` after app render.
