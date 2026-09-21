import React,{useEffect,useRef,useState} from 'react';
import {Mail,Paperclip,FileText,Languages,Ticket,Trash2,AlertCircle,ExternalLink} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {inboxItems,inboxTitle,inboxNotes,PROPOSAL_KINDS,TODO_KINDS} from './trip-features.js';
const CATEGORIES=[['reservation','Reservation'],['ticket','Ticket'],['luggage','Luggage'],['other','Something else']];
const arrived=item=>{
 const at=Date.parse(item.receivedAt||item.at||'');
 return Number.isFinite(at)?new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(at)):'';
};
// What the reader made of the email. Prose rather than a form: it is there to be read and
// checked against the booking, not filled in.
function Reading({item,enabled}){
 const reading=item.reading;
 if(item.readError)return <p className="callout"><AlertCircle size={18}/> {item.readError}</p>;
 if(!reading)return <p className="inbox-waiting"><Languages size={16}/> {enabled?'Reading it into English…':'Add an Anthropic API key to have this read into English.'}</p>;
 if(!reading.readable)return <p className="callout"><AlertCircle size={18}/> There was nothing readable in this email. Open the attachment yourself.</p>;
 return <div className="inbox-reading">
  <p className="eyebrow">{reading.kind}{reading.language&&reading.language!=='English'?` · written in ${reading.language}`:''}</p>
  {!!reading.summary?.length&&<ul>{reading.summary.map((line,i)=><li key={i}>{line}</li>)}</ul>}
  {!!reading.actions?.length&&<div className="inbox-todo"><strong>Things to do</strong>
   <ul>{reading.actions.map((a,i)=><li key={i}>{a.what}{a.when?<small>{a.when}</small>:null}</li>)}</ul></div>}
  {reading.translation&&<details><summary>The whole thing in English</summary><pre>{reading.translation}</pre></details>}
 </div>;
}
// Filing is the only way anything from an email reaches the trip, and a person does it. Where
// it goes is the choice that matters: a confirmation belongs in Tickets, a restaurant somebody
// recommended belongs on the board for everyone to vote on, and "pay the balance by the 1st"
// belongs on the to-do list.
const DESTINATIONS=[
 ['ticket','Tickets & reservations','Filed with the bookings. Attach it to the whole trip, a day, or one activity.'],
 ['activity','A new activity on a day','Puts it on the itinerary. Give it a time and it is locked like any other booking.'],
 ['options','The Options list','Somewhere to keep it until it has a day.'],
 ['idea','The planning board','Up for the family to vote on before it gets a day.'],
 ['todo','The to-do list','Something to do or buy, on the day you will do it.']];
