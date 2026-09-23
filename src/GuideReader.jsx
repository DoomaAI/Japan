import React,{useEffect,useRef,useState} from 'react';
import {X,ArrowLeft,ArrowRight} from 'lucide-react';
import GuideBook,{LAST_PAGE} from './GuideBook.jsx';
// The guide read the way a magazine is read on a screen: the page alone on a dark ground, as big
// as the screen allows (the pages are portrait, 1247 by 1800, so the height usually decides), turned by a swipe, the arrows or the keys, with a slider along the foot
// to leaf through the whole issue. A tap hides the bars so nothing but the page is left; a double
// tap zooms in to read the small print. Where the browser can go truly full screen it does —
// an iPhone cannot for a page like this, so there the reader simply covers the app.
export default function GuideReader({page,label,turn,jump,flipRef,close,onMissing}){
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
   <span><strong>Page {page}</strong> of {LAST_PAGE}{label&&<small>{label}</small>}</span>
   <button type="button" className="icon" aria-label="Close full screen" onClick={close}><X size={22}/></button>
  </header>
  <div className="reader-stage">
   <button type="button" className="reader-arrow back" aria-label="Previous page" disabled={page<=1} onClick={()=>flip(-1)}><ArrowLeft size={22}/></button>
   <GuideBook page={page} turn={turn} flipRef={flipRef} onMissing={onMissing} zoomable onTap={()=>setBare(b=>!b)}/>
   <button type="button" className="reader-arrow on" aria-label="Next page" disabled={page>=LAST_PAGE} onClick={()=>flip(1)}><ArrowRight size={22}/></button>
  </div>
  <footer className="reader-bar">
   <input type="range" min="1" max={LAST_PAGE} value={slide} aria-label="Leaf through the guide"
    onChange={e=>{const n=+e.target.value;setSlide(n);clearTimeout(settle.current);settle.current=setTimeout(()=>jump(n),250);}}/>
   <small>{slide!==page?`Page ${slide}…`:'Swipe to turn · double-tap to zoom · tap to hide this'}</small>
  </footer>
 </div>;
}
