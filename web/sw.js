const APP_VERSION = "20260523a";
const CACHE_NAME = `sumadora-contable-${APP_VERSION}`;
const ASSETS = [
  `./index.html?v=${APP_VERSION}`,
  `./styles.css?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  "./engine.mjs",
  `./manifest.webmanifest?v=${APP_VERSION}`,
  `./icon.svg?v=${APP_VERSION}`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(responderRequest(event.request));
});

async function responderRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request, { cache: "no-store" });
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === "navigate") {
      const fallback =
        (await cache.match(`./index.html?v=${APP_VERSION}`)) ||
        (await cache.match("./index.html"));
      if (fallback) {
        return fallback;
      }
    }

    throw error;
  }
}
