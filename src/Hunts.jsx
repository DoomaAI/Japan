import React,{useEffect,useRef,useState} from 'react';
import HowThisWorks from './HowThisWorks.jsx';
import {Plus,Pencil,Trash2,ChevronLeft,Crown,MapPin,LocateFixed,X,GripVertical,ChevronUp,ChevronDown,Check,Search} from 'lucide-react';
import {Stars} from './StepReview.jsx';
import {AnchorSelect,anchorValue,readAnchor} from './Shortlist.jsx';
import {askPhoneWhereItIs} from './geo.js';
import {PIN_PLACES,pinText,starText} from './trip-features.js';
import {underFinger,follow,settle} from './lift.js';
import {allHunts,findHunt,huntBoard,huntAverage,huntWhere,huntCities,personalOrder,hasRanked,familyRanking,huntWants,huntState,huntPickers} from './hunt-data.js';
import {dayLabel} from './AdventurePages.jsx';
import {japanDate} from './timing.js';
// The hunts: pick one, add what you tried, and everybody rates it. The best rises to the top.
function EntryForm({state,user,hunt,editing,mutate,busy,done,want:startWant=false}){
 const today=japanDate(),onTrip=state.days.some(d=>d.date===today);
 const [f,setF]=useState({title:editing?.title||'',place:editing?.place||'',day:editing?editing.day||'':onTrip?today:'',yen:editing?.yen??'',note:editing?.note||'',rating:0});
 const [want,setWant]=useState(editing?editing.status==='want':startWant);
 const [anchor,setAnchor]=useState(anchorValue(editing)),[pin,setPin]=useState(editing?.pin||null),[locating,setLocating]=useState(false),[trouble,setTrouble]=useState('');
 async function pinHere(){setLocating(true);setTrouble('');try{setPin(await askPhoneWhereItIs(PIN_PLACES));}catch(e){setTrouble(`${e.message}. Choose a stop or place instead.`);}finally{setLocating(false);}}
 const set=(k,v)=>setF(p=>({...p,[k]:v}));
 async function save(e){
  e.preventDefault();
  const yen=String(f.yen).trim()===''?null:Number(String(f.yen).replace(/[^\d]/g,''));
  const where=readAnchor(anchor);
  const op={title:f.title,place:f.place,day:where.stepId?null:(f.day||null),yen,note:f.note,...where,pin:pin||null};
  const ok=editing?await mutate({type:'huntEdit',id:editing.id,...op})
   :await mutate({type:'huntAdd',hunt:hunt.id,...op,status:want?'want':'tried',...(!want&&f.rating?{rating:f.rating}:{}),by:user.name});
  if(ok)done();
 }
 return <form className="feature-card" onSubmit={save}>
  {!editing&&<div className="segmented" role="group" aria-label="Tried it or want to">
   <button type="button" className={!want?'primary':''} aria-pressed={!want} onClick={()=>setWant(false)}><Check size={15}/> We’ve tried it</button>
   <button type="button" className={want?'primary':''} aria-pressed={want} onClick={()=>setWant(true)}><Search size={15}/> Want to try</button></div>}
  <label>{want?'What do we want to try':'What was it'}<input required maxLength={120} value={f.title} onChange={e=>set('title',e.target.value)} placeholder={hunt.id==='gachapon'?'Tiny sushi keyring':hunt.id==='matcha'?'Iced matcha latte':'What it was called'}/></label>
  <label>Where<input maxLength={200} value={f.place} onChange={e=>set('place',e.target.value)} placeholder="The shop or stall"/></label>
  <label>{want?'Where to find it: a stop or a place':'Tag it to a stop or a place'}<AnchorSelect state={state} value={anchor} onChange={e=>setAnchor(e.target.value)}/></label>
  {!anchor.startsWith('step:')&&<label>Day<select value={f.day} onChange={e=>set('day',e.target.value)}><option value="">Not on a trip day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>}
  <div className="pin-row"><button type="button" disabled={busy||locating} onClick={pinHere}><LocateFixed size={16}/>{locating?'Finding you…':pin?'Move the pin to where I am now':'Pin where we are standing'}</button>
   {pin&&<span className="tag pin-tag"><MapPin size={13}/>{pinText(pin)}<button type="button" aria-label="Remove the pinned position" onClick={()=>setPin(null)}><X size={14}/></button></span>}</div>
  {trouble&&<p><small>{trouble}</small></p>}
  <label>{want?'Price, if we know it (yen)':'Price in yen (if you like)'}<input inputMode="numeric" value={f.yen} onChange={e=>set('yen',e.target.value)}/></label>
  <label>Note<input maxLength={1000} value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Too sweet, perfect, got a double…"/></label>
  {!editing&&!want&&<div><small>Your stars</small><Stars value={f.rating} onPick={n=>set('rating',n)} disabled={busy} label="Your rating"/></div>}
  <div className="row wrap"><button className="primary" disabled={busy}>{editing?'Save':'Add it'}</button><button type="button" onClick={done}>Cancel</button></div>
 </form>;
}
// Where a find was, as a line under its name, with a map link when there is anything to find.
function Where({state,entry}){
 const w=huntWhere(state,entry),bits=[w.label,w.day&&dayLabel(w.day),Number.isInteger(entry.yen)&&`¥${entry.yen.toLocaleString()}`,`added by ${entry.by}`].filter(Boolean);
 return <small>{bits.join(' · ')}{entry.pending?' · waiting to sync':''}{entry.pin&&<> · <MapPin size={12}/> pinned</>}
  {w.mapUrl&&<> · <a href={w.mapUrl} target="_blank" rel="noopener noreferrer">map</a></>}</small>;
}
// One person's own order, best at the top: drag a row by its handle, or use the arrows. Every
// move is saved, and works with no signal.
function MyOrder({state,user,hunt,entries,mutate,busy}){
 const parent=user.role==='parent',members=state.members||[];
 const [who,setWho]=useState(members.includes(user.name)?user.name:members[0]);
 const byId=Object.fromEntries(entries.map(e=>[e.id,e]));
 const order=personalOrder(state,hunt.id,who).filter(id=>byId[id]);
 const drag=useRef(null),[held,setHeld]=useState(null);
 const save=ids=>mutate({type:'huntRank',hunt:hunt.id,person:who,order:ids.filter(id=>!String(id).startsWith('pending-')),by:user.name});
 const move=(id,to)=>{const from=order.indexOf(id);if(from<0||to<0||to>=order.length||to===from)return;const next=order.filter(x=>x!==id);next.splice(to,0,id);save(next);};
 const canEdit=parent||who===user.name;
 useEffect(()=>{const stop=e=>{if(drag.current)e.preventDefault();};document.addEventListener('touchmove',stop,{passive:false});return()=>document.removeEventListener('touchmove',stop);},[]);
 const grab=id=>e=>{if(!canEdit||busy||e.button>0)return;e.currentTarget.setPointerCapture?.(e.pointerId);drag.current={id,y:e.clientY,x:e.clientX,row:e.currentTarget.closest('[data-rank-id]')};setHeld(id);};
 const carry=e=>{const d=drag.current;if(!d)return;follow(d.row,0,e.clientY-d.y);};
 const release=e=>{const d=drag.current;drag.current=null;setHeld(null);if(!d)return;
  const target=underFinger(e.clientX,e.clientY,'[data-rank-id]',d.row);settle(d.row,!target);
  if(target)move(d.id,order.indexOf(target.dataset.rankId));};
 return <section>
  {parent&&<label>Whose order<select value={who} onChange={e=>setWho(e.target.value)}>{members.map(n=><option key={n}>{n}</option>)}</select></label>}
  <p><small>{hasRanked(state,hunt.id,who)?'Best at the top.':'Not put in order yet.'} Drag by the handle, or use the arrows. New ones start at the bottom.</small></p>
  <ol className="rank-list">{order.map((id,i)=>{const e=byId[id];return <li key={id} data-rank-id={id} className={held===id?'held':''}>
   <span className="rank-pos">{i+1}</span>
   {canEdit&&<button type="button" className="rank-grip" aria-label={`Drag ${e.title}`} onPointerDown={grab(id)} onPointerMove={carry} onPointerUp={release} onPointerCancel={()=>{const d=drag.current;drag.current=null;setHeld(null);settle(d?.row,true);}}><GripVertical size={18}/></button>}
   <div className="rank-body"><strong>{e.title}</strong><Where state={state} entry={e}/></div>
   {canEdit&&<span className="rank-arrows"><button type="button" aria-label={`Move ${e.title} up`} disabled={busy||i===0} onClick={()=>move(id,i-1)}><ChevronUp size={16}/></button>
    <button type="button" aria-label={`Move ${e.title} down`} disabled={busy||i===order.length-1} onClick={()=>move(id,i+1)}><ChevronDown size={16}/></button></span>}
  </li>;})}</ol>
 </section>;
}
function ListEditor({hunt,mutate,busy,done}){
 const [title,setTitle]=useState(hunt.title),[icon,setIcon]=useState(hunt.icon),[hint,setHint]=useState(hunt.hint||'');
 async function save(e){e.preventDefault();if(await mutate({type:'huntListEdit',id:hunt.id,title,icon,hint}))done();}
 return <form className="feature-card" onSubmit={save}>
  <label>Name<input required maxLength={60} value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label>Emoji<input maxLength={16} value={icon} onChange={e=>setIcon(e.target.value)}/></label>
  <label>What it is for<input maxLength={200} value={hint} onChange={e=>setHint(e.target.value)}/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>Save</button><button type="button" onClick={done}>Cancel</button></div>
 </form>;
}
// What a removed find comes back as when Undo is tapped: what was typed about it, tagged where it
// was, rated by whoever removed it if they had. Other people's ratings and its place in the
// rankings are not carried, which is why the toast says only that it is back on the list.
const restoreEntry=(e,user)=>({type:'huntAdd',hunt:e.hunt,title:e.title,place:e.place||'',note:e.note||'',day:e.day??null,yen:e.yen??null,stepId:e.stepId||undefined,locationId:e.locationId||undefined,pin:e.pin??null,status:e.status,rating:e.ratings?.[user.name]});
function HuntPage({state,user,hunt,mutate,busy,back,remove}){
 const parent=user.role==='parent',[form,setForm]=useState(null),[view,setView]=useState('stars'),[city,setCity]=useState(''),[editing,setEditing]=useState(false);
 // Each find sits folded to its name, where and average so the whole list stays in view after
 // adding one; open it for the note, everybody's stars and the buttons.
 const [open,setOpen]=useState(()=>new Set()),toggle=id=>setOpen(o=>{const n=new Set(o);n.has(id)?n.delete(id):n.add(id);return n;});
 const board=huntBoard(state,hunt.id),cities=huntCities(state,hunt.id),wants=huntWants(state,hunt.id);
 const here=e=>!city||huntWhere(state,e).city===city;
 const entries=board.entries.filter(here);
 const family=familyRanking(state,hunt.id);
 const ownList=!!hunt.by,canManage=ownList&&(parent||hunt.by===user.name);
 return <>
  <button className="link-back" onClick={back}><ChevronLeft size={16}/> All lists</button>
  <h1><span aria-hidden="true">{hunt.icon}</span> {hunt.title}</h1>
  {hunt.hint&&<p>{hunt.hint.replace(/\.?$/,'.')}</p>}
  {canManage&&!editing&&<div className="row wrap"><button onClick={()=>setEditing(true)}><Pencil size={15}/> Rename</button>
   <button disabled={busy} onClick={()=>{if(confirm(`Delete the ${hunt.title} list and everything on it?`))mutate({type:'huntListRemove',id:hunt.id}).then(ok=>ok&&back());}}><Trash2 size={15}/> Delete list</button></div>}
  {editing&&<ListEditor hunt={hunt} mutate={mutate} busy={busy} done={()=>setEditing(false)}/>}
  <p><strong>{board.count}</strong> tried so far{board.best?<> · best by stars: <strong>{board.best.title}</strong> ({huntAverage(board.best)} out of 5)</>:''}</p>
  {Object.keys(board.favourites).length>0&&<ul className="hunt-favs">{Object.entries(board.favourites).map(([n,e])=><li key={n}><strong>{n}</strong>’s favourite: {e.title} <small>({starText(e.ratings[n])}★)</small></li>)}</ul>}
  {!form&&<div className="row wrap"><button className="primary" onClick={()=>setForm({})}><Plus size={16}/> Add one we tried</button>
   <button onClick={()=>setForm({want:true})}><Search size={16}/> Add one to look for</button></div>}
  {form&&<EntryForm key={form.id||(form.want?'want':'tried')} state={state} user={user} hunt={hunt} editing={form.id?form:null} want={!!form.want} mutate={mutate} busy={busy} done={()=>setForm(null)}/>}
  {wants.length>0&&<section className="hunt-wants"><h2>Still to find ({wants.length})</h2>
   <ul>{wants.map(e=><li key={e.id}><div><strong>{e.title}</strong><Where state={state} entry={e}/>{e.note&&<small>{e.note}</small>}</div>
    <div className="row">{!e.pending&&<button className="primary" disabled={busy} onClick={()=>mutate({type:'huntTried',id:e.id,done:true,by:user.name})}><Check size={15}/> Tried it</button>}
     {!e.pending&&(parent||e.by===user.name)&&<><button aria-label={`Change ${e.title}`} onClick={()=>setForm(e)}><Pencil size={15}/></button>
      <button aria-label={`Remove ${e.title}`} disabled={busy} onClick={()=>remove({type:'huntRemove',id:e.id},restoreEntry(e,user),`${e.title} taken off the list.`)}><Trash2 size={15}/></button></>}</div></li>)}</ul>
  </section>}
  {board.count>0&&<h2>Tried ({board.count})</h2>}
  {board.count>0&&<div className="hunt-views">
   <div className="segmented" role="tablist">{[['stars','Stars'],['family','Family ranking'],['mine','My order']].map(([id,label])=>
    <button key={id} role="tab" aria-selected={view===id} className={view===id?'primary':''} onClick={()=>setView(id)}>{label}</button>)}</div>
   {cities.length>1&&view!=='mine'&&<label>Where<select value={city} onChange={e=>setCity(e.target.value)}><option value="">Everywhere</option>{cities.map(c=><option key={c}>{c}</option>)}</select></label>}
  </div>}
  {view==='mine'&&<MyOrder state={state} user={user} hunt={hunt} entries={board.entries} mutate={mutate} busy={busy}/>}
  {view==='family'&&<>
   <p><small>{family.people.length?`Worked out from ${family.people.join(', ')}’s own order${family.people.length>1?'s':''}. Put yours in order under My order.`:'Nobody has put this list in order yet. Do yours under My order.'}</small></p>
   <ol className="rank-list">{family.ranked.filter(r=>here(r.entry)).map((r,i)=><li key={r.entry.id}><span className="rank-pos">{r.score===null?'–':i+1}</span>
    <div className="rank-body"><strong>{i===0&&r.score!==null&&<Crown size={15} aria-label="Top of the family ranking"/>} {r.entry.title}</strong><Where state={state} entry={r.entry}/>
     {r.votes>0&&<small>In {r.votes} {r.votes===1?'list':'lists'}{huntAverage(r.entry)!==null?` · ${huntAverage(r.entry)}★`:''}</small>}</div></li>)}</ol>
  </>}
  {view==='stars'&&<ol className="hunt-list">{entries.map((e,i)=>{const avg=huntAverage(e),mine=e.by===user.name,shown=open.has(e.id);return <li key={e.id} className={`${i===0&&avg!==null?'top':''} ${shown?'open':''}`}>
   <div className="hunt-head">
    <div><strong>{i===0&&avg!==null&&<Crown size={15} aria-label="Best so far"/>} {e.title}</strong>
     <Where state={state} entry={e}/>
     {shown&&e.note&&<small>{e.note}</small>}</div>
    <div className="hunt-avg">{avg!==null?<><strong>{avg}</strong><small>out of 5</small></>:<small>not rated</small>}</div>
    <button type="button" className="hunt-toggle" aria-expanded={shown} aria-label={`${shown?'Fold':'Open'} ${e.title}`} onClick={()=>toggle(e.id)}><ChevronDown size={18}/></button>
   </div>
   {shown&&<><div className="hunt-ratings">{(state.members||[]).map(n=><div key={n} className="hunt-rating"><span>{n}</span>
    <Stars value={(e.ratings||{})[n]||0} disabled={busy||e.pending||(!parent&&n!==user.name)} label={`${n}’s rating for ${e.title}`}
     onPick={v=>mutate({type:'huntRate',id:e.id,person:n,rating:v,by:user.name})}/></div>)}</div>
   {!e.pending&&(parent||mine)&&<div className="row"><button aria-label={`Change ${e.title}`} onClick={()=>setForm(e)}><Pencil size={15}/></button>
    <button aria-label={`Put ${e.title} back to still to find`} disabled={busy} onClick={()=>{if(confirm(`Put ${e.title} back on the list to find? It leaves everybody’s order.`))mutate({type:'huntTried',id:e.id,done:false,by:user.name});}}><Search size={15}/></button>
    <button aria-label={`Remove ${e.title}`} disabled={busy} onClick={()=>remove({type:'huntRemove',id:e.id},restoreEntry(e,user),`${e.title} taken off the list.`)}><Trash2 size={15}/></button></div>}</>}
  </li>;})}</ol>}
 </>;
}
export default function Hunts({state,user,mutate,busy,remove}){
 const [open,setOpen]=useState(null),[adding,setAdding]=useState(false),[title,setTitle]=useState(''),[icon,setIcon]=useState(''),[hint,setHint]=useState('');
 const hunt=open&&findHunt(state,open),tripAhead=!!state.days?.length&&japanDate()<state.days[0].date;
 if(hunt)return <HuntPage state={state} user={user} hunt={hunt} mutate={mutate} busy={busy} back={()=>setOpen(null)} remove={remove}/>;
 async function create(e){e.preventDefault();if(await mutate({type:'huntNew',title,icon,hint}))(setAdding(false),setTitle(''),setIcon(''),setHint(''));}
 return <>
  <p className="eyebrow">WHICH ONE WAS BEST?</p>
  <h1>Hunts & lists</h1>
  <p>Every matcha, every gachapon, every bowl of ramen, and any list of our own.</p>
 <HowThisWorks><p>Add each one we try, tag where it was, give it stars, and drag your own list into order.</p></HowThisWorks>
  {state.members.includes(user?.name)&&<section className="hunt-picks" aria-label="Your picks">
   <h2>{user.name}’s picks</h2><p>{tripAhead?'Before we fly, pick the hunts you want to do. Everyone can see who picked what.':'The hunts you picked. Change them whenever you like.'}</p>
   <div className="chips">{allHunts(state).map(h=>{const on=!!huntState(state).picks?.[user.name]?.[h.id];return <button type="button" key={h.id} className={`chip${on?' on':''}`} aria-pressed={on} disabled={busy} onClick={()=>mutate({type:'huntPick',person:user.name,hunt:h.id,picked:!on})}><span aria-hidden="true">{h.icon}</span> {h.title}</button>;})}</div>
  </section>}
  <div className="hunt-grid">{allHunts(state).map(h=>{const b=huntBoard(state,h.id),who=huntPickers(state,h.id);return <button key={h.id} className="hunt-card" onClick={()=>setOpen(h.id)}>
   <span className="hunt-icon" aria-hidden="true">{h.icon}</span><strong>{h.title}</strong>
   <small>{b.count||b.wants?[b.count&&`${b.count} tried`,b.wants&&`${b.wants} to find`].filter(Boolean).join(' · '):'None yet'}{h.by?` · ${h.by}’s list`:''}</small>
   {b.best&&<small className="hunt-best"><Crown size={12}/> {b.best.title}</small>}
   {who.length>0&&<small className="hunt-pickers">Picked by {who.join(', ')}</small>}
  </button>;})}</div>
  {!adding&&<button onClick={()=>setAdding(true)}><Plus size={16}/> Make our own list</button>}
  {adding&&<form className="feature-card" onSubmit={create}>
   <label>What is the list<input required maxLength={60} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Melon pan, taiyaki, best temples, train stamps"/></label>
   <label>An emoji for it (if you like)<input maxLength={16} value={icon} onChange={e=>setIcon(e.target.value)} placeholder="🥐"/></label>
   <label>What it is for (if you like)<input maxLength={200} value={hint} onChange={e=>setHint(e.target.value)} placeholder="Every melon pan we eat, bakery by bakery"/></label>
   <div className="row wrap"><button className="primary" disabled={busy}>Start it</button><button type="button" onClick={()=>setAdding(false)}>Cancel</button></div>
  </form>}
 </>;
}
