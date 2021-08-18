self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('v1').then(function(cache) {
        return cache.addAll(
          [
            'boxes.html',
            'boxes.js',
            'boxes.css',
            'images.css',
            'pokedex.js',
            'images.png'
          ]
        );
      })
    );
  });

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});