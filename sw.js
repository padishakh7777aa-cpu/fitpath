/* Service worker: быстрые повторные запуски. Стратегия:
   - index.html и manifest.json: сеть сначала (чтобы обновления доходили), кэш как запасной вариант
   - остальные файлы приложения: из кэша сразу, в фоне обновляются (stale-while-revalidate)
   Версия в CACHE меняется при релизе, старые кэши удаляются. */
const CACHE='lw-v2';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;               // сторонние (telegram.org) не трогаем
  if(!/\.(html|js|css|glb|fbx|json|png|svg)$/.test(url.pathname)&&!url.pathname.endsWith('/'))return;
  const isDoc=req.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/')||url.pathname.endsWith('manifest.json');
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(isDoc){
      try{const r=await fetch(req);if(r&&r.ok)cache.put(req,r.clone());return r}
      catch(err){const c=await cache.match(req);if(c)return c;throw err}
    }
    const cached=await cache.match(req);
    const net=fetch(req).then(r=>{if(r&&r.ok)cache.put(req,r.clone());return r}).catch(()=>null);
    return cached||(await net)||Response.error();
  })());
});
