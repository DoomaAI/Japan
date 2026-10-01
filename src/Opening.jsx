// The screen the trip opens on while it comes in from the server. It is the guide's own cover,
// so the first thing anyone sees is the book Lauren made, with the day's count over it. It can
// be a blink on hotel Wi-Fi or twenty seconds on a train, so there is something to do in the
// wait: petals fall across the cover and a tap catches one, and the facts from today's guide
// pages turn over one by one, taking turns with a Japanese word from the phrasebook. Every
// open starts on the next card along, and on the other kind from last time, so the wait never
// opens on the same thing twice. Everything here is on the phone already — the cover is in the
// offline shell, the facts are in the bundle, the dates are in the last saved copy — so it
// works with no signal, which is exactly when the wait is longest.
//
// When the trip has come in, the screen stays until the card on it has had its full time, so
// nobody loses a fact halfway through reading it; a tap on the card, or Go in now, skips the
// rest. Which cards come round — facts and words, one or the other, or none — is chosen at the
// foot of the screen and under Customise. With none, the trip opens the moment it is ready.
import React,{useEffect,useRef,useState} from 'react';
import {TIP_OPTIONS,readTips,writeTips,showsFacts,showsWords} from './opening-tips.js';
import {tripCountdown,japanDate} from './timing.js';
import {factsForDay,ANYTIME_FACTS} from './fact-data.js';
import {phraseForDay,ORDERED_PHRASES} from './phrasebook-data.js';

const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const calm=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

// A petal is somewhere across the width, a size, a speed and a sway; a caught one comes back as
// a new petal from the top so the sky never empties.
let nextId=0;
const petal=(first=false)=>({id:nextId++,left:Math.random()*96,size:14+Math.random()*14,fall:7+Math.random()*6,
 delay:first?-Math.random()*10:Math.random()*1.5,sway:(Math.random()<.5?-1:1)*(20+Math.random()*40),spin:Math.random()*360});
const PETALS=12;

