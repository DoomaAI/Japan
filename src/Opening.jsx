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
// nobody loses a fact halfway through reading it; a tap on the card, or Skip in the corner, skips
// the rest. Which cards come round — facts and words, one or the other, or none — is chosen at the
// foot of the screen and under Customise. With none, the trip opens the moment it is ready.
import React,{useEffect,useRef,useState} from 'react';
import {TIP_OPTIONS,readTips,writeTips,showsFacts,showsWords} from './opening-tips.js';
import {tripCountdown,japanDate} from './timing.js';
import {factsForDay,ANYTIME_FACTS} from './fact-data.js';
import {phraseForDay,ORDERED_PHRASES} from './phrasebook-data.js';
import {reducedMotion as calm} from './browser.js';

const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};

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
// Whether this phone has ever swiped a card; until it has, the card nudges aside once to show it can.
const SWIPED='japan.opening.swiped';
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

// Where the card sits in the deck, as dots under it: five at most, the current one long, and the
// dots at either end smaller when there are more cards past them, so a deck of forty still reads
// as somewhere to swipe to rather than a count to get through.
function Dots({at,of}){
 const n=Math.min(5,of),start=Math.max(0,Math.min(at-2,of-n));
 return <span className="opening-dots" aria-hidden="true"><span>‹</span>{Array.from({length:n},(_,k)=>{const i=start+k,edge=(k===0&&start>0)||(k===n-1&&start+n<of);
  return <i key={i} className={i===at?'on':edge?'edge':undefined}/>;})}<span>›</span></span>;
}

function Countdown({days}){const c=tripCountdown(days);if(!c)return null;
 return <p className={`opening-countdown ${c.phase}`} aria-label="Trip countdown">{c.phase==='before'?<><strong>{c.days}</strong><span>{c.days===1?'day to go':'days to go'}</span></>:c.phase==='during'?<><strong>{`Day ${c.day}`}</strong><span>{`of ${c.total} days in Japan`}</span></>:<span>{c.text}</span>}</p>;}

