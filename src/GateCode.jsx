import React,{useEffect,useRef,useState} from 'react';
import {X,ArrowLeft,ArrowRight,SunMedium,ScanLine,Image as ImageIcon,ExternalLink,Wallet} from 'lucide-react';
import {codesFor,toRead,readable,pendingCodes,isLink,preview} from './wallet-codes.js';
import {readCodes,drawCode} from './qr-reader.js';
// A ticket's codes at the gate: each one drawn fresh, as large as the screen allows, black on
// white whatever the theme, with the screen kept awake while it is up. Four park tickets swipe
// through as four people. The photo it was read from is one tap away for anyone who asks to see it.
export default function GateCode({state,doc,onClose,onPhoto}){
 const codes=codesFor(state,doc);
 const [at,setAt]=useState(0),[src,setSrc]=useState(''),touch=useRef(null);
 const here=codes[Math.min(at,codes.length-1)];
 useEffect(()=>{let on=true;if(here)drawCode(here.text).then(u=>{if(on)setSrc(u);}).catch(()=>setSrc(''));return()=>{on=false;};},[here?.text]);
 // The screen stays on while a code is up; a phone that refuses simply dims as it would.
 useEffect(()=>{let lock=null;navigator.wakeLock?.request('screen').then(l=>{lock=l;}).catch(()=>{});return()=>{lock?.release().catch(()=>{});};},[]);
 useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();else if(e.key==='ArrowRight')setAt(i=>Math.min(i+1,codes.length-1));else if(e.key==='ArrowLeft')setAt(i=>Math.max(i-1,0));};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);});
 if(!here)return null;
 return <div className="gate-code" role="dialog" aria-modal="true" aria-label={`${doc.title}: code to scan`}
  onTouchStart={e=>{touch.current=e.touches[0]?.clientX??null;}}
  onTouchEnd={e=>{if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current;if(Math.abs(dx)>60)setAt(i=>Math.max(0,Math.min(codes.length-1,i+(dx<0?1:-1))));touch.current=null;}}>
  <header><div><strong>{doc.title}</strong><small>{here.person}{codes.length>1?` · ${at+1} of ${codes.length}`:''}</small></div><button type="button" aria-label="Close" onClick={onClose}><X/></button></header>
  <div className="gate-code-card">{src?<img src={src} alt={`QR code for ${here.person}`}/>:<ScanLine size={48}/>}</div>
  {doc.reference&&<p className="gate-code-ref">Ref <b>{doc.reference}</b></p>}
  <p className="gate-code-hint"><SunMedium size={16}/>Turn the brightness right up and hold the phone flat to the scanner.</p>
  <div className="gate-code-nav">
   {codes.length>1&&<button type="button" disabled={at===0} onClick={()=>setAt(i=>i-1)}><ArrowLeft size={18}/>Previous</button>}
   {onPhoto&&readable(state.documents.find(d=>d.id===here.id))&&<button type="button" onClick={()=>onPhoto(state.documents.find(d=>d.id===here.id))}><ImageIcon size={17}/>The original</button>}
   {codes.length>1&&<button type="button" disabled={at===codes.length-1} onClick={()=>setAt(i=>i+1)}>Next<ArrowRight size={18}/></button>}
  </div>
 </div>;
}
// Reads the codes on tickets that have not been looked at yet, one file at a time, on a parent's
// phone with signal, whichever screen is open. What it finds waits to be asked about rather than
// going straight into the Wallet; a file with no code is saved as none, so it is never read twice,
// and one that could not be fetched is simply tried again next time. The line saying it is busy
// shows on the Wallet only.
export function CodeReader({state,parent,online,mutate,quiet=false}){
 const [left,setLeft]=useState(0),running=useRef(false),tried=useRef(new Set());
 const waiting=parent&&online?toRead(state).filter(d=>!tried.current.has(d.id)):[];
 useEffect(()=>{
  if(!waiting.length||running.current)return;
  running.current=true;
  (async()=>{
   for(const doc of waiting){
    tried.current.add(doc.id);setLeft(waiting.length-[...waiting].indexOf(doc));
    let code;try{code=await readCodes(doc.id,doc.type);}catch{continue;}
    if(!await mutate({type:'documentCode',id:doc.id,found:code}))break;
   }
   setLeft(0);running.current=false;
  })();
 },[waiting.map(d=>d.id).join()]);
 return left&&!quiet?<p className="code-reading"><ScanLine size={15}/>Reading the codes on {left} ticket file{left===1?'':'s'}…</p>:null;
}
// A parent's mark for a ticket whose code cannot be copied: it changes every few seconds, or only
// shows once signed in. The ticket then says which app to open instead of drawing a copy.
export function LiveCodeToggle({doc,busy,mutate}){
 const [asking,setAsking]=useState(false),[app,setApp]=useState(doc.codeApp||'');
 if(doc.codeLive)return <button type="button" disabled={busy} onClick={()=>mutate({type:'documentCode',id:doc.id,live:false})}>Its code can be copied after all</button>;
 if(!asking)return <button type="button" onClick={()=>setAsking(true)}>Code changes each time</button>;
 return <form className="live-code" onSubmit={async e=>{e.preventDefault();if(await mutate({type:'documentCode',id:doc.id,live:true,app}))setAsking(false);}}>
  <label>Which app shows it?<input id={`live-app-${doc.id}`} value={app} maxLength={60} placeholder="Tokyo Disney Resort" onChange={e=>setApp(e.target.value)}/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>Show it there</button><button type="button" onClick={()=>setAsking(false)}>Cancel</button></div>
 </form>;
}
// The question, once a code is found: into the Wallet, or not a ticket. One card per booking,
// however many pages and codes it has. A code that is only a web address says so and offers to
// open it, since that is usually a link printed on a letter rather than what a gate scans.
export function CodePrompt({state,parent,busy,mutate,notice,onShow}){
 if(!parent)return null;
 const pending=pendingCodes(state);
 if(!pending.length)return null;
 const answer=async(doc,add,n)=>{if(await mutate({type:'codesAnswer',id:doc.id,add}))notice(add?`Added to the Wallet: ${n} code${n===1?'':'s'} ready to show at the gate.`:'Left out. That file will not be asked about again.');};
 return <section className="code-prompt" aria-label="Codes found">
  {pending.map(({doc,codes})=>{
   const links=codes.every(isLink),n=codes.length;
   return <article key={doc.id}>
    <p className="eyebrow"><ScanLine size={14}/>{n===1?'A CODE FOUND':`${n} CODES FOUND`}</p>
    <strong>{doc.title}</strong>
    <small className="code-prompt-text">{preview(codes[0])}{n>1?` and ${n-1} more`:''}</small>
    {links&&<small className="code-prompt-note">This looks like a web link, not a code for a gate.</small>}
    <p>Add {n===1?'it':'them'} to the Wallet, to show at the gate?</p>
    <div className="row wrap">
     <button type="button" className={links?'':'primary'} disabled={busy} onClick={()=>answer(doc,true,n)}><Wallet size={16}/>Add to Wallet</button>
     <button type="button" className={links?'primary':''} disabled={busy} onClick={()=>answer(doc,false,n)}>Not a ticket</button>
     {links&&<a className="button" href={codes[0]} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Open the link</a>}
     {onShow&&<button type="button" className="link-button" onClick={()=>onShow(doc)}>See the ticket</button>}
    </div>
   </article>;})}
 </section>;
}
