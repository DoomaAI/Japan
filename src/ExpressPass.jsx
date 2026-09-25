import React,{useState} from 'react';
import {Check,Zap,Plus,Trash2,CalendarPlus} from 'lucide-react';
import {findRide,expressSlotsFor,slotChoice,slotName,slotStep} from './park-data.js';
import {heightCheck} from './trip-features.js';
// Our Express Pass for a park day: each slot with its window, whether the plan already covers it,
// who has used it and, for a ☆ choice, which ride each of us is taking it on.
export default function ExpressPass({state,user,park,mutate,busy}){
 const slots=expressSlotsFor(state,park),parent=user.role==='parent';
 const [adding,setAdding]=useState(false);
 if(!slots.length&&!parent)return null;
 const mine=n=>parent||n===user.name;
 async function add(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const ok=await mutate({type:'expressSlotAdd',park:park.id,label:String(f.get('label')||'').trim(),start:f.get('start')||null,end:f.get('end')||null,rides:f.getAll('ride'),addToPlan:f.get('plan')==='on'});
  if(ok)setAdding(false);
 }
 return <section className="express-pass">
  <div className="section-heading"><h3><Zap size={16}/> Our Express Pass</h3>{parent&&<button onClick={()=>setAdding(v=>!v)}>{adding?'Cancel':<><Plus size={15}/>Add slot</>}</button>}</div>
  <p>One pass each. Show the QR code and the printed time at the ride entrance. Tick a slot once you have used it; for a ☆ choice, pick your ride first.</p>
  {adding&&<form className="express-add" onSubmit={add}>
   <div className="form-row">
    <label>From<input name="start" type="time"/></label>
    <label>To<input name="end" type="time"/></label>
   </div>
   <label>Name <small>(only needed for an area entry or a ☆ choice)</small><input name="label" maxLength={120} placeholder="e.g. Choice C"/></label>
   <fieldset><legend>Ride — tick more than one for a ☆ choice</legend>
    <div className="express-ride-options">{park.rides.map(r=><label key={r.id} className="checkline"><input type="checkbox" name="ride" value={r.id}/>{r.name}</label>)}</div>
   </fieldset>
   <label className="checkline"><input type="checkbox" name="plan" defaultChecked/>Add it to the day’s plan</label>
   <button className="primary" disabled={busy}>Save slot</button>
  </form>}
  <div className="express-slots">{slots.map(slot=>{
   const choice=slotChoice(slot),keys=slot.rides.length?slot.rides:[slot.id];
   return <article key={slot.id} className={`express-slot${state.members.every(n=>slot.used?.[n])?' used':''}`}>
    <div className="ride-top">
     <div><span className="express-time">{slot.start?`${slot.start}${slot.end?`–${slot.end}`:''}`:'Any time'}</span><strong>{choice?`☆ ${slotName(slot)} — choose one each`:slotName(slot)}</strong></div>
     {parent&&<button className="icon" aria-label={`Remove ${slotName(slot)}`} disabled={busy} onClick={()=>confirm(`Remove ${slotName(slot)} from the Express Pass? The plan is left as it is.`)&&mutate({type:'expressSlotRemove',id:slot.id})}><Trash2 size={16}/></button>}
    </div>
    <ul className="express-plan">{keys.map(key=>{
     const step=slotStep(state,park,slot,key),ride=findRide(key),who=choice?state.members.filter(n=>slot.picks?.[n]===key):[];
     return <li key={key}>
      <span>{choice?ride?.name:null}{step
       ?<small className="express-in"><Check size={13}/>In our plan{step.time?` at ${step.time}`:''} — {step.title}</small>
       :<small className="express-out">Not in the plan yet</small>}
       {who.length>0&&<small>Picked by {who.join(', ')}</small>}</span>
      {!step&&parent&&<button disabled={busy} onClick={()=>mutate({type:'expressPlan',id:slot.id,rideId:ride?key:null})}><CalendarPlus size={15}/>Add to plan</button>}
     </li>;})}</ul>
    <div className="express-people">{state.members.map(n=>{
     const pick=slot.picks?.[n],used=!!slot.used?.[n],ride=pick&&findRide(pick),check=ride?heightCheck(ride,n,state.heights):null;
     return <div key={n} className="express-person">
      {choice&&<label><span>{n}</span><select value={pick||''} disabled={busy||!mine(n)||used} onChange={e=>mutate({type:'expressPick',id:slot.id,person:n,rideId:e.target.value||null})}>
       <option value="">Not decided</option>{slot.rides.map(id=><option key={id} value={id}>{findRide(id)?.name}</option>)}
      </select>{check?.ok===false&&<small className="express-out">{check.label}</small>}</label>}
      <button className={`rider${used?' on':''}`} aria-pressed={used} disabled={busy||!mine(n)||(choice&&!pick&&!used)}
       onClick={()=>mutate({type:'expressUsed',id:slot.id,person:n,done:!used})}>{used&&<Check size={14}/>}{choice?'Used':n}</button>
     </div>;})}</div>
   </article>;})}</div>
  {!slots.length&&<p className="empty">No Express Pass slots for {park.short} yet.</p>}
 </section>;
}
