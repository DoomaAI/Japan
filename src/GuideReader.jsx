import React,{useEffect,useRef,useState} from 'react';
import {X,ArrowLeft,ArrowRight,BookOpen,RectangleVertical} from 'lucide-react';
import GuideBook from './GuideBook.jsx';
import {LAST_PAGE,spreadOf,stepPage} from './guide-lens.js';
// One page or two is decided by the shape of the screen, not the make of the device: upright,
// one page fills it best — an iPhone held normally stays exactly as it was — and turned on its
// side, whether an iPad, a laptop or a phone, two pages side by side use the room one would
// waste. Either can be swapped with the button, and the swap is remembered for that way up only,
// on this device only: an iPad reader who likes a spread upright still gets one page on a phone.
const SPREAD_KEY='japan.guideSpread';
const landscapeNow=()=>typeof matchMedia==='function'&&matchMedia('(orientation: landscape)').matches;
function readChoices(){try{return JSON.parse(localStorage.getItem(SPREAD_KEY))||{};}catch{return {};}}
export const spreadFor=(landscape,choices)=>{
 const mine=choices?.[landscape?'landscape':'portrait'];
 return typeof mine==='boolean'?mine:landscape;
};
function useSpread(){
 const [landscape,setLandscape]=useState(landscapeNow),[choices,setChoices]=useState(readChoices);
 useEffect(()=>{
  if(typeof matchMedia!=='function')return;
  const q=matchMedia('(orientation: landscape)'),on=()=>setLandscape(q.matches);
  q.addEventListener?.('change',on);return()=>q.removeEventListener?.('change',on);
 },[]);
 const spread=spreadFor(landscape,choices);
 const swap=()=>{
  const next={...choices,[landscape?'landscape':'portrait']:!spread};
  setChoices(next);
  try{localStorage.setItem(SPREAD_KEY,JSON.stringify(next));}catch{}
 };
 return [spread,swap];
}
// The guide read the way a magazine is read on a screen: the page alone on a dark ground, as big
// as the screen allows (the pages are portrait, 1247 by 1800, so the height usually decides), turned by a swipe, the arrows or the keys, with a slider along the foot
// to leaf through the whole issue. A tap hides the bars so nothing but the page is left; a double
// tap zooms in to read the small print. Where the browser can go truly full screen it does —
// an iPhone cannot for a page like this, so there the reader simply covers the app.
const pagesLabel=n=>spreadOf(n).filter(Boolean).join('–').replace(/^(\d+)$/,'Page $1').replace(/^(\d+–\d+)$/,'Pages $1');
export default function GuideReader({page,label,turn,jump,flipRef,close,onMissing}){
 const [spread,swapSpread]=useSpread();
 const [bare,setBare]=useState(false),[slide,setSlide]=useState(page),entered=useRef(false),settle=useRef(null);
 useEffect(()=>{setSlide(page);},[page]);
 useEffect(()=>{
  const root=document.documentElement;
  if(root.requestFullscreen&&!document.fullscreenElement)
   root.requestFullscreen().then(()=>{entered.current=true;}).catch(()=>{});
  // Leaving full screen the browser's own way — Escape, the system gesture — closes the reader
  // too, rather than leaving it stranded over the app.
  const left=()=>{if(entered.current&&!document.fullscreenElement)close();};
  const key=e=>{if(e.key==='Escape')close();};
  const was=document.body.style.overflow;document.body.style.overflow='hidden';
  document.addEventListener('fullscreenchange',left);window.addEventListener('keydown',key);
  return()=>{
   document.removeEventListener('fullscreenchange',left);window.removeEventListener('keydown',key);
   document.body.style.overflow=was;
   clearTimeout(settle.current);
   if(entered.current&&document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
  };
 },[]);
 const flip=d=>flipRef.current?flipRef.current(d):turn(d);
 return <div className={`guide-reader${bare?' bare':''}`} role="dialog" aria-modal="true" aria-label="Travel guide, full screen">
  <header className="reader-bar">
   <span><strong>{spread?pagesLabel(page):`Page ${page}`}</strong> of {LAST_PAGE}{label&&<small>{label}</small>}</span>
   <span className="reader-tools">
    <button type="button" className="icon" aria-label={spread?'Show one page at a time':'Show two pages side by side'} aria-pressed={spread}
     title={spread?'One page':'Two pages'} onClick={swapSpread}>{spread?<RectangleVertical size={20}/>:<BookOpen size={20}/>}</button>
    <button type="button" className="icon" aria-label="Close full screen" onClick={close}><X size={22}/></button>
   </span>
  </header>
  <div className="reader-stage">
   <button type="button" className="reader-arrow back" aria-label="Previous page" disabled={stepPage(page,-1,spread)===null} onClick={()=>flip(-1)}><ArrowLeft size={22}/></button>
   <GuideBook page={page} turn={turn} flipRef={flipRef} onMissing={onMissing} zoomable spread={spread} onTap={()=>setBare(b=>!b)}/>
   <button type="button" className="reader-arrow on" aria-label="Next page" disabled={stepPage(page,1,spread)===null} onClick={()=>flip(1)}><ArrowRight size={22}/></button>
  </div>
  <footer className="reader-bar">
   <input type="range" min="1" max={LAST_PAGE} value={slide} aria-label="Leaf through the guide"
    onChange={e=>{const n=+e.target.value;setSlide(n);clearTimeout(settle.current);settle.current=setTimeout(()=>jump(n),250);}}/>
   <small>{slide!==page?`Page ${slide}…`:'Swipe to turn · double-tap to zoom · tap to hide this'}</small>
  </footer>
 </div>;
}
