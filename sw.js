// ═══════════════════════════════════════════════════════════════════════
// QIRSC+ — Service Worker
// Permite uso completo offline após a primeira visita com internet.
// Todo o app (HTML, CSS, JS) fica salvo no celular/computador.
// Os dados das amostras continuam salvos no localStorage (já funciona
// offline por padrão, isso aqui garante que o PRÓPRIO APP abra sem rede).
// ═══════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'qirsc-offline-v1';
const FILES_TO_CACHE = [
  './qirsc.html',
  './'
];

// Instala o service worker e salva o app no cache do dispositivo
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE).catch(function(err){
        // Se algum arquivo falhar, tenta cachear individualmente
        return Promise.all(
          FILES_TO_CACHE.map(function(url){
            return cache.add(url).catch(function(){ /* ignora falha individual */ });
          })
        );
      });
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

// Estratégia: tenta a rede primeiro (pega atualizações), mas se não
// houver internet, serve a versão salva no cache — isso é o que
// garante o funcionamento 100% offline em campo.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Internet disponível: atualiza o cache com a versão mais recente
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(function() {
        // Sem internet: serve a versão salva localmente
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Fallback: se pediu a página principal, serve o qirsc.html salvo
          return caches.match('./qirsc.html');
        });
      })
  );
});
