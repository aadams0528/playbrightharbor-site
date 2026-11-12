// Travel Globe offline support. Scope: /travel-globe* pages only; the rest of the site is left alone.
// Pages: network first (so updates arrive), falling back to the saved copy offline.
// Libraries and fonts from the CDNs: saved the first time, then served from the saved copy.
const CACHE = "travel-globe-v1";
const PRECACHE = [
  "/travel-globe-test.html", "/travel-globe-next.html",
  "/travel-globe-icon-192.png", "/travel-globe-icon-512.png", "/travel-globe-icon-180.png",
  "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js",
  "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js",
  "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js",
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
];
const CDN = /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, {cache:"reload"})).catch(() => {}))))); });
self.addEventListener("activate", e => e.waitUntil((async () => {
  const keys = await caches.keys(); await Promise.all(keys.filter(k => k.startsWith("travel-globe-") && k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim(); })()));
self.addEventListener("fetch", e => { const r = e.request; if (r.method !== "GET") return; const u = new URL(r.url);
  if (u.origin === location.origin){
    if (!u.pathname.startsWith("/travel-globe")) return;
    if (u.pathname.startsWith("/travel-globe-music/")) return; // place music streams straight from the site (audio uses partial requests, which can't be cached); offline, the built-in music plays instead
    e.respondWith(fetch(r).then(res => { if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r, {ignoreSearch:true}).then(hit => hit || caches.match(u.pathname, {ignoreSearch:true})).then(hit => hit || Response.error())));
    return; }
  if (!CDN.test(u.hostname)) return;
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === "opaque"){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })));
});
