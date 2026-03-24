# Quick Task 16: Add Service Worker for Game Asset Caching

## Summary

Added a service worker to the web app that caches all game assets for fast loading.

## Changes

### New Files
- **`apps/web/public/sw.js`** — Service worker with dual caching strategy:
  - Cache-first for static assets: sprites (`.png`), audio (`.mp3`, `.ogg`, `.wav`), fonts (`.woff`, `.woff2`, `.ttf`), images, SVGs, and anything under `/assets/`
  - Network-first for API calls (`/api/`), WebSocket (`socket.io`), auth (`/auth/`), and Vite dev resources
  - Cache versioning (`itv-assets-v1`) with automatic cleanup of old caches on activation
  - Pre-caches app shell on install, uses `skipWaiting()` + `clients.claim()` for immediate activation

- **`apps/web/src/serviceWorkerRegistration.ts`** — Registration utility with:
  - Browser support detection
  - Localhost-aware registration (validates SW exists in dev)
  - Update detection with console logging
  - `unregister()` export for cleanup

### Modified Files
- **`apps/web/src/main.tsx`** — Added import and call to `register()` after app render

## Commit
- `2f4e92d` — `feat(quick-16): add service worker for game asset caching`
