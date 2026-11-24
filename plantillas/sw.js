'use strict';
// Service worker de Shipline. Las páginas y la API van siempre a la red (dependen de la sesión);
// solo se guardan las fuentes, que no cambian. Existe sobre todo para que la app se pueda instalar.
const FUENTES = 'shipline-fuentes-2';
const DE_FUENTES = /^https:\/\/fonts\.(googleapis|gstatic)\.com$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('shipline-') && k !== FUENTES).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!DE_FUENTES.test(url.origin)) return;
  e.respondWith(caches.open(FUENTES).then(async (c) => {
    const hit = await c.match(req);
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') c.put(req, r.clone());
    return r;
  }));
});
