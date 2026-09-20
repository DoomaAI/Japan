const SHELL='japan-shell-v1',PRIVATE='japan-private-v1';
const PRELOAD = /* BUILD_ASSETS */ ['/','/favicon-32.png','/icon-180.png','/icon-192.png','/manifest.webmanifest','/cover.jpg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(SHELL).then(c=>c.addAll(PRELOAD)));});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(u.pathname.startsWith('/api/')){
  if(!['/api/guide','/api/document'].includes(u.pathname))return;
  event.respondWith(fetch(event.request).catch(async()=>{const c=await caches.open(PRIVATE);return await c.match(event.request)||new Response('Not saved offline',{status:503});}));return;
 }
 event.respondWith((async()=>{const c=await caches.open(SHELL);try{const r=await fetch(event.request);if(r.ok&&(u.pathname.startsWith('/assets/')||event.request.mode==='navigate'))await c.put(event.request.mode==='navigate'?'/':event.request,r.clone());return r;}catch{return await c.match(event.request.mode==='navigate'?'/':event.request)||new Response('Open the app once while online to save it.',{status:503});}})());
});
