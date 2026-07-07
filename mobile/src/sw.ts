/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope;

const VERSION = 'v1';
const RUNTIME_CACHE = `pracompra-runtime-${VERSION}`;
const SHELL_CACHE = `pracompra-shell-${VERSION}`;
const SHELL_URLS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('pracompra-') && !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetchAndCache(req).catch(() => {});
        return cached;
      }
      return fetchAndCache(req).catch(() => caches.match('/') as Promise<Response>);
    })
  );
});

async function fetchAndCache(req: Request): Promise<Response> {
  const res = await fetch(req);
  if (!res || res.status !== 200 || res.type !== 'basic') return res;
  const clone = res.clone();
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(req, clone).catch(() => {});
  return res;
}
