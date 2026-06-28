const CACHE_VERSION = "curiosity-coding-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/theme.js",
  "/icons/icon.svg",
  "/icons/maskable-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(async (cache) => {
        await cache.addAll(await getInstallAssets());
        await self.skipWaiting();
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      if (new URL(request.url).pathname === "/") {
        await cache.put(fallbackUrl, response.clone());
      }
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? cache.match(fallbackUrl);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function getInstallAssets() {
  try {
    const response = await fetch("/");
    const html = await response.clone().text();
    const assetUrls = Array.from(html.matchAll(/\b(?:src|href)="([^"]+)"/g))
      .map((match) => match[1])
      .filter((assetUrl) => assetUrl.startsWith("/") && !assetUrl.startsWith("//"));

    const cache = await caches.open(CACHE_VERSION);
    await cache.put("/", response);
    return [...new Set([...APP_SHELL.filter((assetUrl) => assetUrl !== "/"), ...assetUrls])];
  } catch {
    return APP_SHELL;
  }
}
