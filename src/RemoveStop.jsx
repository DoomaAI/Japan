import React from 'react';
import {AlertCircle,Trash2,LockKeyholeOpen,CornerUpLeft,Inbox} from 'lucide-react';
import {removalEffects} from './trip-features.js';
// Every other change to the plan can be made again: a time moved back, a stop dragged up, a tick
// undone. Taking a stop off cannot — its notes, target and booking times, ratings, who was going
// and how far through it we were all go with it. So it is asked about first, and asked here in
// the app rather than in the browser's own grey box, which on a Home Screen phone arrives with
// the site's address in it and none of what is actually about to happen.
//
// The question names the stop and says what is attached to it, because "are you sure?" is not a
// question anybody can answer: three bookings and a boy's voice note hanging off a stop is the
// thing worth knowing before tapping, and each of them survives the removal.
//
// Most of the time the stop is not actually finished with — the morning ran out, the weather
// turned, it simply does not fit this day. So the reversible answer is offered beside the one
// that cannot be taken back: Options keeps the stop whole and off the calendar, and is one tap
// from a day again. Nobody should have to delete something to get it out of the way.
export default function RemoveStop({state,step,busy,mutate,notice,close,dayLabel}){
 const effects=removalEffects(state,step),plural=(n,one,many)=>n===1?one:many;
 const when=step.day?`${dayLabel(step.day)} · ${step.time||'no target time'}`:'Options — no date';
 const stays=[
  effects.tickets&&`${effects.tickets} ${plural(effects.tickets,'booking stays','bookings stay')} in Tickets${step.day?`, filed against ${dayLabel(step.day)}`:''}, no longer allocated to this stop`,
  effects.photos&&`${effects.photos} ${plural(effects.photos,'photo or video stays','photos and videos stay')} in the family gallery`,
  effects.voiceNotes&&`${effects.voiceNotes} voice ${plural(effects.voiceNotes,'note stays','notes stay')} with ${step.day?dayLabel(step.day):'the day'}`,
  effects.finds&&`${effects.finds} shortlist ${plural(effects.finds,'find goes','finds go')} back to the day we saw ${plural(effects.finds,'it','them')}`,
  effects.idea&&'the planning-board idea this came from goes back on the board to be decided again'
 ].filter(Boolean);
 async function remove(){
  if(await mutate({type:'remove',id:step.id})){notice(`${step.title} was taken off the plan.`);close(step);}
 }
 // The stop leaves the day either way, so both answers close the pop-up the same way and the
 // card behind it stops pointing at a stop that is no longer on this day.
 async function toOptions(){
  if(await mutate({type:'backlog',id:step.id})){notice(`${step.title} was saved to Options, with everything on it.`);close(step);}
 }
 return <div className="confirm-remove">
  <p className="eyebrow">TAKE THIS OFF THE PLAN?</p>
  <h3>{step.title}</h3>
  <small>{when}{step.place?` · ${step.place}`:''}</small>
  <p className="callout"><AlertCircle size={18}/>Its notes, times, ratings and progress go with it. Adding the stop again does not bring them back.</p>
  {stays.length>0&&<><p>Nothing else is deleted:</p><ul className="confirm-keeps">{stays.map(line=><li key={line}>{line}</li>)}</ul></>}
  {/* The reason comes before the buttons it greys out, so a locked stop never shows a dead
      button with its explanation underneath. */}
  {step.locked&&<><p className="callout"><LockKeyholeOpen size={18}/>This stop has a locked time, so it cannot be removed or moved by accident. Unlock it first if it really is going.</p>
   <button type="button" disabled={busy} onClick={()=>mutate({type:'lock',id:step.id,locked:false})}><LockKeyholeOpen size={18}/>Unlock this time</button></>}
  {step.day&&<div className="confirm-instead">
   <strong>Not gone, just not today?</strong>
   <p>Options keeps the stop whole — its notes, its bookings and its files come with it — with no day or time on it until it is put back on one. The day and time it came off are remembered on the card.</p>
   <button type="button" disabled={busy||step.locked} onClick={toOptions}><Inbox size={18}/>Save to Options instead</button>
  </div>}
  <div className="row wrap confirm-actions">
   <button type="button" className="primary" autoFocus onClick={()=>close(null)}><CornerUpLeft size={18}/>Keep this stop</button>
   <button type="button" className="danger" disabled={busy||step.locked} onClick={remove}><Trash2 size={18}/>Yes, remove it</button>
  </div>
 </div>;
}