// A whole bullet train, nose first, that runs in from one side along the rail and out the other
// while the trip comes in: a white body with the blue stripe, a window row and a cab on the nose.
// Its paint is part of the drawing, so it stays the same train in every look.
const CARS=[[4,60],[63,119],[122,178]];
function Train(){
 return <svg className="opening-train" viewBox="0 0 182 22" fill="#f6f5ef" style={{filter:'drop-shadow(0 1px 2px rgb(0 0 0 / .5))'}} aria-hidden="true">
  <path d="M60 4H26Q13 4 7 11Q1 16 5 18H60Z"/><rect x="63" y="4" width="56" height="14" rx="1.5"/><path d="M122 4H156Q169 4 175 11Q181 16 177 18H122Z"/>
  <g fill="#2457a8">{CARS.map(([a,b],i)=><rect key={i} x={i===0?8:a} y="13" width={(i===2?174:b)-(i===0?8:a)} height="2"/>)}</g>
  <g fill="#24323d">{CARS.map(([a,b],i)=>Array.from({length:7},(_,k)=><rect key={`${i}${k}`} x={(i===0?28:a+4)+k*((i===1?48:28)/6)} y="7.5" width="3" height="3" rx=".6"/>))}
   <path d="M160 6.5Q168 7 172 11H160Z"/></g>
  <g fill="#0b1410"><rect x="60" y="6" width="3" height="11"/><rect x="119" y="6" width="3" height="11"/></g>
 </svg>;
}

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
 // The card is also a deck to thumb through: a swipe left brings the next card and a swipe right
 // the one before, without opening the trip, and each swipe starts the card's time again. The
 // first card back can only bounce, so going back never reaches round to cards not yet seen.
 const cardRef=useRef(null),drag=useRef(null),dragged=useRef(false);
 const [swiped,setSwiped]=useState(()=>read(SWIPED,false));
 const slide=(from,bounce=false)=>{if(still||!cardRef.current?.animate)return;
  cardRef.current.animate(bounce?[{transform:`translateX(${from}px)`},{transform:`translateX(${-from/4}px)`},{transform:'none'}]
   :[{transform:`translateX(${from}px)`,opacity:.2},{transform:'none',opacity:1}],{duration:bounce?320:260,easing:'cubic-bezier(.2,.8,.3,1)'});};
 const go=(step,from=0)=>{if(!swiped){setSwiped(true);write(SWIPED,true);}
  if(step<0&&at===0){slide(from||-24,true);return;}
  setAt(i=>(i+step+deck.length)%deck.length);slide(step>0?120:-120);};
 const down=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,dx:0,id:e.pointerId,on:false};dragged.current=false;};
 const move=e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;d.dx=e.clientX-d.x;
  if(!d.on){if(Math.abs(d.dx)<8)return;if(Math.abs(e.clientY-d.y)>Math.abs(d.dx)){drag.current=null;return;}d.on=true;e.currentTarget.setPointerCapture?.(e.pointerId);}
  e.currentTarget.style.transform=`translateX(${d.dx}px) rotate(${d.dx/40}deg)`;};
 const up=e=>{const d=drag.current;drag.current=null;if(!d?.on)return;dragged.current=true;e.currentTarget.style.transform='';
  if(e.type==='pointercancel')return;
  if(d.dx<-60)go(1);else if(d.dx>60)go(-1,d.dx);else slide(d.dx,true);};
 const tap=()=>{if(dragged.current){dragged.current=false;return;}next();};
 const keys=e=>{if(e.key==='ArrowRight'){e.preventDefault();go(1);}else if(e.key==='ArrowLeft'){e.preventDefault();go(-1);}};
 const swipe={ref:cardRef,onClick:tap,onKeyDown:keys,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up};
 const choose=v=>{const t=writeTips(v);setTips(t);setDeck(deckNow(days,t));setAt(0);};
 const onCatch=()=>{setCount(n=>n+1);setTotal(n=>{write('japan.petals',n+1);return n+1;});};
 const card=deck[at];
 return <main className={`opening${still?' still':''}`}>
  <div className="opening-backdrop" aria-hidden="true"/>
  <div className="opening-stage">
   {ready&&<button type="button" className="opening-skip" onClick={finish}>Skip<span aria-hidden="true"> ›</span></button>}
   <img className="opening-cover" src="/cover.jpg" alt="The Pasfield family Japan Travel Guide 2026 cover: the family walking towards a pagoda and Mount Fuji under cherry blossom"/>
   {!still&&<Petals onCatch={onCatch}/>}
   <div className="opening-panel">
    <Countdown days={days}/>
    {!still&&<p className="opening-catch" aria-live="polite">{count?<><b>🌸 {count}</b> caught{total>count?<span> · {total} all trip</span>:null}</>:'Tap a falling petal to catch it'}</p>}
    {card&&<div className={`opening-deck${deck.length>1?' more':''}${!swiped&&deck.length>1?' hint':''}`}>
    {card.kind==='fact'&&<button className="opening-fact" {...swipe} aria-roledescription="card" aria-label={`Fun fact: ${card.title}. ${card.text} ${ready?'Tap to go in.':'Tap for another.'} Swipe or use the arrow keys for more.`}>
     <span className="opening-fact-top"><span>{card.icon}</span><small>FROM THE GUIDE · PAGE {card.page}</small></span>
     <strong key={`t${card.id}`}>{card.title}</strong>
     <span key={`x${card.id}`} className="opening-fact-text">{card.text}</span>
     <i key={`b${at}${tips}`} className="opening-fact-timer" aria-hidden="true"/>
    </button>}
    {card.kind==='word'&&<button className="opening-fact opening-word" {...swipe} aria-roledescription="card" aria-label={`Japanese word: ${card.en}. ${card.ja}, said ${card.say}. ${ready?'Tap to go in.':'Tap for another.'} Swipe or use the arrow keys for more.`}>
     <span className="opening-fact-top"><span>{card.icon||'🗣️'}</span><small>SAY IT IN JAPANESE</small></span>
     <strong key={`t${card.id}`}>{card.en}</strong>
     <span key={`j${card.id}`} className="opening-word-ja" lang="ja">{card.ja}</span>
     <span key={`x${card.id}`} className="opening-fact-text">“{card.say}”{card.note?<> · {card.note}</>:null}</span>
     <i key={`b${at}${tips}`} className="opening-fact-timer" aria-hidden="true"/>
    </button>}
    {deck.length>1&&<Dots at={at} of={deck.length}/>}
   </div>}
    <div className={`opening-track${ready?' ready':''}`} role="status"><span className="opening-rail" aria-hidden="true"><Train/></span>
     <span>{ready?'Your trip is ready':'Opening your family trip…'}</span></div>
    <label className="opening-tips">
     <select aria-label="Tips while it opens" value={tips} onChange={e=>choose(e.target.value)}>{TIP_OPTIONS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
   </div>
  </div>
 </main>;
}
