import React,{useState} from 'react';
import {Check,Eye} from 'lucide-react';
import {BOYS,EYE_SPY,eyeSpyKey,eyeSpyHint,fujiSide} from './trip-features.js';
export default function EyeSpy({state,user,step,mutate,busy}){
 const [boy,setBoy]=useState(BOYS.includes(user.name)?user.name:BOYS[0]);
 const parent=user.role==='parent',canTick=parent||user.name===boy;
 const found=id=>state.eyeSpy?.[eyeSpyKey(step.id,id)]?.[boy];
 const spotted=EYE_SPY.filter(item=>found(item.id)).length;
 return <>
  <p>Out of the window on the {step.title}. Tick each one you spot — it saves for the family, and works with no signal in the tunnels.</p>
  <div className="segmented">{BOYS.map(n=><button key={n} className={boy===n?'selected':''} onClick={()=>setBoy(n)}>{n} · {n==='Nate'?'5':'8'}</button>)}</div>
  <div className="quest-progress"><strong>{spotted} / {EYE_SPY.length} spotted</strong><progress max={EYE_SPY.length} value={spotted}/><span>{spotted===EYE_SPY.length?'Every single one. Extraordinary.':`Mount Fuji is on the ${fujiSide(step)} of the train today.`}</span></div>
  {!canTick&&<p className="callout"><Eye size={18}/>This is {boy}’s list. Switch back to your own name to tick things off.</p>}
  <div className="eyespy-grid">{EYE_SPY.map(item=>{
   const at=found(item.id),hint=eyeSpyHint(item,step);
   return <button key={item.id} type="button" disabled={busy||!canTick} className={`eyespy-item${at?' found':''}`} aria-pressed={!!at}
    onClick={()=>mutate({type:'eyeSpy',stepId:step.id,item:item.id,person:boy,done:!at})}>
    <span className="eyespy-icon" aria-hidden="true">{at?<Check size={26}/>:item.icon}</span>
    <span><strong>{item.title}</strong>{hint&&<small>{hint}</small>}</span>
   </button>;})}</div>
 </>;
}
