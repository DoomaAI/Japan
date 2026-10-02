import React,{useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {AlarmClock,Check,ExternalLink,Plus,Trash2,CalendarDays,ChevronRight} from 'lucide-react';
import {windows,suggestedWindows,windowState,upcomingWindows,inZone,untilWords,HOME_ZONE,HOME_LABEL} from './booking-window-data.js';
const JAPAN='Asia/Tokyo';
const when=iso=><>{inZone(iso,JAPAN)} Japan<small> · {inZone(iso,HOME_ZONE,{hour:'2-digit',minute:'2-digit',hour12:false,weekday:'short'})} {HOME_LABEL}</small></>;
function Status({w,now}){const s=windowState(w,now);
 return s.kind==='booked'?<span className="bw-status booked"><Check size={14}/> Booked</span>:s.kind==='open'?<span className="bw-status open">Open now</span>:<span className="bw-status soon">in {untilWords(s.ms)}</span>;}
// The Home widget: what opens in the next fortnight, and anything open but not yet booked.
export function BookingWindowsCard({state,now,go}){
 const list=upcomingWindows(state,now);if(!list.length)return null;
 return <section className="bw-card" aria-label="Booking windows">
  <p className="eyebrow"><AlarmClock size={14}/> Booking windows</p>
  <ul>{list.slice(0,4).map(w=><li key={w.id}><button type="button" onClick={()=>go('windows')}><span><b>{w.title}</b><small>{when(w.opensAt)}</small></span><Status w={w} now={now}/><ChevronRight size={16}/></button></li>)}</ul>
  {list.length>4&&<button type="button" className="linkish" onClick={()=>go('windows')}>and {list.length-4} more</button>}
 </section>;
}
function AddOwn({mutate,busy,days}){
 const [f,setF]=useState({title:'',date:'',time:'10:00',url:'',notes:''}),set=(k,v)=>setF({...f,[k]:v});
 return <details className="bw-add"><summary><Plus size={16}/> Add a booking window</summary>
  <form onSubmit={async e=>{e.preventDefault();if(await mutate({type:'bookingWindowAdd',title:f.title,opensAt:new Date(`${f.date}T${f.time}:00+09:00`).toISOString(),url:f.url,notes:f.notes}))setF({title:'',date:'',time:'10:00',url:'',notes:''});}}>
   <label>What it is for<input required maxLength={200} value={f.title} onChange={e=>set('title',e.target.value)} placeholder="teamLab tickets, sushi omakase, sumo seats"/></label>
   <div className="form-row"><label>Opens on (Japan date)<input type="date" required value={f.date} onChange={e=>set('date',e.target.value)}/></label><label>At (Japan time)<input type="time" required value={f.time} onChange={e=>set('time',e.target.value)}/></label></div>
   <label>Where to book<input type="url" value={f.url} onChange={e=>set('url',e.target.value)} placeholder="https://…"/></label>
   <label>Notes<textarea maxLength={2000} value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="Which session, how many tickets, log in beforehand"/></label>
   <button className="primary" disabled={busy}>Add the reminder</button>
  </form></details>;
}
export default function BookingWindows({state,user,now,mutate,busy,go}){
 const parent=user?.role==='parent',list=windows(state),suggested=parent?suggestedWindows(state):[];
 const add=w=>mutate({type:'bookingWindowAdd',title:w.title,opensAt:w.opensAt,url:w.url,notes:w.notes,stepId:w.stepId,day:w.day,key:w.key,ruleId:w.ruleId});
 return <>
  <p className="eyebrow">DON’T MISS THE MINUTE IT OPENS</p><PageTitle help={<><p>When the bookings that sell out in minutes open, in Japan time and {HOME_LABEL} time.</p><p>Every window here goes into the trip calendar with an alert the day before, 15 minutes before and on the minute.</p></>}>Booking windows</PageTitle>
  {parent&&<button type="button" onClick={()=>go('settings')}><CalendarDays size={16}/> Subscribe to the trip calendar for the alerts</button>}
  <section className="bw-list">{list.length?list.map(w=><article key={w.id} className={`bw-item ${windowState(w,now).kind}`}>
   <div className="bw-top"><strong>{w.title}</strong><Status w={w} now={now}/></div>
   <p className="bw-when">{when(w.opensAt)}</p>
   {w.notes&&<p className="bw-notes">{w.notes}</p>}
   <div className="row wrap">{w.url&&<a className="button" href={w.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Booking site</a>}
    {parent&&<button type="button" disabled={busy} onClick={()=>mutate({type:'bookingWindowBooked',id:w.id,booked:!w.bookedAt})}>{w.bookedAt?'Not booked after all':<><Check size={15}/> Booked it</>}</button>}
    {parent&&<button type="button" className="icon danger" aria-label={`Remove ${w.title}`} disabled={busy} onClick={()=>{if(confirm('Remove this booking window?'))mutate({type:'bookingWindowRemove',id:w.id});}}><Trash2 size={16}/></button>}</div>
  </article>):<p className="empty">No booking windows yet.{parent?' Add the ones the plan suggests below, or your own.':''}</p>}</section>
  {parent&&suggested.length>0&&<section className="bw-suggested"><h2>Suggested from our plan</h2>
   <p><small>Typical windows, checked against the official sites in September 2026. They change without notice, so confirm on the booking site before relying on one.</small></p>
   {suggested.map(w=>{const past=Date.parse(w.opensAt)<now;return <div className="bw-suggestion" key={w.key}><div><b>{w.title}</b><small>{past?'Already opened · ':''}{inZone(w.opensAt,JAPAN)} Japan</small><small>{w.notes}</small></div><button type="button" disabled={busy} onClick={()=>add(w)}><Plus size={15}/> Remind us</button></div>;})}
  </section>}
  {parent&&<AddOwn mutate={mutate} busy={busy} days={state.days}/>}
 </>;
}
