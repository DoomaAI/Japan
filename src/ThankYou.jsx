import React,{useState} from 'react';
import {Heart,ArrowUp,ArrowDown,Plus,Trash2} from 'lucide-react';
import {thankYouNotes,thankYouSchedule,thankYouSpares,THANK_YOU_FROM,THANK_YOU_TO} from './trip-features.js';
import {japanClock,japanDate} from './timing.js';
import {dayLabel} from './AdventurePages.jsx';
const preview=t=>t.length>110?t.slice(0,110).trimEnd()+'…':t;
export function ThankYouNote({note,seenAt,busy,dismiss}){
 return <div className="thank-you-note">
  <p className="eyebrow">FOR {THANK_YOU_TO.toUpperCase()} · {dayLabel(note.day)}</p>
  <Heart size={26} aria-hidden="true"/>
  <blockquote>{note.text}</blockquote>
  <p className="thank-you-sign">— {THANK_YOU_FROM}</p>
  <button className="primary" disabled={busy} onClick={dismiss}>Thank you · close this note</button>
  {seenAt&&<small>You opened today’s note at {japanClock(new Date(seenAt))} JST.</small>}
 </div>;
}
export function ThankYouEditor({state,mutate,busy}){
 const [edit,setEdit]=useState(null);
 const notes=thankYouNotes(state),schedule=thankYouSchedule(state),spares=thankYouSpares(state);
 const dayFor=new Map(schedule.filter(e=>e.message).map(e=>[e.message.id,e.day]));
 const order=notes.map(m=>m.id),seen=state.thankYou?.seen||{},today=japanDate();
 async function move(id,delta){
  const i=order.indexOf(id),j=i+delta;if(j<0||j>=order.length)return;
  const ids=[...order];[ids[i],ids[j]]=[ids[j],ids[i]];await mutate({type:'thankYouReorder',ids});
 }
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:edit.id?'thankYouEdit':'thankYouAdd',id:edit.id,text:f.get('text'),day:f.get('day')||null}))setEdit(null);
 }
 return <>
  <p className="eyebrow">JUST BETWEEN YOU AND {THANK_YOU_TO.toUpperCase()}</p>
  <h1>Daily notes for {THANK_YOU_TO}</h1>
  <p>One note pops up for {THANK_YOU_TO} on each day of the trip. She sees only that day’s note, never this list. Nate and Boston see nothing at all, and these notes stay out of Family updates and the change history.</p>
  <p className="callout"><Heart size={18}/>Reorder the list to change which day gets which note. Pin a note to a specific day, amend the wording, or write a new one.</p>
  <h2>The schedule</h2>
  <div className="thank-you-schedule">{schedule.map(({day,message})=><div className="list-row" key={day}>
   <span><strong>{dayLabel(day)}</strong>{day===today&&' · today'}<small>{message?preview(message.text):'No note scheduled for this day.'}</small></span>
   <span className="thank-you-status">{seen[day]?`Read ${japanClock(new Date(seen[day]))} JST`:day<today?'Not opened':'Waiting'}</span>
  </div>)}</div>
  <div className="section-heading"><h2>All notes ({notes.length})</h2><button className="primary" onClick={()=>setEdit({text:'',day:null})}><Plus size={18}/>Write a new note</button></div>
  {spares.length>0&&<p><small>{spares.length} note{spares.length===1?'':'s'} beyond the {state.days.length} trip days. They stay here as spares until you move them up the list.</small></p>}
  {edit&&!edit.id&&<NoteForm edit={edit} state={state} busy={busy} save={save} cancel={()=>setEdit(null)}/>}
  {notes.map((m,i)=>edit?.id===m.id
   ?<NoteForm key={m.id} edit={m} state={state} busy={busy} save={save} cancel={()=>setEdit(null)}/>
   :<article className="feature-card thank-you-row" key={m.id}>
    <div className="section-heading">
     <span className="tag">{dayFor.get(m.id)?`${dayLabel(dayFor.get(m.id))}${m.day?' · pinned':''}`:'Spare'}</span>
     <span className="reorder-tools"><button aria-label={`Move note ${i+1} earlier`} disabled={busy||i===0} onClick={()=>move(m.id,-1)}><ArrowUp size={18}/></button><button aria-label={`Move note ${i+1} later`} disabled={busy||i===notes.length-1} onClick={()=>move(m.id,1)}><ArrowDown size={18}/></button></span>
    </div>
    <p>{m.text}</p>
    <div className="row wrap">
     <button onClick={()=>setEdit(m)}>Amend</button>
     <button className="danger" disabled={busy} onClick={()=>{if(confirm('Remove this note? The remaining notes move up a day.'))mutate({type:'thankYouRemove',id:m.id});}}><Trash2 size={16}/>Remove</button>
    </div>
   </article>)}
  {!notes.length&&<div className="empty"><h3>No notes yet</h3><p>Write the first one and it will appear for {THANK_YOU_TO} on day one.</p></div>}
 </>;
}
function NoteForm({edit,state,busy,save,cancel}){
 return <form className="feature-card" key={edit.id||'new'} onSubmit={save}>
  <h2>{edit.id?'Amend this note':'A new note'}</h2>
  <label>What you want to say<textarea name="text" required maxLength={1200} defaultValue={edit.text||''} placeholder={`Thank you for…`}/></label>
  <label>Pin to a day (optional)<select name="day" defaultValue={edit.day||''}><option value="">Follow the list order</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.title}</option>)}</select></label>
  <p><small>A pinned note always lands on that day. Unpinned notes fill the remaining days in list order.</small></p>
  <div className="row wrap"><button className="primary" disabled={busy}>Save note</button><button type="button" onClick={cancel}>Cancel</button></div>
 </form>;
}
