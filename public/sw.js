// This service worker is required to make the app installable.
self.addEventListener('fetch', (event) => {
  // A basic network-first strategy.
  event.respondWith(fetch(event.request));
});
