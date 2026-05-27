const APP_VERSION = "20260527a";
const CACHE_NAME = `sumadora-contable-${APP_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  `./index.html?v=${APP_VERSION}`,
  `./styles.css?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  "./engine.mjs",
  `./manifest.webmanifest?v=${APP_VERSION}`,
  `./icon.svg?v=${APP_VERSION}`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
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
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(responderNavegacion());
    return;
  }

  if (esRecursoShell(url.pathname)) {
    event.respondWith(responderCachePrimero(request));
    return;
  }

  event.respondWith(responderConRedYRespaldo(request));
});

async function responderNavegacion() {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse =
    (await cache.match(`./index.html?v=${APP_VERSION}`)) ||
    (await cache.match("./index.html")) ||
    (await cache.match("./"));

  if (cachedResponse) {
    return cachedResponse;
  }

  return fetchYGuardar(new Request(`./index.html?v=${APP_VERSION}`, { cache: "no-store" }));
}

async function responderCachePrimero(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });

  if (cachedResponse) {
    return cachedResponse;
  }

  return fetchYGuardar(request);
}

async function responderConRedYRespaldo(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request, { ignoreSearch: true });
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

function fetchYGuardar(request) {
  return fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  });
}

function esRecursoShell(pathname) {
  return (
    pathname.endsWith("/") ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith("/styles.css") ||
    pathname.endsWith("/app.js") ||
    pathname.endsWith("/engine.mjs") ||
    pathname.endsWith("/manifest.webmanifest") ||
    pathname.endsWith("/icon.svg")
  );
}
