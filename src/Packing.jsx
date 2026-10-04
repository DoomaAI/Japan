import React,{useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {Radar,Luggage,Plus,X,Pencil,Trash2,RotateCcw,Inbox,MapPin,CloudSun,Compass,User,CalendarDays,Sparkles,DoorOpen,Check,ClipboardCheck} from 'lucide-react';
import {packing} from './trip-features.js';
import {PACK_CATEGORIES,PACK_PRIORITY,PACK_SOURCES,PACK_SCOPES,inPackScope,packCategoryLabel,packingSuggestions,dismissedSuggestions,nextPackUp,packingProgress,daysAhead,packingWeather,beforeWeGo,beforeProgress} from './packing-data.js';
import {forwardedTrackers,linkState} from './trackers.js';
import {japanDate,japanClock} from './timing.js';
import GoingHome from './GoingHome.jsx';
import {goingHomeSoon} from './going-home.js';
import {SWEEP,readSweep,writeSweep,toggleSweep,sweepWords} from './sweep-data.js';
import {shortDay as fmt} from './format.js';
const SOURCE_ICONS={japan:MapPin,weather:CloudSun,activity:Compass,person:User,trip:CalendarDays};
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
function PackRow({item,user,mutate,busy,onEdit,remove}){
 const packed=!!item.packedAt,mine=user.role==='parent'||item.createdBy===user.name;
 return <div className={`todo-row ${packed?'done':''}`}>
  <label className="todo-tick">
   <input type="checkbox" checked={packed} disabled={busy}
    onChange={e=>mutate({type:'packStatus',id:item.id,packed:e.target.checked,by:user.name})}
    aria-label={`${packed?'Unpack':'Packed'} ${item.title}`}/>
  </label>
  <div className="todo-body">
   <strong>{item.title}{item.qty>1&&<span className="pack-qty"> ×{item.qty}</span>}</strong>
   <small>{whose(item.person)}{item.pending?' · Waiting to sync':packed?` · Packed by ${item.packedBy}${item.packedAt?` at ${japanClock(new Date(item.packedAt))}`:''}`:''}</small>
   {item.notes&&<p>{item.notes}</p>}
  </div>
  {mine&&onEdit&&!item.pending&&<div className="todo-actions">
   <button className="icon" aria-label={`Edit ${item.title}`} onClick={()=>onEdit(item)}><Pencil size={16}/></button>
   <button className="icon danger" aria-label={`Remove ${item.title}`} disabled={busy}
    onClick={()=>remove({type:'packRemove',id:item.id},{type:'packAdd',title:item.title,category:item.category,person:item.person,qty:item.qty,notes:item.notes},`“${item.title}” taken off the packing list.`)}><Trash2 size={16}/></button>
  </div>}
 </div>;
}
// The things done rather than packed before we leave, for the next pack-up: shared, so a tick on
// one phone shows on all of them, and cleared with the packing ticks when the next one starts.
function BeforeWeGo({state,user,mutate,busy,next}){
 const ticked=packing(state).before||{},list=beforeWeGo(next),{done,total}=beforeProgress(state,next);
 if(!next)return <div className="empty"><ClipboardCheck/><h2>No more moves on this trip.</h2><p>The list comes back with the next pack-up.</p></div>;
 return <section className="todo-group">
  <h2>{next.home?`Before we fly home · ${fmt(next.date)}`:`Before we leave for ${next.to} · ${fmt(next.date)}`}</h2>
  <p><small>{done===total?'All done. Nothing left but the bags.':`${done} of ${total} done.`} Anyone can tick, with no signal needed.</small></p>
  {list.map(b=>{const t=ticked[b.id];return <div key={b.id} className={`todo-row ${t?'done':''}`}>
   <label className="todo-tick"><input type="checkbox" checked={!!t} disabled={busy}
    onChange={e=>mutate({type:'packBefore',id:b.id,done:e.target.checked,by:user.name})} aria-label={`${t?'Not done':'Done'}: ${b.title}`}/></label>
   <div className="todo-body"><strong>{b.title}</strong><small>{t?`Done by ${t.by}${t.at?` at ${japanClock(new Date(t.at))}`:''}`:b.note}</small></div>
  </div>;})}
 </section>;
}
// The line on the day screen the evening before the cases have to be closed, and on the morning
// itself: where we are going, and how much is still out of the case.
// A forwarded suitcase with a tracker in it is the one bag we will want to find while it is not
// with us, so a parent is reminded to share where it is on the same days as the pack-up.
// Once round the room before the bags go: the same hiding places in every hotel, ticked on
// this phone for that day only. Opens under the nudge on the move day itself.
export function CheckoutSweep({day}){
 const [ids,setIds]=useState(()=>readSweep(day));
 const tick=id=>{const next=toggleSweep(ids,id);setIds(next);writeSweep(day,next);};
 return <details className="callout sweep"><summary><DoorOpen size={18}/> <strong>Checkout sweep</strong> · {sweepWords(ids)}</summary>
  <ul className="sweep-list">{SWEEP.map(s=>{const on=ids.includes(s.id);return <li key={s.id}><button type="button" aria-pressed={on} onClick={()=>tick(s.id)}><span className={`sweep-tick${on?' on':''}`}>{on&&<Check size={14} strokeWidth={3}/>}</span><span><strong>{s.title}</strong><small>{s.note}</small></span></button></li>;})}</ul>
 </details>;
}
export function PackingNudge({state,user,day,go}){
 const next=nextPackUp(state,day),{left,total}=packingProgress(state),before=beforeProgress(state,next);
 if(!next||!go)return null;
 const tomorrow=state.days[state.days.findIndex(d=>d.date===day)+1]?.date;
 if(next.date!==day&&next.date!==tomorrow)return null;
 const forwarded=user?.role==='parent'&&!next.home?forwardedTrackers(state):[];
 const unshared=forwarded.filter(t=>linkState(t).state!=='live').length;
 return <>
 <button className="callout pack-nudge" onClick={()=>go('packing')}>
  <Luggage size={18}/><span><strong>{next.date===day?'Packing up today':'Packing up tomorrow'}</strong> · {next.home?'going home':`to ${next.to}`}.
   {' '}{total?(left?`${left} of ${total} still to pack.`:'Everything is packed.'):'Open the packing list.'}{before.left?` ${before.left} ${before.left===1?'thing':'things'} to do before we go.`:''}</span>
 </button>
 {next.date===day&&<CheckoutSweep key={day} day={day}/>}
 {!!forwarded.length&&<button className="callout pack-nudge" onClick={()=>go('trackers')}>
  <Radar size={18}/><span><strong>{forwarded.length===1?'A forwarded bag has a tracker':`${forwarded.length} forwarded bags have trackers`}</strong> · {unshared
   ?`share ${unshared===1?'its':'their'} location in Find My and paste the link, so it is to hand while the bag is away.`
   :'the Find My links are live.'}</span>
 </button>}
 {next.home&&<GoingHome/>}
 </>;
}
export default function Packing({state,user,mutate,busy,remove}){
 const today=japanDate(),parent=user.role==='parent';
 const {items}=packing(state),suggestions=packingSuggestions(state,today),dismissed=dismissedSuggestions(state,today);
 const [view,setView]=useState(items.length?'list':'suggest');
 // A child opens on their own list and a parent on everything; either can switch to the joint
 // list, or to anyone's own.
 const me=state.members.includes(user.name)?user.name:state.members[0]||'';
 const [scope,setScope]=useState(parent?'all':'own'),[who,setWho]=useState(me),[show,setShow]=useState('open'),[source,setSource]=useState(''),[edit,setEdit]=useState(null),[showDismissed,setShowDismissed]=useState(false);
 const {packed,total}=packingProgress(state,scope,who),next=nextPackUp(state,today);
 const w=packingWeather(state,daysAhead(state,today));
 const forPerson=x=>inPackScope(x,scope,who);
 const scopeCount=id=>items.filter(i=>inPackScope(i,id,who)).length;
 const scopeName=scope==='joint'?'the joint list':scope==='own'?(who===user.name?'your own list':`${who}’s own list`):'';
 const listed=items.filter(i=>forPerson(i)&&(show==='all'||(show==='packed'?!!i.packedAt:!i.packedAt)));
 const byCategory=PACK_CATEGORIES.map(([id,label])=>({id,label,list:listed.filter(i=>(PACK_CATEGORIES.some(([c])=>c===i.category)?i.category:'other')===id)})).filter(g=>g.list.length);
 const offered=suggestions.filter(s=>forPerson(s)&&(!source||s.sources.includes(source)));
 const essentials=offered.filter(s=>s.priority==='essential');
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  const values={title:f.get('title'),category:f.get('category'),person:f.get('person'),qty:Number(f.get('qty'))||1,notes:f.get('notes'),by:user.name};
  if(await mutate(edit.id?{type:'packEdit',id:edit.id,...values}:{type:'packAdd',...values})){setEdit(null);setView('list');}
 }
 return <><p className="eyebrow">WHAT GOES IN THE CASE</p><PageTitle help={<p>Our own list, ticked off as it goes in — and suggestions worked out from where we are going, the weather, what is on the days ahead and who is coming. Add what suits us, turn down what does not, and write in anything it missed. Anyone can add and tick, with no signal needed.</p>}>Packing list</PageTitle><GoingHome open={goingHomeSoon(state,today)}/>
 {next&&<p className="callout"><Luggage size={18}/><span><strong>Next pack-up: {fmt(next.date)}</strong> · {next.from} → {next.home?'home':next.to}.
  {parent&&(!!packed||!!beforeProgress(state,next).done)&&<> <button disabled={busy} onClick={()=>{if(confirm('Untick everything, the before-we-go list too, ready to pack again for the next move?'))mutate({type:'packReset'});}}><RotateCcw size={14}/>Start this pack-up again</button></>}</span></p>}
 <div className="segmented pack-scope" role="group" aria-label="Whose list">
  {PACK_SCOPES.map(([id,label])=><button key={id} className={scope===id?'selected':''} aria-pressed={scope===id} onClick={()=>setScope(id)}>{label} · {scopeCount(id)}</button>)}
 </div>
 <div className="quest-progress"><strong>{packed} of {total} packed{scopeName&&` on ${scopeName}`}</strong><progress max={Math.max(total,1)} value={packed}/>
  <span>{w.forecast?`Using the saved forecast for ${w.forecast} of the ${w.each.length} days ahead${w.usual?' and the usual weather for the rest':''}.`:'No forecast saved yet, so the weather suggestions use what these cities are usually like. Refresh the forecast on the Weather screen to sharpen them.'}</span></div>
 <div className="segmented pack-tabs">
  <button className={view==='list'?'selected':''} onClick={()=>setView('list')}>{scope==='own'?(who===user.name?'My list':`${who}’s list`):scope==='joint'?'Joint list':'Our list'} · {total}</button>
  <button className={view==='suggest'?'selected':''} onClick={()=>setView('suggest')}>Suggested · {suggestions.filter(forPerson).length}</button>
  <button className={view==='before'?'selected':''} onClick={()=>setView('before')}>Before we go{next?` · ${beforeProgress(state,next).left}`:''}</button>
 </div>
 {view!=='before'&&<div className="document-filters"><div className="form-row">
  {scope==='own'&&<label>Whose<select value={who} onChange={e=>setWho(e.target.value)}>{state.members.map(n=><option key={n} value={n}>{n===user.name?`${n} (me)`:n}</option>)}</select></label>}
  {view==='list'
   ?<label>Show<select value={show} onChange={e=>setShow(e.target.value)}><option value="open">Still to pack</option><option value="packed">Packed</option><option value="all">Everything</option></select></label>
   :<label>Because of<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Everything</option>{Object.entries(PACK_SOURCES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
 </div></div>}
 {view==='before'&&<BeforeWeGo state={state} user={user} mutate={mutate} busy={busy} next={next}/>}
 {view==='list'&&<>
  <button className="primary" onClick={()=>setEdit({title:'',category:'other',person:scope==='own'?who:scope==='joint'||parent?'Family':me,qty:1,notes:''})}><Plus size={18}/>{scope==='own'?(who===user.name?'Add something of my own':`Add something for ${who}`):scope==='joint'?'Add something we share':'Add something of our own'}</button>
  {byCategory.map(g=><section className="todo-group" key={g.id}>
   <h2>{g.label}</h2>
   {g.list.map(item=><PackRow key={item.id} item={item} user={user} mutate={mutate} busy={busy} onEdit={setEdit} remove={remove}/>)}
  </section>)}
  {!byCategory.length&&<div className="empty"><Inbox/><h2>{items.length?(show==='open'?'Everything here is packed.':'Nothing matches those filters.'):'Nothing on the list yet.'}</h2>
   <p>{items.length?'Try Everything, or another list.':<>Start from the <button onClick={()=>setView('suggest')}>suggestions</button>, or add something of our own.</>}</p></div>}
 </>}
 {view==='suggest'&&<>
  {essentials.length>1&&<button className="primary" disabled={busy}
   onClick={()=>mutate({type:'packAddAll',items:essentials.map(fromSuggestion),by:user.name})}><Plus size={18}/>Add all {essentials.length} essentials</button>}
  {PACK_PRIORITY.map(([id,label])=>{const list=offered.filter(s=>s.priority===id);return list.length>0&&<section className="todo-group" key={id}>
   <h2>{label}</h2>
   {list.map(s=><Suggestion key={s.id} s={s} mutate={mutate} busy={busy} user={user}/>)}
  </section>;})}
  {!offered.length&&<div className="empty"><Sparkles/><h2>{suggestions.length?'Nothing suggested for that.':'Nothing more to suggest.'}</h2>
   <p>{suggestions.length?'Try Everything, or another list.':'Every suggestion is on the list or turned down. New ones appear as the plan and the forecast change.'}</p></div>}
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
   <label>For<select name="person" defaultValue={edit.person}><option value="Family">Joint · all of us</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
   <label>How many<input name="qty" type="number" min={1} max={99} defaultValue={edit.qty||1}/></label>
  </div>
  <label>Notes<textarea name="notes" maxLength={1000} defaultValue={edit.notes||''} placeholder="Which bag it goes in, or where it is now"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save':'Add it'}</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>}
 </>;
}
