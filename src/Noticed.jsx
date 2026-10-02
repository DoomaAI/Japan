import {findReportKind} from './report-data.js';
import React,{useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {Mic,Square,Pencil,Trash2,MapPin,LocateFixed,X,Tag,Check} from 'lucide-react';
import {useDictation} from './Dictate.jsx';
import {joinSpoken} from './dictation.js';
import {AnchorSelect,anchorValue,readAnchor} from './Shortlist.jsx';
import {askPhoneWhereItIs} from './geo.js';
import {PIN_PLACES,pinText,voiceLength} from './trip-features.js';
import {noticedFeed,noticedWhere,noticedItem,noticedItems,itemKey,readItem,voiceTitle,NOTICED_TEXT} from './noticed-data.js';
import {VoiceWords} from './VoiceNotes.jsx';
import {dayLabel} from './AdventurePages.jsx';
import {japanDate} from './timing.js';
import {voiceUrl} from './api-urls.js';
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
function NoticedForm({state,user,editing,preset,mutate,busy,done}){
 const from=editing||preset;
 const today=japanDate(),onTrip=state.days.some(d=>d.date===today);
 const [text,setText]=useState(editing?.text||''),[spoken,setSpoken]=useState(false);
 const [day,setDay]=useState(from?from.day||'':onTrip?today:'');
 const [anchor,setAnchor]=useState(anchorValue(from)),[item,setItem]=useState(itemKey(from?.item));
 const [pin,setPin]=useState(editing?.pin||null),[locating,setLocating]=useState(false),[trouble,setTrouble]=useState('');
 const dictation=useDictation({onText:heard=>{setText(t=>joinSpoken(t,heard).slice(0,NOTICED_TEXT));setSpoken(true);}});
 // A new one starts as the big microphone alone. The tap that opens the form is the tap that
 // starts listening: an iPhone will only open the microphone from a tap, not after one.
 const [open,setOpen]=useState(!!from);
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
  {preset?.item?.kind==='voice'&&<VoicePlayer voice={noticedItem(state,preset)?.voice}/>}
  <label>{preset?.item?.kind==='voice'?'What was it? Say what the recording is about':'What did you notice?'}<textarea required rows={4} maxLength={NOTICED_TEXT} value={text} onChange={e=>setText(e.target.value)}
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
 return <li className={`noticed-item${n.report?' report':''}`}>
  <p>{n.report&&<span className="noticed-report" aria-hidden="true">{findReportKind(n.report.kind)?.icon}</span>}{n.text}</p>
  <small>{bits.join(' · ')}{n.spoken?' · said out loud':''}{n.pending?' · waiting to sync':''}
   {n.pin&&<> · <MapPin size={12}/> pinned</>}{w.mapUrl&&<> · <a href={w.mapUrl} target="_blank" rel="noopener noreferrer">map</a></>}</small>
  {item?.kind==='voice'?<><VoicePlayer voice={item.voice}/><VoiceWords note={item.voice} user={user} mutate={mutate} busy={busy}/></>:item&&<span className="tag"><Tag size={12}/>{item.label}</span>}
  {mine&&!n.pending&&<div className="row wrap noticed-actions">
   <button type="button" onClick={onEdit}><Pencil size={14}/>Change</button>
   <button type="button" disabled={busy} onClick={()=>confirm('Take this one out?')&&mutate({type:'noticedRemove',id:n.id})}><Trash2 size={14}/>Remove</button></div>}
 </li>;
}
function VoicePlayer({voice}){
 if(!voice)return null;
 return <div className="noticed-voice"><Mic size={15}/><span>{voiceTitle(voice)} · {voiceLength(voice.seconds)}</span><audio controls preload="none" src={voiceUrl(voice)}/></div>;
}
// A voice note recorded anywhere in the app — on a stop, on a day, or from here. It keeps its
// own place and day; a few words written against it turn it into something we noticed, with the
// recording inside it.
function VoiceClip({state,user,v,onTell,mutate,busy}){
 const step=v.stepId?state.steps.find(s=>s.id===v.stepId):null;
 const bits=[v.by,v.day&&dayLabel(v.day),step?.title].filter(Boolean);
 return <li className="noticed-item voice">
  <VoicePlayer voice={v}/>
  <VoiceWords note={v} user={user} mutate={mutate} busy={busy}/>
  <small>{bits.join(' · ')}</small>
  <div className="row wrap noticed-actions"><button type="button" onClick={onTell}><Pencil size={14}/>Say what it was</button></div>
 </li>;
}
export default function Noticed({state,user,mutate,busy,show}){
 const [open,setOpen]=useState(null),[fresh,setFresh]=useState(0),[who,setWho]=useState(''),[day,setDay]=useState('');
 const [voice,setVoice]=useState(true),[telling,setTelling]=useState(null);
 const list=noticedFeed(state,{person:who||null,day:day||null,voice});
 const editing=open?(state.noticed||[]).find(n=>n.id===open):null;
 const recordings=(state.voiceNotes||[]).length;
 return <>
  <p className="eyebrow">THE LITTLE THINGS</p><PageTitle help={<><p>The moments that are not a stop or a photo.</p><p>Tap the microphone and say it; tag it to where it was, or to something on our lists. Every voice note recorded in the app is here too.</p></>}>Things we noticed</PageTitle>
  <NoticedForm key={fresh} state={state} user={user} mutate={mutate} busy={busy} done={()=>setFresh(f=>f+1)}/>
  {show&&<button type="button" className="noticed-record" onClick={()=>show({type:'voice',day:day||(state.days.some(d=>d.date===japanDate())?japanDate():undefined)})}><Mic size={16}/>Record a voice note instead</button>}
  <div className="form-row">
   <label>Who<select value={who} onChange={e=>setWho(e.target.value)}><option value="">All of us</option>{(state.members||[]).map(m=><option key={m}>{m}</option>)}</select></label>
   <label>Day<select value={day} onChange={e=>setDay(e.target.value)}><option value="">Whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>
  </div>
  {!!recordings&&<label className="check-row"><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> Show voice notes ({recordings})</label>}
  {!list.length&&<p><small>{who||day?'Nothing noticed here yet.':'Nothing yet. The first thing that makes somebody say “look at that” goes here.'}</small></p>}
  <ul className="noticed-list">{list.map(({kind,id,noticed:n,voice:v})=>kind==='voice'
   ?telling===id
    ?<li key={id}><NoticedForm state={state} user={user} preset={{item:{kind:'voice',id},stepId:v.stepId,day:v.day}} mutate={mutate} busy={busy} done={()=>setTelling(null)}/></li>
    :<VoiceClip key={id} state={state} user={user} v={v} mutate={mutate} busy={busy} onTell={()=>setTelling(id)}/>
   :editing?.id===id
   ?<li key={id}><NoticedForm state={state} user={user} editing={n} mutate={mutate} busy={busy} done={()=>setOpen(null)}/></li>
   :<Noticing key={id} state={state} user={user} n={n} mutate={mutate} busy={busy} onEdit={()=>setOpen(id)}/>)}</ul>
 </>;
}
