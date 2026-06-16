// ══════════════════════════════════════════════════════════════
// Razor Chart — Service Worker (sw.js)
// Place this file at the ROOT of your web server (same level as index.html)
// ══════════════════════════════════════════════════════════════

const CACHE_NAME    = "rc-v2";
const OFFLINE_URL   = "/index.html";

// Assets to pre-cache on install
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Network first, fall back to cache ─────────────────
self.addEventListener("fetch", event => {
  // Skip non-GET and cross-origin requests (Firebase, Flutterwave, etc.)
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for app shell files
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match(OFFLINE_URL)
        )
      )
  );
});

// ── PUSH NOTIFICATIONS (FCM) ──────────────────────────────────
self.addEventListener("push", event => {
  const data = event.data?.json() || {};
  const notification = data.notification || {};
  const title   = notification.title || "Razor Chart";
  const options = {
    body:    notification.body  || "You have a new update.",
    icon:    "/icons/icon-192.png",
    badge:   "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag:     "rc-notification",
    data:    { url: notification.click_action || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
