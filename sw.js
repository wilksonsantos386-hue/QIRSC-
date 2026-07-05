// ═══════════════════════════════════════════════════════════════════════
// QIRSC+ — Service Worker (v2 — mais robusto)
// Permite uso completo offline após a primeira visita com internet.
// ═══════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'qirsc-offline-v2';
const FILES_TO_CACHE = [
  './qirsc.html'
];

// Instala o service worker e salva o app no cache do dispositivo
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(
        FILES_TO_CACHE.map(function(url){
          return cache.add(url).catch(function(err){
            console.error('QIRSC+ falhou ao cachear', url, err);
          });
        })
      );
    })
  );
});

// Ativa imediatamente e limpa caches antigos de versões anteriores
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Só intercepta requisições do PRÓPRIO app (mesma origem).
// Requisições externas (fontes, geolocalização, envio de e-mail) passam
// direto — se falharem por falta de internet, falham normalmente sem
// travar nem confundir o app.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // deixa passar direto

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      // Cache-first: se já tem salvo, serve na hora (rápido e garante
      // que funcione offline mesmo com sinal ruim/instável em campo).
      var networkFetch = fetch(event.request).then(function(response) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function() {
        return cached || caches.match('./qirsc.html');
      });

      return cached || networkFetch;
    })
  );
});
