// The watching half of Matcha nearby (src/matcha-nearby.js). While it is switched on and the app
// is open, the phone's position is followed and the nearest matcha place within reach is said
// once: a toast and a buzz on screen, and a notification as well when the app has been put
// away but the phone is still giving it positions. A Home Screen app on an iPhone is not given
// positions once it is closed, so this can only ever be "while the app is open or just put
// away" — the setting says so, rather than promising a geofence it cannot keep.
import {useEffect,useRef} from 'react';
import {matchaPlaces,matchaInReach,matchaWords,matchaUrl,readSeen,markSeen} from './matcha-nearby.js';
import {GEO_TROUBLE,GEO_UNKNOWN} from './geo.js';
import {japanDate} from './timing.js';
export function useMatchaNearby({on,state,person,radius,notice}){
 const live=useRef({});live.current={state,person,radius,notice};
 useEffect(()=>{
  if(!on)return;
  if(typeof navigator==='undefined'||!navigator.geolocation){notice('This phone cannot share its position, so Matcha nearby cannot watch for places.');return;}
  let complained=false;
  const id=navigator.geolocation.watchPosition(p=>{
   const {state,person,radius,notice}=live.current,today=japanDate();
   const hits=matchaInReach(matchaPlaces(state).places,{lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy},radius,readSeen(person),today);
   if(!hits.length)return;
   // Everything in reach is counted as told, so a street of tea shops is one buzz, not five.
   markSeen(person,hits.map(h=>h.key),today);
   const w=matchaWords({...hits[0],others:hits.length-1},radius);
   try{navigator.vibrate?.([200,100,200]);}catch{}
   notice(`${w.title}. ${w.text}`);
   if(document.visibilityState!=='visible'&&typeof Notification!=='undefined'&&Notification.permission==='granted')
    navigator.serviceWorker?.ready.then(r=>r.showNotification(w.title,{body:w.text,tag:`matcha-${hits[0].key}`,icon:'/icon-192.png',badge:'/favicon-32.png',data:{url:matchaUrl(hits[0])}})).catch(()=>{});
  },e=>{if(complained||e?.code===3)return;complained=true;live.current.notice(`Matcha nearby: ${GEO_TROUBLE[e?.code]||GEO_UNKNOWN}.`);},
  {enableHighAccuracy:true,maximumAge:30000,timeout:60000});
  return ()=>navigator.geolocation.clearWatch(id);
 },[on]);
}
