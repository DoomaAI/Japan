import React,{useState} from 'react';
import {Plus,Pencil,Trash2,ChevronLeft,Crown} from 'lucide-react';
import {Stars} from './StepReview.jsx';
import {allHunts,findHunt,huntBoard,huntAverage} from './hunt-data.js';
import {dayLabel} from './AdventurePages.jsx';
import {japanDate} from './timing.js';
// The hunts: pick one, add what you tried, and everybody rates it. The best rises to the top.
function EntryForm({state,user,hunt,editing,mutate,busy,done}){
 const today=japanDate(),onTrip=state.days.some(d=>d.date===today);
 const [f,setF]=useState({title:editing?.title||'',place:editing?.place||'',day:editing?editing.day||'':onTrip?today:'',yen:editing?.yen??'',note:editing?.note||'',rating:0});
 const set=(k,v)=>setF(p=>({...p,[k]:v}));
 async function save(e){
  e.preventDefault();
  const yen=String(f.yen).trim()===''?null:Number(String(f.yen).replace(/[^\d]/g,''));
  const op={title:f.title,place:f.place,day:f.day||null,yen,note:f.note};
  const ok=editing?await mutate({type:'huntEdit',id:editing.id,...op})
   :await mutate({type:'huntAdd',hunt:hunt.id,...op,...(f.rating?{rating:f.rating}:{}),by:user.name});
  if(ok)done();
 }
 return <form className="feature-card" onSubmit={save}>
  <label>What was it<input required maxLength={120} value={f.title} onChange={e=>set('title',e.target.value)} placeholder={hunt.id==='gachapon'?'Tiny sushi keyring':hunt.id==='matcha'?'Iced matcha latte':'What it was called'}/></label>
  <label>Where<input maxLength={200} value={f.place} onChange={e=>set('place',e.target.value)} placeholder="The shop or stall"/></label>
  <label>Day<select value={f.day} onChange={e=>set('day',e.target.value)}><option value="">Not on a trip day</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)}</option>)}</select></label>
  <label>Price in yen (if you like)<input inputMode="numeric" value={f.yen} onChange={e=>set('yen',e.target.value)}/></label>
  <label>Note<input maxLength={1000} value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Too sweet, perfect, got a double…"/></label>
  {!editing&&<div><small>Your stars</small><Stars value={f.rating} onPick={n=>set('rating',n)} disabled={busy} label="Your rating"/></div>}
  <div className="row wrap"><button className="primary" disabled={busy}>{editing?'Save':'Add it'}</button><button type="button" onClick={done}>Cancel</button></div>
 </form>;
}
function HuntPage({state,user,hunt,mutate,busy,back}){
 const parent=user.role==='parent',[form,setForm]=useState(null);
 const board=huntBoard(state,hunt.id);
 return <>
  <button className="link-back" onClick={back}><ChevronLeft size={16}/> All hunts</button>
  <h1><span aria-hidden="true">{hunt.icon}</span> {hunt.title}</h1>
  {hunt.hint&&<p>{hunt.hint}.</p>}
  <p><strong>{board.count}</strong> tried so far{board.best?<> · best: <strong>{board.best.title}</strong> ({huntAverage(board.best)} out of 5)</>:''}</p>
  {Object.keys(board.favourites).length>0&&<ul className="hunt-favs">{Object.entries(board.favourites).map(([n,e])=><li key={n}><strong>{n}</strong>’s favourite: {e.title} <small>({e.ratings[n]}★)</small></li>)}</ul>}
  {!form&&<button className="primary" onClick={()=>setForm({})}><Plus size={16}/> Add one we tried</button>}
  {form&&<EntryForm state={state} user={user} hunt={hunt} editing={form.id?form:null} mutate={mutate} busy={busy} done={()=>setForm(null)}/>}
  <ol className="hunt-list">{board.entries.map((e,i)=>{const avg=huntAverage(e),mine=e.by===user.name;return <li key={e.id} className={i===0&&avg!==null?'top':''}>
   <div className="hunt-head">
    <div><strong>{i===0&&avg!==null&&<Crown size={15} aria-label="Best so far"/>} {e.title}</strong>
     <small>{[e.place,e.day&&dayLabel(e.day),Number.isInteger(e.yen)&&`¥${e.yen.toLocaleString()}`,`added by ${e.by}`].filter(Boolean).join(' · ')}{e.pending?' · waiting to sync':''}</small>
     {e.note&&<small>{e.note}</small>}</div>
    <div className="hunt-avg">{avg!==null?<><strong>{avg}</strong><small>out of 5</small></>:<small>not rated</small>}</div>
   </div>
   <div className="hunt-ratings">{(state.members||[]).map(n=><div key={n} className="hunt-rating"><span>{n}</span>
    <Stars value={(e.ratings||{})[n]||0} disabled={busy||e.pending||(!parent&&n!==user.name)} label={`${n}’s rating for ${e.title}`}
     onPick={v=>mutate({type:'huntRate',id:e.id,person:n,rating:v,by:user.name})}/></div>)}</div>
   {!e.pending&&(parent||mine)&&<div className="row"><button aria-label={`Change ${e.title}`} onClick={()=>setForm(e)}><Pencil size={15}/></button>
    <button aria-label={`Remove ${e.title}`} disabled={busy} onClick={()=>{if(confirm(`Take ${e.title} off the list?`))mutate({type:'huntRemove',id:e.id});}}><Trash2 size={15}/></button></div>}
  </li>;})}</ol>
 </>;
}
export default function Hunts({state,user,mutate,busy}){
 const [open,setOpen]=useState(null),[adding,setAdding]=useState(false),[title,setTitle]=useState(''),[icon,setIcon]=useState('');
 const hunt=open&&findHunt(state,open);
 if(hunt)return <HuntPage state={state} user={user} hunt={hunt} mutate={mutate} busy={busy} back={()=>setOpen(null)}/>;
 async function create(e){e.preventDefault();if(await mutate({type:'huntNew',title,icon}))(setAdding(false),setTitle(''),setIcon(''));}
 return <>
  <p className="eyebrow">WHICH ONE WAS BEST?</p>
  <h1>The hunts</h1>
  <p>Every matcha, every gachapon, every bowl of ramen. Add each one we try, everybody gives it stars, and the best rises to the top.</p>
  <div className="hunt-grid">{allHunts(state).map(h=>{const b=huntBoard(state,h.id);return <button key={h.id} className="hunt-card" onClick={()=>setOpen(h.id)}>
   <span className="hunt-icon" aria-hidden="true">{h.icon}</span><strong>{h.title}</strong>
   <small>{b.count?`${b.count} tried`:'None yet'}</small>
   {b.best&&<small className="hunt-best"><Crown size={12}/> {b.best.title}</small>}
  </button>;})}</div>
  {!adding&&<button onClick={()=>setAdding(true)}><Plus size={16}/> Start a new hunt</button>}
  {adding&&<form className="feature-card" onSubmit={create}>
   <label>What are we hunting<input required maxLength={60} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Melon pan, taiyaki, train stamps"/></label>
   <label>An emoji for it (if you like)<input maxLength={16} value={icon} onChange={e=>setIcon(e.target.value)} placeholder="🥐"/></label>
   <div className="row wrap"><button className="primary" disabled={busy}>Start it</button><button type="button" onClick={()=>setAdding(false)}>Cancel</button></div>
  </form>}
 </>;
}
