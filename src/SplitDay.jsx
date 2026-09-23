import React from 'react';
import {Split,Merge,MapPin,Users,ChevronRight,AlertCircle} from 'lucide-react';
import {laneOf,whereIs,splitWarnings} from './split.js';
import {BOYS} from './trip-features.js';
// Whose day the screen is following. Everyone opens on their own, because on a split the stop
// that matters is the one you are walking to; the others are one tap away, which is the whole of
// "what is Nate doing?" — and "everyone" puts every lane back in the one list.
export function WhoseDay({state,user,lens,setLens}){
 const people=[user.name,...state.members.filter(m=>m!==user.name)];
 return <div className="whose-day" role="group" aria-label="Whose day to follow">{people.map(p=><button key={p} type="button" aria-pressed={lens===p} className={lens===p?'selected':''} onClick={()=>setLens(p)}>{p===user.name?'My day':p}</button>)}<button type="button" aria-pressed={!lens} className={!lens?'selected':''} onClick={()=>setLens('')}>Everyone</button></div>;
}
const said=w=>w.how==='at'?`At ${w.step.title}${w.since?` since ${w.since}`:''}`:w.how==='planned'?`Should be at ${w.step.title}`:w.how==='next'?`Next: ${w.step.time?`${w.step.time} · `:''}${w.step.title}`:w.last?`Finished for the day · last ${w.last.title}`:'Nothing planned';
// The split itself: who went where, where we meet back up, and — the question a split day is
// full of — what each of the others is doing right now. It reads what the family ticked off
// before it reads the plan, and says which it is.
export default function SplitDay({state,splits,day,now,user,parent,busy,lens,setLens,selectStep,mutate}){
 if(!splits.length)return null;
 const others=state.members.filter(m=>m!==user.name&&splits.some(s=>s.members.includes(m)));
 const look=(person,step)=>{setLens(person);if(step)selectStep(step);};
 return <section className="split-day" aria-label="We split up today">
  {splits.map(split=><div key={split.group} className="split-card">
   <div className="split-head"><Split size={18}/><div><p className="eyebrow">We split up{split.start?` · from ${split.start}`:''}</p><h2>{split.group}</h2></div>{parent&&<button type="button" className="split-undo" disabled={busy} onClick={()=>mutate({type:'groupMode',group:split.group,mode:'choose'})}>Make these alternatives</button>}</div>
   <ul className="split-lanes">{split.lanes.map((lane,i)=><li key={lane.option} className={`lane-${i%4}${lane===laneOf(split,lens)?' followed':''}`}><button type="button" onClick={()=>look(lane.members[0])}><strong>{lane.option}</strong><span>{lane.members.join(' + ')}</span><small>{lane.steps.map(s=>s.title).join(' → ')}</small></button></li>)}</ul>
   {split.meet?<button type="button" className="split-meet" onClick={()=>selectStep(split.meet)}><Merge size={17}/><span>Meet back up{split.meet.time?` · ${split.meet.time}`:''}<strong>{split.meet.place||split.meet.title}</strong></span><MapPin size={16}/></button>:null}
   {parent&&splitWarnings(split,BOYS).map(w=><p key={w} className="callout"><AlertCircle size={16}/>{w}</p>)}
  </div>)}
  {others.length>0&&<div className="where-everyone"><h3><Users size={16}/> What is everyone doing?</h3><ul>{others.map(p=>{const w=whereIs(state,day,p,now);return <li key={p}><button type="button" onClick={()=>look(p,w.step)}><span className="who">{p}</span><span>{said(w)}{w.how==='planned'&&<small>From the plan — nobody has marked it arrived.</small>}{w.how==='at'&&w.next&&<small>Then {w.next.time?`${w.next.time} · `:''}{w.next.title}</small>}</span><ChevronRight size={16}/></button></li>;})}</ul></div>}
 </section>;
}
