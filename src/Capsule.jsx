import React,{useState} from 'react';
import {Hourglass,Lock,Unlock,Check} from 'lucide-react';
import {CAPSULE_MAX,capsuleOpens,capsuleIsOpen,capsuleWritable,capsuleFor,capsule,daysUntilOpen} from './capsule-data.js';
import {dayLabel} from './AdventurePages.jsx';
import Dictate from './Dictate.jsx';
// Open next year: write yours, see who has sealed theirs, and a year on read them all.
export default function Capsule({state,user,today,mutate,busy}){
 const open=capsuleIsOpen(state,today),writable=capsuleWritable(state,today),mine=capsuleFor(state,user.name);
 const [editing,setEditing]=useState(false);const box=React.useRef(null);
 const opens=capsuleOpens(state),left=daysUntilOpen(state,today);
 const parent=user.role==='parent',people=state.members||[];
 async function save(e){e.preventDefault();const f=new FormData(e.currentTarget);if(await mutate({type:'capsuleWrite',person:f.get('person')||user.name,text:f.get('text')}))setEditing(false);}
 return <>
  <p className="eyebrow">{open?'OPENED':'SEALED'}</p><h1>Open next year</h1>
  <p>{open?`Written on the last days of the trip, opened ${dayLabel(opens)}.`:`A note from each of us to the family a year on: what we loved, what we hope, what to remember. Sealed until ${opens?dayLabel(opens):'a year after the trip'}${left!==null&&left>0?`, ${left} day${left===1?'':'s'} from now`:''}. Nobody reads anybody else’s before then, not even by asking the server.`}</p>
  {!open&&!writable&&<p className="callout"><Hourglass size={18}/> Writing opens on the last three days of the trip.</p>}
  {!open&&writable&&<section className="arrival-part">
   <h2><Lock size={18}/> Yours</h2>
   {mine?.text&&!editing&&<blockquote>{mine.text}</blockquote>}
   {!editing&&<button type="button" className="primary" onClick={()=>setEditing(true)}>{mine?.text?'Change it':'Write yours'}</button>}
   {editing&&<form onSubmit={save}>
    {parent&&<label>Whose<select name="person" defaultValue={user.name}>{people.map(n=><option key={n}>{n}</option>)}</select></label>}
    <label>To the family, a year from now<textarea ref={box} name="text" maxLength={CAPSULE_MAX} defaultValue={mine?.text||''} rows={6} autoFocus placeholder="Dear us next year…"/></label>
    <Dictate into={box} label="Say it" what="your note"/>
    <div className="row wrap"><button className="primary" disabled={busy}><Check size={16}/>Seal it</button><button type="button" onClick={()=>setEditing(false)}>Cancel</button></div>
   </form>}
  </section>}
  <section className="arrival-part"><h2>{open?<Unlock size={18}/>:<Lock size={18}/>} {open?'The notes':'Who has sealed one'}</h2>
   <ul className="home-front">{people.map(n=>{const c=capsule(state)[n];return <li key={n}><span><strong>{n}</strong>{open&&c?.text?<blockquote>{c.text}</blockquote>:<small>{c?.text||c?.sealed?'Sealed':'Nothing yet'}</small>}</span></li>;})}</ul>
  </section>
 </>;
}
