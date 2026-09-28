import React,{useState} from 'react';
import {Mic,Square,Pencil,Trash2,MapPin,LocateFixed,X,Tag,Check} from 'lucide-react';
import {useDictation} from './Dictate.jsx';
import {joinSpoken} from './dictation.js';
import {AnchorSelect,anchorValue,readAnchor} from './Shortlist.jsx';
import {askPhoneWhereItIs} from './geo.js';
import {PIN_PLACES,pinText} from './trip-features.js';
import {noticedFor,noticedWhere,noticedItem,noticedItems,itemKey,readItem,NOTICED_TEXT} from './noticed-data.js';
import {dayLabel} from './AdventurePages.jsx';
import {japanDate} from './timing.js';
// Things we noticed. The page is a microphone first: tap, say it, and the words land in the box
// to read back and save. Nothing is saved until it is read — the same rule as every other box
// in the app that can be spoken into. Where the phone cannot turn talking into words, the box
// is still there, and the keyboard's own microphone key does the same job.
function ItemSelect({state,value,onChange}){
 const items=noticedItems(state),groups=[...new Set(items.map(i=>i.group))];
 return <select value={value} onChange={onChange} aria-label="What was it about?">
  <option value="">Nothing in particular</option>
  {groups.map(g=><optgroup key={g} label={g}>{items.filter(i=>i.group===g).map(i=>
   <option key={itemKey(i)} value={itemKey(i)}>{i.label}</option>)}</optgroup>)}
 </select>;
}
function NoticedForm({state,user,editing,mutate,busy,done}){
 const today=japanDate(),onTrip=state.days.some(d=>d.date===today);
 const [text,setText]=useState(editing?.text||''),[spoken,setSpoken]=useState(false);
 const [day,setDay]=useState(editing?editing.day||'':onTrip?today:'');
 const [anchor,setAnchor]=useState(anchorValue(editing)),[item,setItem]=useState(itemKey(editing?.item));
 const [pin,setPin]=useState(editing?.pin||null),[locating,setLocating]=useState(false),[trouble,setTrouble]=useState('');
 const dictation=useDictation({onText:heard=>{setText(t=>joinSpoken(t,heard).slice(0,NOTICED_TEXT));setSpoken(true);}});
 // A new one starts as the big microphone alone. The tap that opens the form is the tap that
 // starts listening: an iPhone will only open the microphone from a tap, not after one.
 const [open,setOpen]=useState(!!editing);
 async function pinHere(){setLocating(true);setTrouble('');try{setPin(await askPhoneWhereItIs(PIN_PLACES));}catch(e){setTrouble(`${e.message}. Choose a stop or place instead.`);}finally{setLocating(false);}}
 async function save(e){
  e.preventDefault();dictation.stop();
  const where=readAnchor(anchor);
  const op={text,day:where.stepId?null:(day||null),...where,pin:pin||null,item:readItem(item),spoken};
  const ok=editing?await mutate({type:'noticedEdit',id:editing.id,...op}):await mutate({type:'noticedAdd',...op,by:user.name});
  if(ok)done();
 }
 if(!open)return <div className="noticed-start">
  <button type="button" className="primary noticed-big" onClick={()=>{setOpen(true);if(dictation.supported)dictation.toggle();}}><Mic size={26}/>Tell it</button>
  {dictation.supported&&<button type="button" onClick={()=>setOpen(true)}><Pencil size={16}/>Type it instead</button>}</div>;
 return <form className="feature-card noticed-form" onSubmit={save}>
  {dictation.supported&&<button type="button" className={`noticed-mic${dictation.listening?' listening':''}`} aria-pressed={dictation.listening} onClick={dictation.toggle}>
   {dictation.listening?<><Square size={22}/>Stop listening</>:<><Mic size={22}/>{text?'Say some more':'Say it'}</>}</button>}
  {dictation.listening&&<p className="dictate-live" aria-live="polite">{dictation.thinking||'Listening…'}</p>}
  {dictation.problem&&<small className="hear-problem">{dictation.problem}</small>}
  <label>What did you notice?<textarea required rows={4} maxLength={NOTICED_TEXT} value={text} onChange={e=>setText(e.target.value)}
   placeholder="The train conductor bowed to the whole carriage before he left."/></label>
  <label>Where was it: a stop or a place<AnchorSelect state={state} value={anchor} onChange={e=>setAnchor(e.target.value)}/></label>
  {!anchor.startsWith('step:')&&<label>Day<select value={day} onChange={e=>setDay(e.target.value)}><option value="">Not on a trip day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>}
  <div className="pin-row"><button type="button" disabled={busy||locating} onClick={pinHere}><LocateFixed size={16}/>{locating?'Finding you…':pin?'Move the pin to where I am now':'Pin where we are standing'}</button>
   {pin&&<span className="tag pin-tag"><MapPin size={13}/>{pinText(pin)}<button type="button" aria-label="Remove the pinned position" onClick={()=>setPin(null)}><X size={14}/></button></span>}</div>
  {trouble&&<p><small>{trouble}</small></p>}
  <label>Was it about something on our lists?<ItemSelect state={state} value={item} onChange={e=>setItem(e.target.value)}/></label>
  <div className="row wrap"><button className="primary" disabled={busy||!text.trim()}><Check size={16}/>{editing?'Save':'Keep it'}</button><button type="button" onClick={()=>{dictation.stop();done();}}>Cancel</button></div>
 </form>;
}
function Noticing({state,user,n,mutate,busy,onEdit}){
 const w=noticedWhere(state,n),item=noticedItem(state,n),mine=user.role==='parent'||n.by===user.name;
 const bits=[n.by,w.day&&dayLabel(w.day),w.label].filter(Boolean);
 return <li className="noticed-item">
  <p>{n.text}</p>
  <small>{bits.join(' · ')}{n.spoken?' · said out loud':''}{n.pending?' · waiting to sync':''}
   {n.pin&&<> · <MapPin size={12}/> pinned</>}{w.mapUrl&&<> · <a href={w.mapUrl} target="_blank" rel="noopener noreferrer">map</a></>}</small>
  {item&&<span className="tag"><Tag size={12}/>{item.label}</span>}
  {mine&&!n.pending&&<div className="row wrap noticed-actions">
   <button type="button" onClick={onEdit}><Pencil size={14}/>Change</button>
   <button type="button" disabled={busy} onClick={()=>confirm('Take this one out?')&&mutate({type:'noticedRemove',id:n.id})}><Trash2 size={14}/>Remove</button></div>}
 </li>;
}
export default function Noticed({state,user,mutate,busy}){
 const [open,setOpen]=useState(null),[fresh,setFresh]=useState(0),[who,setWho]=useState(''),[day,setDay]=useState('');
 const list=noticedFor(state,{person:who||null,day:day||null});
 const editing=open?(state.noticed||[]).find(n=>n.id===open):null;
 return <>
  <p className="eyebrow">THE LITTLE THINGS</p><h1>Things we noticed</h1>
  <p>The moments that are not a stop or a photo. Tap the microphone and say it; tag it to where it was, or to something on our lists.</p>
  <NoticedForm key={fresh} state={state} user={user} mutate={mutate} busy={busy} done={()=>setFresh(f=>f+1)}/>
  <div className="form-row">
   <label>Who<select value={who} onChange={e=>setWho(e.target.value)}><option value="">All of us</option>{(state.members||[]).map(m=><option key={m}>{m}</option>)}</select></label>
   <label>Day<select value={day} onChange={e=>setDay(e.target.value)}><option value="">Whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>
  </div>
  {!list.length&&<p><small>{who||day?'Nothing noticed here yet.':'Nothing yet. The first thing that makes somebody say “look at that” goes here.'}</small></p>}
  <ul className="noticed-list">{list.map(n=>editing?.id===n.id
   ?<li key={n.id}><NoticedForm state={state} user={user} editing={n} mutate={mutate} busy={busy} done={()=>setOpen(null)}/></li>
   :<Noticing key={n.id} state={state} user={user} n={n} mutate={mutate} busy={busy} onEdit={()=>setOpen(n.id)}/>)}</ul>
 </>;
}
