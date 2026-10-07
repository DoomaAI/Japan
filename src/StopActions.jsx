import React,{useState} from 'react';
import {CalendarDays,Inbox,Pencil,Trash2} from 'lucide-react';
import {withGroupMates,positionsOn} from './day-moves.js';
// What the "…" on a stop's card offers. Moving a stop to another day, or out to Options, is the
// commonest change on the road, and it should not mean opening the whole edit form to find it.
// The move is the same one Move or swap days makes: the time stays, the stop slots in by it on
// the new day, an option takes its alternatives with it, and Undo puts everything back in place.
export default function StopActions({state,step,busy,mutate,notice,dayLabel,edit,remove,toOptions,moved}){
 const others=state.days.map(d=>d.date).filter(d=>d!==step.day);
 const next=others.find(d=>d>step.day)||others[0];
 const [to,setTo]=useState(next);
 const [moveLocked,setMoveLocked]=useState(false);
 const going=withGroupMates(state,[step.id]);
 const begun=going.some(s=>s.status==='done'||s.status==='started');
 const locked=going.some(s=>s.locked);
 async function move(){
  const from=step.day,positions=positionsOn(state,[from,to]);
  if(!await mutate({type:'moveSteps',ids:[step.id],to,moveLocked}))return;
  const what=going.length===1?step.title:`${step.title} and its alternatives`;
  notice({text:`${what} moved to ${dayLabel(to)}.`,
   undo:async()=>{if(await mutate({type:'moveSteps',ids:going.map(s=>s.id),to:from,moveLocked,positions}))notice('Back where it was.');}});
  moved(step,to);
 }
 return <div className="stop-actions">
  <h3>{step.title}</h3>
  <small>{dayLabel(step.day)}{step.time?` · ${step.time}`:''}{step.place?` · ${step.place}`:''}</small>
  {begun?<p className="callout">This stop is done or under way, so it stays on its day.</p>:<>
   <label>Move to<select value={to} onChange={e=>setTo(e.target.value)}>{others.map(d=><option key={d} value={d}>{dayLabel(d)} · {state.days.find(x=>x.date===d).title}</option>)}</select></label>
   {locked&&<label className="checkline"><input type="checkbox" checked={moveLocked} onChange={e=>setMoveLocked(e.target.checked)}/>It has a booked time — move it anyway, I’ll change the booking</label>}
   <button type="button" className="primary" disabled={busy||!to||(locked&&!moveLocked)} onClick={move}><CalendarDays size={18}/>Move to {to?dayLabel(to):'another day'}</button>
  </>}
  <div className="row wrap">
   {!begun&&<button type="button" disabled={busy||step.locked} title={step.locked?'Unlock its fixed time first':undefined} onClick={()=>toOptions(step)}><Inbox size={18}/>Save to Options</button>}
   <button type="button" disabled={busy} onClick={()=>edit(step)}><Pencil size={18}/>Edit details</button>
   <button type="button" className="danger" disabled={busy} onClick={()=>remove(step)}><Trash2 size={18}/>Remove</button>
  </div>
 </div>;
}
