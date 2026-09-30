import React,{useEffect,useState,useRef} from 'react';
import {frameSet,frameCaption,nextIndex,nightHour,FRAME_SECONDS} from './frame-data.js';
// The frame: one photo filling the screen, the caption in a corner, a clock, and a tap that
// claps. It asks for the trip every few minutes, keeps the screen awake, dims after ten in its
// own time zone, and prefetches the next few photos so a dropped Wi-Fi does not blank it.
export default function FollowFrame({followKey}){
 const [view,setView]=useState(null),[error,setError]=useState(''),[i,setI]=useState(0),[tick,setTick]=useState(new Date()),[bright,setBright]=useState(false);
 const [name,setName]=useState(()=>{try{return localStorage.getItem('japan.follow.name')||'';}catch{return '';}}),[asking,setAsking]=useState(false),[typed,setTyped]=useState(''),[clapped,setClapped]=useState('');
 const load=()=>fetch(`/api/follow?key=${encodeURIComponent(followKey)}`,{credentials:'omit'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'This link is not working right now.');setView(b);setError('');}).catch(e=>{if(!view)setError(e.message);});
 useEffect(()=>{document.title='Our frame · Japan 2026';load();const t=setInterval(load,5*60000);return()=>clearInterval(t);},[followKey]);
 useEffect(()=>{let lock=null;navigator.wakeLock?.request('screen').then(l=>{lock=l;}).catch(()=>{});return()=>{lock?.release().catch(()=>{});};},[]);
 useEffect(()=>{const t=setInterval(()=>setTick(new Date()),30000);return()=>clearInterval(t);},[]);
 const set=frameSet(view),shot=set[i%Math.max(1,set.length)]||null;
 useEffect(()=>{if(!set.length)return;const t=setInterval(()=>setI(x=>nextIndex(x,set.length)),FRAME_SECONDS*1000);return()=>clearInterval(t);},[set.length]);
 const img=id=>`/api/follow-photo?key=${encodeURIComponent(followKey)}&id=${encodeURIComponent(id)}`;
 const cache=useRef(new Set());
 useEffect(()=>{for(let k=1;k<=3;k++){const p=set[(i+k)%Math.max(1,set.length)];if(p&&!cache.current.has(p.id)){cache.current.add(p.id);const im=new Image();im.src=img(p.id);}}},[i,set.length]);
 const dim=nightHour(tick.getHours())&&!bright;
 async function clap(who=name){
  if(!shot)return;if(!who){setAsking(true);return;}
  try{const r=await fetch('/api/follow-react',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:followKey,target:'photo',id:shot.id,emoji:'👏',name:who})});const b=await r.json();if(!r.ok)throw new Error(b.error||'');setView(b);setClapped(shot.id);setTimeout(()=>setClapped(''),2500);}
  catch(e){setError(e.message||'Could not send that.');}
 }
 if(!view)return <main className="frame frame-empty"><div className="brand-mark">日</div><p>{error||'Opening the trip…'}</p></main>;
 if(!shot)return <main className="frame frame-empty"><div className="brand-mark">日</div><h1>{view.tripName}</h1><p>The first photo of the day goes up here once the trip starts.</p></main>;
 return <main className={`frame${dim?' dim':''}`} onClick={()=>dim?setBright(true):clap()}>
  <img key={shot.id} src={img(shot.id)} alt={`A photo by ${shot.by}`}/>
  <div className="frame-caption"><strong>{frameCaption(shot)}</strong><span>{shot.best?`Photo of the day · ${shot.by}`:`By ${shot.by}`}{shot.said?` · “${shot.said}”`:''}</span></div>
  <div className="frame-clock">{tick.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}</div>
  {clapped===shot.id&&<div className="frame-clap" aria-live="polite">👏 Sent to the family</div>}
  {asking&&<form className="frame-ask" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();const n=typed.trim();if(!n)return;setName(n);try{localStorage.setItem('japan.follow.name',n);}catch{}setAsking(false);clap(n);}}>
   <label>Your first name, so the boys know who clapped<input autoFocus value={typed} onChange={e=>setTyped(e.target.value)}/></label><button className="primary">Clap</button></form>}
  <small className="frame-hint">{dim?'Tap to brighten':'Tap the photo to clap'}</small>
 </main>;
}