// Today's facts first when today is a trip day, then the ones that fit any day; and the same
// for words, today's phrase from the daily rota first, then the rest of the book.
function factsNow(days){
 const today=factsForDay(days||[],japanDate()),rest=ANYTIME_FACTS().filter(f=>!today.includes(f));
 return [...today,...rest].map(f=>({...f,kind:'fact'}));
}
function wordsNow(days){
 const today=days?.length?phraseForDay(days,japanDate()):null,all=ORDERED_PHRASES();
 return [...(today?[today]:[]),...all.filter(p=>p.id!==today?.id)].map(p=>({...p,kind:'word'}));
}
// Where the last open got to: the next fact, the next word, and which kind goes first. A new
// day starts both lists again from the top, so today's own cards come round first.
const PLACE='japan.opening.place';
// A kind switched off is left out of the deck but keeps its place, so turning it back on carries
// on from where it was.
function deckNow(days,tips='both'){
 const facts=factsNow(days),words=wordsNow(days),date=japanDate();
 let {date:was,fact=0,word=0,first='fact'}=read(PLACE,{})||{};
 if(was!==date){fact=0;word=0;}
 const order=first==='word'?[words,facts]:[facts,words],at=first==='word'?[word,fact]:[fact,word],deck=[];
 const on=first==='word'?[showsWords(tips),showsFacts(tips)]:[showsFacts(tips),showsWords(tips)];
 for(let i=0;i<Math.max(facts.length,words.length);i++)order.forEach((list,k)=>{if(on[k]&&list.length)deck.push(list[(at[k]+i)%list.length]);});
 return {deck,facts:facts.length,words:words.length,fact,word,first};
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

export default function Opening({days,ready=false,onDone}){
 const [tips,setTips]=useState(readTips);
 const [{deck,facts,words,fact:f0,word:w0,first},setDeck]=useState(()=>deckNow(days,tips));
 const [at,setAt]=useState(0);
 // The card's time running out while the trip is still loading moves on to the next card; once
 // it is ready, it opens the trip instead. A lone card that ran out early opens it on arrival.
 const readyRef=useRef(ready),ended=useRef(false),done=useRef(false);
 const finish=()=>{if(done.current)return;done.current=true;onDone?.();};
 useEffect(()=>{readyRef.current=ready;if(ready&&(!deck.length||ended.current))finish();},[ready,deck.length]);
 const [count,setCount]=useState(0),[total,setTotal]=useState(()=>read('japan.petals',0));
 const [still]=useState(calm);
 // A card stays up long enough to read aloud to a six-year-old, and a tap moves on sooner.
 useEffect(()=>{ended.current=false;if(!deck.length)return;
  const t=setTimeout(()=>{if(readyRef.current)finish();else if(deck.length>1)setAt(i=>(i+1)%deck.length);else ended.current=true;},8000);
  return()=>clearTimeout(t);},[at,deck]);
 // Every card put on screen counts as seen, so the next open starts on the one after the last
 // fact and the last word shown here, and leads with the other kind.
 useEffect(()=>{
  const shown=deck.slice(0,at+1),f=shown.filter(c=>c.kind==='fact').length,w=shown.filter(c=>c.kind==='word').length;
  if(!deck.length)return;
  write(PLACE,{date:japanDate(),fact:facts?(f0+f)%facts:0,word:words?(w0+w)%words:0,first:first==='word'?'fact':'word'});
 },[at,deck]);
 const next=()=>ready?finish():setAt(i=>(i+1)%deck.length);
 const choose=v=>{const t=writeTips(v);setTips(t);setDeck(deckNow(days,t));setAt(0);};
 const onCatch=()=>{setCount(n=>n+1);setTotal(n=>{write('japan.petals',n+1);return n+1;});};
 const card=deck[at];
 return <main className={`opening${still?' still':''}`}>
  <div className="opening-backdrop" aria-hidden="true"/>
  <div className="opening-stage">
   <img className="opening-cover" src="/cover.jpg" alt="The Pasfield family Japan Travel Guide 2026 cover: the family walking towards a pagoda and Mount Fuji under cherry blossom"/>
   {!still&&<Petals onCatch={onCatch}/>}
   <div className="opening-panel">
    <Countdown days={days}/>
    {!still&&<p className="opening-catch" aria-live="polite">{count?<><b>🌸 {count}</b> caught{total>count?<span> · {total} all trip</span>:null}</>:'Tap a falling petal to catch it'}</p>}
    {card?.kind==='fact'&&<button className="opening-fact" onClick={next} aria-label={`Fun fact: ${card.title}. ${card.text} ${ready?'Tap to go in.':'Tap for another.'}`}>
     <span className="opening-fact-top"><span>{card.icon}</span><small>FROM THE GUIDE · PAGE {card.page}</small></span>
     <strong key={`t${card.id}`}>{card.title}</strong>
     <span key={`x${card.id}`} className="opening-fact-text">{card.text}</span>
     <i key={`b${at}${tips}`} className="opening-fact-timer" aria-hidden="true"/>
    </button>}
    {card?.kind==='word'&&<button className="opening-fact opening-word" onClick={next} aria-label={`Japanese word: ${card.en}. ${card.ja}, said ${card.say}. ${ready?'Tap to go in.':'Tap for another.'}`}>
     <span className="opening-fact-top"><span>{card.icon||'🗣️'}</span><small>SAY IT IN JAPANESE</small></span>
     <strong key={`t${card.id}`}>{card.en}</strong>
     <span key={`j${card.id}`} className="opening-word-ja" lang="ja">{card.ja}</span>
     <span key={`x${card.id}`} className="opening-fact-text">“{card.say}”{card.note?<> · {card.note}</>:null}</span>
     <i key={`b${at}${tips}`} className="opening-fact-timer" aria-hidden="true"/>
    </button>}
    <div className={`opening-track${ready?' ready':''}`} role="status"><span className="opening-rail" aria-hidden="true"><span className="opening-train">🚅</span></span>
     {ready?<span>Your trip is ready · <button type="button" className="opening-go" onClick={finish}>Go in now</button></span>:<span>Opening your family trip…</span>}</div>
    <label className="opening-tips">Tips while it opens
     <select value={tips} onChange={e=>choose(e.target.value)}>{TIP_OPTIONS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
   </div>
  </div>
 </main>;
}
