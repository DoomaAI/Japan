import React,{useEffect,useMemo,useRef,useState} from 'react';
import {X,ArrowLeft,ArrowRight,Volume2,Footprints,TrainFront,Check,Maximize2} from 'lucide-react';
import {LINES,legStops,legDone} from './route-data.js';
import {useReadAloud} from './AdventurePages.jsx';
// A route as a cook-mode recipe (Kitchen Stories, Paprika): one thing to do per screen, in type
// big enough to read with a case in one hand and a boy in the other, the station's Japanese large
// enough to show a guard. Tap the right half of the screen for the next thing, the left half to
// go back; the screen stays awake; Read aloud says the step while the phone is in a pocket. A
// walk is one screen. A ride is two — board here, get off there — because those are the two
// moments somebody looks at the phone.
export function bigSteps(legs){
 const out=[];
 legs.forEach((leg,k)=>{
  if(leg.mode==='walk'){out.push({leg:k,kind:'walk',title:'Walk',text:leg.text,minutes:leg.minutes,say:`Walk. ${leg.text}${leg.minutes?` About ${leg.minutes} minutes.`:''}`});return;}
  const line=LINES[leg.line],stops=legStops(leg),from=stops[0],to=stops[stops.length-1],n=stops.length-1;
  out.push({leg:k,kind:'board',title:`Board the ${line.name}`,station:from,text:`Towards ${leg.towards}`,detail:`${line.kind} · ${line.operator}${leg.minutes?` · about ${leg.minutes} min`:''}`,look:line.look,
   say:`Board the ${line.name} at ${from.name}, towards ${leg.towards}. ${n} stop${n===1?'':'s'}${leg.minutes?`, about ${leg.minutes} minutes`:''}.`});
  out.push({leg:k,kind:'off',title:'Get off at',station:to,text:`${n} stop${n===1?'':'s'} from ${from.name}`,detail:leg.exit||'',last:true,
   say:`Get off at ${to.name}, ${n} stop${n===1?'':'s'} from ${from.name}.${leg.exit?` ${leg.exit}`:''}`});
 });
 return out;
}
export default function BigSteps({legs,step,canTick,busy,onTick,onClose}){
 const steps=useMemo(()=>bigSteps(legs),[legs]);
 const first=Math.max(0,steps.findIndex(s=>!legDone(step,s.leg)));
 const [at,setAt]=useState(first<0?0:first),touch=useRef(null);
 const {supported,reading,read}=useReadAloud();
 const s=steps[at],n=steps.length;
 const move=d=>setAt(i=>Math.max(0,Math.min(n-1,i+d)));
 useEffect(()=>{let lock=null;navigator.wakeLock?.request('screen').then(l=>{lock=l;}).catch(()=>{});return()=>{lock?.release().catch(()=>{});};},[]);
 useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose();else if(e.key==='ArrowRight')move(1);else if(e.key==='ArrowLeft')move(-1);};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[n]);
 // One pointer path for a finger and a mouse alike: a short press is a tap on one half of the
 // screen, a long sideways drag is a swipe. A press on a button is the button's.
 const press=e=>{if(e.target.closest('button'))return;touch.current={x:e.clientX,y:e.clientY};};
 const lift=e=>{const t=touch.current;touch.current=null;if(!t||e.target.closest('button'))return;const dx=e.clientX-t.x,dy=e.clientY-t.y;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))move(dx<0?1:-1);else if(Math.abs(dx)<12&&Math.abs(dy)<12)move(e.clientX>window.innerWidth/2?1:-1);};
 const done=legDone(step,s.leg);
 return <div className="big-steps" role="dialog" aria-modal="true" aria-label={`${step.title}: step by step`} onPointerDown={press} onPointerUp={lift}>
  <header><div><small>{step.title}</small><strong>Step {at+1} of {n}{done?' · done':''}</strong></div><button type="button" aria-label="Close" onClick={onClose}><X/></button></header>
  <div className={`big-step is-${s.kind}`} key={at}>
   <p className="big-step-kind">{s.kind==='walk'?<Footprints size={28}/>:<TrainFront size={28}/>}{s.title}</p>
   {s.station&&<><p className="big-step-ja" lang="ja">{s.station.ja}</p><p className="big-step-station">{s.station.name}{s.station.code?<span> {s.station.code}</span>:''}</p></>}
   <p className="big-step-text">{s.text}{s.kind==='walk'&&s.minutes?<> About <b>{s.minutes} min</b>.</>:''}</p>
   {s.detail&&<p className="big-step-detail">{s.detail}</p>}
   {s.look&&<p className="big-step-look">Look for: {s.look}</p>}
  </div>
  <div className="big-step-nav">
   <button type="button" disabled={at===0} onClick={()=>move(-1)}><ArrowLeft size={20}/>Back</button>
   {supported&&<button type="button" aria-pressed={reading===`big-${at}`} onClick={()=>read(`big-${at}`,s.say,'en-AU')}><Volume2 size={20}/>{reading===`big-${at}`?'Stop':'Read aloud'}</button>}
   {at<n-1?<button type="button" className="primary" onClick={()=>move(1)}>Next<ArrowRight size={20}/></button>:<button type="button" className="primary" onClick={onClose}><Check size={20}/>Done</button>}
  </div>
  {canTick&&!done&&(s.last||s.kind==='walk')&&<button type="button" className="big-step-tick" disabled={busy} onClick={()=>{onTick(s.leg,true);if(at<n-1)move(1);}}><Check size={18}/>Tick this leg off</button>}
  <p className="big-step-hint">Tap the right of the screen for the next step, the left to go back.</p>
 </div>;
}
export function BigStepsButton({onClick}){return <button type="button" className="route-big-toggle" onClick={onClick}><Maximize2 size={14}/>Big steps</button>;}
