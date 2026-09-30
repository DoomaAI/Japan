// The screen the trip opens on while it comes in from the server. It is the guide's own cover,
// so the first thing anyone sees is the book Lauren made, with the day's count over it. It can
// be a blink on hotel Wi-Fi or twenty seconds on a train, so there is something to do in the
// wait: petals fall across the cover and a tap catches one, and the facts from today's guide
// pages turn over one by one. Everything here is on the phone already — the cover is in the
// offline shell, the facts are in the bundle, the dates are in the last saved copy — so it
// works with no signal, which is exactly when the wait is longest.
import React,{useEffect,useRef,useState} from 'react';
import {tripCountdown,japanDate} from './timing.js';
import {factsForDay,ANYTIME_FACTS} from './fact-data.js';

const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const calm=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

// A petal is somewhere across the width, a size, a speed and a sway; a caught one comes back as
// a new petal from the top so the sky never empties.
let nextId=0;
const petal=(first=false)=>({id:nextId++,left:Math.random()*96,size:14+Math.random()*14,fall:7+Math.random()*6,
 delay:first?-Math.random()*10:Math.random()*1.5,sway:(Math.random()<.5?-1:1)*(20+Math.random()*40),spin:Math.random()*360});
const PETALS=12;

// Today's facts first when today is a trip day, then the ones that fit any day; shuffled from a
// point that changes each open so the same fact is not always first.
function factsNow(days){
 const today=factsForDay(days,japanDate()),rest=ANYTIME_FACTS().filter(f=>!today.includes(f));
 const list=[...today,...rest];
 if(!list.length)return [];
 const start=today.length?0:Math.floor(Math.random()*list.length);
 return [...list.slice(start),...list.slice(0,start)];
}

function Countdown({days}){const c=tripCountdown(days);if(!c)return null;
 return <p className={`opening-countdown ${c.phase}`} aria-label="Trip countdown">{c.phase==='before'?<><strong>{c.days}</strong><span>{c.days===1?'day to go':'days to go'}</span></>:c.phase==='during'?<><strong>{`Day ${c.day}`}</strong><span>{`of ${c.total} days in Japan`}</span></>:<span>{c.text}</span>}</p>;}

function Petals({onCatch}){
 const [petals,setPetals]=useState(()=>Array.from({length:PETALS},()=>petal(true)));
 const [caught,setCaught]=useState(()=>new Set());
 const timers=useRef([]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 const take=p=>{if(caught.has(p.id))return;
  setCaught(s=>new Set(s).add(p.id));onCatch();
  navigator.vibrate?.(12);
  timers.current.push(setTimeout(()=>{setPetals(all=>all.map(x=>x.id===p.id?petal():x));setCaught(s=>{const n=new Set(s);n.delete(p.id);return n;});},650));};
 return <div className="opening-petals" aria-hidden="true">{petals.map(p=><button key={p.id} tabIndex={-1} className={`opening-petal${caught.has(p.id)?' caught':''}`}
  style={{left:`${p.left}%`,'--size':`${p.size}px`,'--fall':`${p.fall}s`,'--delay':`${p.delay}s`,'--sway':`${p.sway}px`,'--spin':`${p.spin}deg`}}
  onPointerDown={e=>{e.preventDefault();take(p);}}><i/></button>)}</div>;
}

export default function Opening({days}){
 const [facts]=useState(()=>factsNow(days));
 const [at,setAt]=useState(0);
 const [count,setCount]=useState(0),[total,setTotal]=useState(()=>read('japan.petals',0));
 const [still]=useState(calm);
 // A fact stays up long enough to read aloud to a six-year-old, and a tap moves on sooner.
 useEffect(()=>{if(facts.length<2)return;const t=setTimeout(()=>setAt(i=>(i+1)%facts.length),8000);return()=>clearTimeout(t);},[at,facts.length]);
 const next=()=>setAt(i=>(i+1)%facts.length);
 const onCatch=()=>{setCount(n=>n+1);setTotal(n=>{write('japan.petals',n+1);return n+1;});};
 const fact=facts[at];
 return <main className={`opening${still?' still':''}`}>
  <div className="opening-backdrop" aria-hidden="true"/>
  <div className="opening-stage">
   <img className="opening-cover" src="/cover.jpg" alt="The Pasfield family Japan Travel Guide 2026 cover: the family walking towards a pagoda and Mount Fuji under cherry blossom"/>
   {!still&&<Petals onCatch={onCatch}/>}
   <div className="opening-panel">
    <Countdown days={days}/>
    {!still&&<p className="opening-catch" aria-live="polite">{count?<><b>🌸 {count}</b> caught{total>count?<span> · {total} all trip</span>:null}</>:'Tap a falling petal to catch it'}</p>}
    {fact&&<button className="opening-fact" onClick={next} aria-label={`Fun fact: ${fact.title}. ${fact.text} Tap for another.`}>
     <span className="opening-fact-top"><span>{fact.icon}</span><small>FROM THE GUIDE · PAGE {fact.page}</small></span>
     <strong key={`t${fact.id}`}>{fact.title}</strong>
     <span key={`x${fact.id}`} className="opening-fact-text">{fact.text}</span>
     {facts.length>1&&<i key={`b${at}`} className="opening-fact-timer" aria-hidden="true"/>}
    </button>}
    <div className="opening-track" role="status"><span className="opening-rail" aria-hidden="true"><span className="opening-train">🚅</span></span><span>Opening your family trip…</span></div>
   </div>
  </div>
 </main>;
}
