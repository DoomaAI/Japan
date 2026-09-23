import React,{useState} from 'react';
import {Luggage,Plus,X,Pencil,Trash2,RotateCcw,Inbox,MapPin,CloudSun,Compass,User,CalendarDays,Sparkles} from 'lucide-react';
import {packing} from './trip-features.js';
import {PACK_CATEGORIES,PACK_PRIORITY,PACK_SOURCES,packCategoryLabel,packingSuggestions,dismissedSuggestions,nextPackUp,packingProgress,daysAhead,packingWeather} from './packing-data.js';
import {japanDate} from './timing.js';
const SOURCE_ICONS={japan:MapPin,weather:CloudSun,activity:Compass,person:User,trip:CalendarDays};
const fmt=date=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(date+'T12:00:00+09:00'));
const whose=person=>person==='Family'?'All of us':`For ${person}`;
// What goes onto the list from a suggestion: the suggestion as it stands, remembered by its id so
// it is not offered again. Anything about it can be changed once it is on the list.
const fromSuggestion=s=>({title:s.title,category:s.category,person:s.person,qty:s.qty,notes:s.note||'',suggestionId:s.id});
function Suggestion({s,mutate,busy,user}){
 return <div className="pack-suggestion">
  <div className="todo-body">
   <strong>{s.title}{s.qty>1&&<span className="pack-qty"> ×{s.qty}</span>}</strong>
   <small>{whose(s.person)} · {packCategoryLabel(s.category)}</small>
   <ul className="pack-why">{s.why.map((why,i)=>{const Icon=SOURCE_ICONS[s.sources[i]]||SOURCE_ICONS[s.sources[0]]||Sparkles;
    return <li key={why}><Icon size={13} aria-hidden="true"/>{why}</li>;})}</ul>
   {s.note&&<p>{s.note}</p>}
  </div>
  <div className="pack-suggestion-actions">
   <button className="primary" disabled={busy} onClick={()=>mutate({type:'packAdd',...fromSuggestion(s),by:user.name})}><Plus size={16}/>Add</button>
   <button disabled={busy} aria-label={`Not needed: ${s.title}`} onClick={()=>mutate({type:'packDismiss',suggestionId:s.id,dismissed:true,by:user.name})}><X size={16}/>Not needed</button>
  </div>
 </div>;
}
function PackRow({item,user,mutate,busy,onEdit}){
 const packed=!!item.packedAt,mine=user.role==='parent'||item.createdBy===user.name;
 return <div className={`todo-row ${packed?'done':''}`}>
  <label className="todo-tick">
   <input type="checkbox" checked={packed} disabled={busy}
    onChange={e=>mutate({type:'packStatus',id:item.id,packed:e.target.checked,by:user.name})}
    aria-label={`${packed?'Unpack':'Packed'} ${item.title}`}/>
  </label>
  <div className="todo-body">
   <strong>{item.title}{item.qty>1&&<span className="pack-qty"> ×{item.qty}</span>}</strong>
   <small>{whose(item.person)}{item.pending?' · Waiting to sync':packed?` · Packed by ${item.packedBy}`:''}</small>
   {item.notes&&<p>{item.notes}</p>}
  </div>
  {mine&&onEdit&&!item.pending&&<div className="todo-actions">
   <button className="icon" aria-label={`Edit ${item.title}`} onClick={()=>onEdit(item)}><Pencil size={16}/></button>
   <button className="icon danger" aria-label={`Remove ${item.title}`} disabled={busy}
    onClick={()=>{if(confirm(`Take “${item.title}” off the packing list?`))mutate({type:'packRemove',id:item.id});}}><Trash2 size={16}/></button>
  </div>}
 </div>;
}
// The line on the day screen the evening before the cases have to be closed, and on the morning
// itself: where we are going, and how much is still out of the case.
export function PackingNudge({state,day,go}){
 const next=nextPackUp(state,day),{left,total}=packingProgress(state);
 if(!next||!go)return null;
 const tomorrow=state.days[state.days.findIndex(d=>d.date===day)+1]?.date;
 if(next.date!==day&&next.date!==tomorrow)return null;
 return <button className="callout pack-nudge" onClick={()=>go('packing')}>
  <Luggage size={18}/><span><strong>{next.date===day?'Packing up today':'Packing up tomorrow'}</strong> · {next.home?'going home':`to ${next.to}`}.
   {' '}{total?(left?`${left} of ${total} still to pack.`:'Everything is packed.'):'Open the packing list.'}</span>
 </button>;
}
export default function Packing({state,user,mutate,busy}){
 const today=japanDate(),parent=user.role==='parent';
 const {items}=packing(state),suggestions=packingSuggestions(state,today),dismissed=dismissedSuggestions(state,today);
 const [view,setView]=useState(items.length?'list':'suggest');
 const [person,setPerson]=useState(''),[show,setShow]=useState('open'),[source,setSource]=useState(''),[edit,setEdit]=useState(null),[showDismissed,setShowDismissed]=useState(false);
 const {packed,total}=packingProgress(state),next=nextPackUp(state,today);
 const w=packingWeather(state,daysAhead(state,today));
 const forPerson=x=>!person||x.person===person;
 const listed=items.filter(i=>forPerson(i)&&(show==='all'||(show==='packed'?!!i.packedAt:!i.packedAt)));
 const byCategory=PACK_CATEGORIES.map(([id,label])=>({id,label,list:listed.filter(i=>(PACK_CATEGORIES.some(([c])=>c===i.category)?i.category:'other')===id)})).filter(g=>g.list.length);
 const offered=suggestions.filter(s=>forPerson(s)&&(!source||s.sources.includes(source)));
 const essentials=offered.filter(s=>s.priority==='essential');
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const values={title:f.get('title'),category:f.get('category'),person:f.get('person'),qty:Number(f.get('qty'))||1,notes:f.get('notes'),by:user.name};
  if(await mutate(edit.id?{type:'packEdit',id:edit.id,...values}:{type:'packAdd',...values})){setEdit(null);setView('list');}
 }
 return <><p className="eyebrow">WHAT GOES IN THE CASE</p><h1>Packing list</h1>
 <p>Our own list, ticked off as it goes in — and suggestions worked out from where we are going, the weather, what is on the days ahead and who is coming. Add what suits us, turn down what does not, and write in anything it missed. Anyone can add and tick, with no signal needed.</p>
 {next&&<p className="callout"><Luggage size={18}/><span><strong>Next pack-up: {fmt(next.date)}</strong> · {next.from} → {next.home?'home':next.to}.
  {parent&&!!packed&&<> <button disabled={busy} onClick={()=>{if(confirm('Untick everything, ready to pack again for the next move?'))mutate({type:'packReset'});}}><RotateCcw size={14}/>Start this pack-up again</button></>}</span></p>}
 <div className="quest-progress"><strong>{packed} of {total} packed</strong><progress max={Math.max(total,1)} value={packed}/>
  <span>{w.forecast?`Using the saved forecast for ${w.forecast} of the ${w.each.length} days ahead${w.usual?' and the usual weather for the rest':''}.`:'No forecast saved yet, so the weather suggestions use what these cities are usually like. Check the forecast on the Weather screen to sharpen them.'}</span></div>
 <div className="segmented pack-tabs">
  <button className={view==='list'?'selected':''} onClick={()=>setView('list')}>Our list · {total}</button>
  <button className={view==='suggest'?'selected':''} onClick={()=>setView('suggest')}>Suggested · {suggestions.length}</button>
 </div>
 <div className="document-filters"><div className="form-row">
  <label>For<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Anyone</option><option value="Family">All of us</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  {view==='list'
   ?<label>Show<select value={show} onChange={e=>setShow(e.target.value)}><option value="open">Still to pack</option><option value="packed">Packed</option><option value="all">Everything</option></select></label>
   :<label>Because of<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Everything</option>{Object.entries(PACK_SOURCES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
 </div></div>
 {view==='list'&&<>
  <button className="primary" onClick={()=>setEdit({title:'',category:'other',person:user.role==='parent'?'Family':user.name,qty:1,notes:''})}><Plus size={18}/>Add something of our own</button>
  {byCategory.map(g=><section className="todo-group" key={g.id}>
   <h2>{g.label}</h2>
   {g.list.map(item=><PackRow key={item.id} item={item} user={user} mutate={mutate} busy={busy} onEdit={setEdit}/>)}
  </section>)}
  {!byCategory.length&&<div className="empty"><Inbox/><h2>{items.length?(show==='open'?'Everything here is packed.':'Nothing matches those filters.'):'Nothing on the list yet.'}</h2>
   <p>{items.length?'Try Everything, or somebody else.':<>Start from the <button onClick={()=>setView('suggest')}>suggestions</button>, or add something of our own.</>}</p></div>}
 </>}
 {view==='suggest'&&<>
  {essentials.length>1&&<button className="primary" disabled={busy}
   onClick={()=>mutate({type:'packAddAll',items:essentials.map(fromSuggestion),by:user.name})}><Plus size={18}/>Add all {essentials.length} essentials</button>}
  {PACK_PRIORITY.map(([id,label])=>{const list=offered.filter(s=>s.priority===id);return list.length>0&&<section className="todo-group" key={id}>
   <h2>{label}</h2>
   {list.map(s=><Suggestion key={s.id} s={s} mutate={mutate} busy={busy} user={user}/>)}
  </section>;})}
  {!offered.length&&<div className="empty"><Sparkles/><h2>{suggestions.length?'Nothing suggested for that.':'Nothing more to suggest.'}</h2>
   <p>{suggestions.length?'Try Everything, or somebody else.':'Every suggestion is on the list or turned down. New ones appear as the plan and the forecast change.'}</p></div>}
  {!!dismissed.length&&<section className="todo-group">
   <button className="weather-more" aria-expanded={showDismissed} onClick={()=>setShowDismissed(v=>!v)}>Turned down · {dismissed.length}</button>
   {showDismissed&&dismissed.map(s=><div className="todo-row" key={s.id}>
    <div className="todo-body"><strong>{s.title}</strong><small>{whose(s.person)} · {s.why.join(' · ')}</small></div>
    <button disabled={busy} onClick={()=>mutate({type:'packDismiss',suggestionId:s.id,dismissed:false,by:user.name})}>Bring back</button>
   </div>)}
  </section>}
 </>}
 {edit&&<form key={edit.id||'new'} className="feature-card" onSubmit={save}>
  <h2>{edit.id?'Change this one':'Add something to pack'}</h2>
  <label>What to pack<input name="title" required maxLength={200} autoFocus defaultValue={edit.title} placeholder="Nate’s swimmers · the good camera · spare glasses"/></label>
  <div className="form-row">
   <label>Category<select name="category" defaultValue={edit.category}>{PACK_CATEGORIES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>For<select name="person" defaultValue={edit.person}><option value="Family">All of us</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
   <label>How many<input name="qty" type="number" min={1} max={99} defaultValue={edit.qty||1}/></label>
  </div>
  <label>Notes<textarea name="notes" maxLength={1000} defaultValue={edit.notes||''} placeholder="Which bag it goes in, or where it is now"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save':'Add it'}</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>}
 </>;
}
