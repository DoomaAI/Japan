// Sharing where I am for a while, rather than once. Said once — "for the next hour" — and the
// phone sends its position every couple of minutes while the app is open, to the same three-hour
// position row Check In and the memory map use, rounded the same way. A web app on an iPhone
// cannot do this in the background, so it says so: put away, the phone stops until it is opened
// again, and the others see how long ago it last spoke. The end time is kept on the phone, so
// leaving the screen or the app being reloaded does not stop it early.
import {useCallback,useEffect,useState} from 'react';
import {useStored} from './stored.js';
import {CHECKIN_PLACES,CHECKIN_HOURS} from './memory-map.js';
import {SHARE_EVERY_MS} from './checkin-data.js';
import {askPhoneWhereItIs} from './geo.js';
// How long a share can be asked for. No longer than the server keeps a position.
export const SHARE_FOR=[30,60,120].filter(m=>m<=CHECKIN_HOURS*60);
export const sharingUntil=(until,now=Date.now())=>until&&Date.parse(until)>now?until:null;
export function useLiveShare(request,on=true){
 const [until,setUntil]=useStored('japan.liveShare',null),[last,setLast]=useState(null),[trouble,setTrouble]=useState('');
 const live=on&&!!sharingUntil(until);
 const once=useCallback(async()=>{
  try{const at=await askPhoneWhereItIs(CHECKIN_PLACES);setTrouble('');const r=await request('checkin',at);setLast({...at,at:new Date().toISOString()});return r.checkins||[];}
  catch(e){setTrouble(e.message||'Your position could not be shared.');throw e;}
 },[request]);
 useEffect(()=>{
  if(!live)return;
  let stopped=false;
  const tick=()=>{if(stopped)return;if(!sharingUntil(until)){setUntil(null);return;}once().catch(()=>{});};
  tick();const t=setInterval(tick,SHARE_EVERY_MS);
  // Back from the background: share now rather than up to two minutes from now.
  const wake=()=>{if(document.visibilityState==='visible')tick();};
  document.addEventListener('visibilitychange',wake);
  return ()=>{stopped=true;clearInterval(t);document.removeEventListener('visibilitychange',wake);};
 },[live,until]);
 const start=useCallback(minutes=>setUntil(new Date(Date.now()+minutes*60000).toISOString()),[setUntil]);
 const stop=useCallback(async()=>{setUntil(null);setLast(null);return (await request('checkin',{stop:true})).checkins||[];},[request,setUntil]);
 return {until:live?until:null,last,trouble,start,stop,once};
}
