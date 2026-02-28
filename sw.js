const CACHE = 'agentspark-v1';
const FONTS = [
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;600;800&display=swap',
  'https://fonts.gstatic.com'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // Cache the app shell itself (the HTML)
      return c.addAll(['./']).catch(() => {});
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for API calls (never cache)
  if(url.hostname.includes('googleapis.com') && url.pathname.includes('generateContent')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if(url.hostname.includes('openai.com') ||
     url.hostname.includes('anthropic.com') ||
     url.hostname.includes('mistral.ai') ||
     url.hostname.includes('groq.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for fonts and static assets
  if(url.hostname.includes('fonts.g') || e.request.destination === 'font') {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // Stale-while-revalidate for the app shell
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if(res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    )
  );
});

// Listen for skip-waiting message from update toast
self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
