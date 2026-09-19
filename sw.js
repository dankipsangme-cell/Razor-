// Razor Chart — Service Worker
const CACHE = "rc-v3";
const SHELL = ["index.html", "manifest.json"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Don't intercept Firebase, Alpha Vantage or Google Fonts — needs live network
  const url = e.request.url;
  if (url.includes("firebaseio.com") ||
      url.includes("googleapis.com") ||
      url.includes("alphavantage.co") ||
      url.includes("gstatic.com")) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
