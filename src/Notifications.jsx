import React,{useEffect,useState} from 'react';
import {Bell,BellOff} from 'lucide-react';
import {PUSH_KINDS} from './push-data.js';
// Notifications on this phone: the switch, and which kinds. An iPhone only offers them to the
// app added to the Home Screen, so a phone that cannot is told how, rather than shown a button
// that does nothing. Which kinds are wanted is kept with the subscription on the server, because
// it is the server that decides whom to tell.
const KEY='japan.push.prefs';
const readPrefs=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
const b64=s=>{const p='='.repeat((4-s.length%4)%4),raw=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));};
export default function Notifications({config,request,notice,user}){
 const supported=typeof window!=='undefined'&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
 const ios=/iPhone|iPad/.test(navigator.userAgent),standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone;
 const [sub,setSub]=useState(null),[busy,setBusy]=useState(false),[prefs,setPrefs]=useState(()=>({...Object.fromEntries(PUSH_KINDS.map(([id])=>[id,true])),...readPrefs()}));
 useEffect(()=>{if(supported)navigator.serviceWorker.ready.then(r=>r.pushManager.getSubscription()).then(setSub).catch(()=>{});},[supported]);
 const save=async(next,s=sub)=>{setPrefs(next);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}if(s)await request('push-subscribe',{subscription:s.toJSON(),prefs:next});};
 const on=async()=>{setBusy(true);try{
  if(await Notification.requestPermission()!=='granted'){notice('Notifications were not allowed. Turn them on for this app in the phone’s Settings.');return;}
  const reg=await navigator.serviceWorker.ready;
  const s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(config.pushKey)});
  await save(prefs,s);setSub(s);notice('Notifications are on for this phone.');
 }catch(e){notice(e.message||'Notifications could not be turned on.');}finally{setBusy(false);}};
 const off=async()=>{setBusy(true);try{const endpoint=sub?.endpoint;await sub?.unsubscribe();if(endpoint)await request('push-unsubscribe',{endpoint});setSub(null);notice('Notifications are off for this phone.');}catch(e){notice(e.message);}finally{setBusy(false);}};
 return <section className="settings-section">
  <h2>Notifications</h2>
  <p>Leave-by times, booking windows opening, the morning briefing and changes to the plan, on {user?.name?`${user.name}’s`:'this'} phone even with the app closed.</p>
  {!config?.push?<p className="callout">Notifications are not set up on the server yet. A parent adds the keys in Vercel; see docs/push.md.</p>
   :!supported?<p className="callout">{ios&&!standalone?'On an iPhone, notifications only work in the app added to the Home Screen. Tap Share, then Add to Home Screen, and open it from there.':'This browser cannot receive notifications.'}</p>
   :<>
    <div className="row wrap">{sub?<button type="button" disabled={busy} onClick={off}><BellOff size={16}/> Turn off on this phone</button>:<button type="button" className="primary" disabled={busy} onClick={on}><Bell size={16}/> Turn on notifications</button>}</div>
    {PUSH_KINDS.filter(([id])=>id!=='windows'||user?.role==='parent').map(([id,label,note])=><label className="checkline" key={id}><input type="checkbox" checked={prefs[id]!==false} disabled={busy} onChange={e=>save({...prefs,[id]:e.target.checked})}/><span>{label}<small>{note}</small></span></label>)}
   </>}
 </section>;
}
