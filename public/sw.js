const SHELL='japan-shell-v1',PRIVATE='japan-private-v1';
const PRELOAD = /* BUILD_ASSETS */ ['/','/favicon-32.png','/icon-180.png','/icon-192.png','/manifest.webmanifest','/cover.jpg'];
// Take over as soon as a new build is installed. Without this a new version sits waiting
// until every copy of the app is closed, which on a Home Screen app can be days.
self.addEventListener('install',event=>{event.waitUntil(caches.open(SHELL).then(c=>c.addAll(PRELOAD)).then(()=>self.skipWaiting()));});
// Caches from an older naming are cleared on the way in, so a phone never carries two shells.
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>![SHELL,PRIVATE].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
// How long the network gets to answer for the app itself before the copy saved on the phone
// opens instead. A weak signal on a platform is the moment the app matters most, and four
// seconds of spinner is the difference between opening the saved copy and giving up on it.
const NET_WAIT=4000;
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(u.pathname.startsWith('/api/')){
  if(!['/api/guide','/api/document','/api/vault','/api/vault-file'].includes(u.pathname))return;
  event.respondWith(fetch(event.request).catch(async()=>{const c=await caches.open(PRIVATE);return await c.match(event.request)||new Response('Not saved offline',{status:503});}));return;
 }
 // Network first, but not network only: if it has not answered in NET_WAIT the saved copy opens
 // while the network is left to finish in the background and refresh the copy for next time.
 // Only when there is no saved copy at all does the app wait for the slow answer.
 event.respondWith((async()=>{
  const c=await caches.open(SHELL),key=event.request.mode==='navigate'?'/':event.request,keep=r=>r.ok&&(u.pathname.startsWith('/assets/')||event.request.mode==='navigate');
  const net=fetch(event.request).then(r=>{if(keep(r))c.put(key,r.clone());return r;});
  const first=await Promise.race([net.catch(()=>null),new Promise(res=>setTimeout(()=>res(null),NET_WAIT))]);
  if(first)return first;
  const saved=await c.match(key);if(saved)return saved;
  try{return await net;}catch{return new Response('Open the app once while online to save it.',{status:503});}
 })());
});
// A push from the family server: shown as a notification even with the app closed. Tapping it
// opens the app on the thing it was about, in the window already open if there is one.
self.addEventListener('push',event=>{
 let d={};try{d=event.data?event.data.json():{};}catch{d={title:'Japan 2026',body:event.data?.text()||''};}
 event.waitUntil(self.registration.showNotification(d.title||'Japan 2026',{body:d.body||'',tag:d.tag||undefined,icon:'/icon-192.png',badge:'/favicon-32.png',data:{url:d.url||'/'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'/',self.location.origin);
 event.waitUntil((async()=>{
  const wins=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const same=wins.find(w=>new URL(w.url).origin===url.origin);
  if(same&&url.origin===self.location.origin){await same.focus();return same.navigate(url.href).catch(()=>{});}
  return self.clients.openWindow(url.href);
 })());
});