function FileForm({item,state,busy,onFile}){
 const [open,setOpen]=useState(false),[to,setTo]=useState('ticket'),[where,setWhere]=useState('trip');
 const steps=state.steps.filter(s=>s.day).sort((a,b)=>String(a.day).localeCompare(String(b.day))||String(a.time||'').localeCompare(String(b.time||'')));
 const note=DESTINATIONS.find(([id])=>id===to)?.[2];
 async function submit(e){
  e.preventDefault();const f=new FormData(e.currentTarget),day=f.get('day')||null;
  const extra=to==='ticket'
   ?{category:f.get('category'),reference:String(f.get('reference')||'').trim(),
     ...(where==='day'?{day}:where==='step'?{stepId:f.get('stepId')}:{})}
   :to==='activity'?{day,time:f.get('time')||null}
   :to==='idea'?{ideaKind:f.get('ideaKind'),day}
   :to==='todo'?{todoKind:f.get('todoKind'),day}:{};
  await onFile({type:'inboxFile',id:item.id,destination:to,title:String(f.get('title')||'').trim(),
   person:f.get('person'),notes:inboxNotes(item),...extra});
 }
 if(!open)return <button className="primary" onClick={()=>setOpen(true)}><Ticket size={16}/> File it</button>;
 const dayField=(label,optional)=><label>{label}<select name="day" defaultValue={optional?'':state.days[0]?.date}>
  {optional&&<option value="">No day yet</option>}
  {state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.title}</option>)}</select></label>;
 return <form className="inbox-form" onSubmit={submit}>
  <label>Call it<input name="title" defaultValue={inboxTitle(item)} maxLength={250} required/></label>
  <label>Where does it go?<select value={to} onChange={e=>setTo(e.target.value)}>
   {DESTINATIONS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <small className="inbox-note">{note}</small>
  {to==='ticket'&&<>
   <div className="form-row">
    <label>File as<select name="category" defaultValue="reservation">{CATEGORIES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label>Attach to<select value={where} onChange={e=>setWhere(e.target.value)}>
     <option value="trip">The whole trip</option><option value="day">A day</option><option value="step">One activity</option></select></label>
   </div>
   <label>Booking reference<input name="reference" maxLength={250} placeholder="Optional"/></label>
   {where==='day'&&dayField('Which day',false)}
   {where==='step'&&<label>Which activity<select name="stepId" defaultValue={steps[0]?.id}>{steps.map(s=><option key={s.id} value={s.id}>{dayLabel(s.day)} {s.time||''} · {s.title}</option>)}</select></label>}
  </>}
  {to==='activity'&&<div className="form-row">{dayField('Which day',false)}
   <label>Time<input name="time" type="time" placeholder="Optional"/></label></div>}
  {to==='idea'&&<div className="form-row">
   <label>What kind<select name="ideaKind" defaultValue="place">{PROPOSAL_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   {dayField('Day in mind',true)}</div>}
  {to==='todo'&&<div className="form-row">
   <label>It is<select name="todoKind" defaultValue="do">{TODO_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   {dayField('Which day',true)}</div>}
  <label>For<select name="person" defaultValue="Family"><option>Family</option>{(state.members||[]).map(n=><option key={n}>{n}</option>)}</select></label>
  {!!item.attachments?.filter(f=>f.pathname).length&&to!=='ticket'&&
   <small className="inbox-note">Its {item.attachments.filter(f=>f.pathname).length} file(s) are kept in Tickets and attached to it.</small>}
  <div className="row wrap"><button className="primary" type="submit" disabled={busy}>File it</button>
   <button type="button" onClick={()=>setOpen(false)} disabled={busy}>Cancel</button></div>
 </form>;
}
function InboxCard({item,state,config,busy,onFile,onDiscard}){
 return <article className="inbox-card">
  <header><strong>{item.subject||'(no subject)'}</strong><small>{item.from}{arrived(item)?` · ${arrived(item)}`:''}</small></header>
  <Reading item={item} enabled={!!config?.documentReader}/>
  {!!item.attachments?.length&&<p className="inbox-files"><Paperclip size={15}/>
   {item.attachments.map(f=>f.pathname
    ?<a key={f.id} href={`/api/inbox-file?id=${f.id}`} target="_blank" rel="noopener noreferrer">{f.filename} <ExternalLink size={13}/></a>
    :<span key={f.id} title={f.skipped||''}>{f.filename} · not kept</span>)}</p>}
  {item.text&&<details><summary><FileText size={15}/> The email as it arrived</summary><pre>{item.text}</pre></details>}
  <div className="row wrap">
   <FileForm item={item} state={state} busy={busy} onFile={onFile}/>
   <button className="danger" disabled={busy}
    onClick={()=>{if(confirm('Throw this email away? Its attachments are deleted with it.'))onDiscard(item);}}><Trash2 size={16}/> Discard</button>
  </div>
 </article>;
}
export default function EmailInbox({state,config,busy,mutate,request,accept,notice,go}){
 const items=inboxItems(state),asked=useRef(null);
 // One at a time, and only once per email: the first message without an English reading is read
 // when a parent opens this screen, rather than when it lands. A mail provider will not wait for
 // a careful translation, and an email nobody opens is not worth paying to translate.
 const outstanding=items.filter(i=>!i.reading&&!i.readError).map(i=>i.id).join(',');
 useEffect(()=>{
  const next=outstanding.split(',').filter(Boolean)[0];
  if(!next||asked.current===next||!config?.documentReader||!navigator.onLine)return;
  asked.current=next;
  request('inbox-read',{id:next}).then(accept).catch(e=>notice(e.message));
 },[outstanding,config?.documentReader]);
 async function file(operation){if(await mutate(operation))notice('Filed in Tickets & reservations.');}
 async function discard(item){if(await mutate({type:'inboxDiscard',id:item.id}))notice('Thrown away.');}
 return <>
  <p className="eyebrow">SENT IN FROM YOUR EMAIL</p>
  <h1>Forwarded email</h1>
  {!config?.emailInbox&&<p className="callout"><AlertCircle size={18}/> Email forwarding is not switched on yet. Set <code>EMAIL_INBOX_SECRET</code> and <code>EMAIL_INBOX_SENDERS</code> in the deployment and point your mail provider at <code>/api/email-in</code>.</p>}
  {config?.emailInbox&&config?.emailInboxOpen&&<p className="inbox-waiting"><Mail size={15}/> Anything sent to the trip address is accepted, whoever it says it is from. Spam is still turned away, and nothing reaches the trip until you file it.</p>}
  {!items.length
   ?<div className="empty"><Mail size={26}/><h3>Nothing waiting</h3><p>Forward a booking confirmation to the trip address and it appears here, read into English, for you to file.</p></div>
   :<>
    <p>{items.length} email{items.length===1?'':'s'} waiting. Nothing here is on the itinerary until you file it.</p>
    <div className="inbox-list">{items.map(item=><InboxCard key={item.id} item={item} state={state} config={config} busy={busy} onFile={file} onDiscard={discard}/>)}</div>
   </>}
  <p className="inbox-waiting"><Ticket size={15}/> Filed email lands in Tickets &amp; reservations, with the English kept in its notes so it reads with no signal. <button onClick={()=>go('tickets')}>Open Tickets</button></p>
 </>;
}
