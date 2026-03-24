/**
 * Service Worker Registration
 *
 * Registers the service worker for caching game assets.
 * Cache-first for static assets (sprites, audio, fonts),
 * network-first for API and WebSocket connections.
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/
    )
);

export function register(): void {
  // Only register in production or explicitly on localhost for testing
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    if (isLocalhost) {
      // On localhost, check if a service worker still exists
      checkValidServiceWorker(swUrl);
      navigator.serviceWorker.ready.then(() => {
        console.log('[SW] Service worker ready (localhost)');
      });
    } else {
      registerValidSW(swUrl);
    }
  });
}

function registerValidSW(swUrl: string): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW] Registered successfully');

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available; old content has been purged
              console.log(
                '[SW] New content available, refresh to update'
              );
            } else {
              // Content is cached for the first time
              console.log('[SW] Content cached for offline use');
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW] Registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl: string): void {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found, unregister and reload
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection, running in offline mode');
    });
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('[SW] Unregister failed:', error);
      });
  }
}
