/* Offline study shell: public catalog/assets only; never caches authenticated APIs or user content. */
const CACHE='bacpedia-public-v1';
const CORE=['/student/','/assets/app.css','/assets/chapters.css','/assets/portals.css','/assets/legacy-app.js','/assets/chapter-search.js','/assets/chapters.js','/assets/study-hub.js','/assets/practice.js','/assets/community.js','/assets/ai-format.js','/resources.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
   await Promise.all(CORE.map(async url=>{try{const response=await fetch(url,{credentials:'omit'});if(response.ok&&response.type==='basic')await cache.put(url,response)}catch{/* offline first load */}}));
   await self.skipWaiting();
 }));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('bacpedia-public-')).map(key=>caches.delete(key)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 const p=url.pathname;
 if(p.startsWith('/api/')||p.startsWith('/admin/')||p.startsWith('/contributor/')||p.startsWith('/login/')||p.startsWith('/auth'))return;
 if(req.headers.has('Authorization'))return;
 const eligible=p==='/student/'||p==='/resources.json'||p.startsWith('/assets/');
 if(!eligible)return;
 event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
     const response=await fetch(req);
     if(response.ok&&response.type==='basic'&&!response.headers.has('set-cookie'))await cache.put(req,response.clone());
     return response;
   }catch{
     const fallback=await cache.match(req,{ignoreSearch:true});
     return fallback||new Response('Offline content not cached',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
   }
 })());
});
