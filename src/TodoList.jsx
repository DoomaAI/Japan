import React,{useState} from 'react';
import {ListChecks,ShoppingBag,Plus,Trash2,CalendarDays,ChevronRight,Inbox,PiggyBank} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {TODO_KINDS,todos,todosFor,todoProgress,unallocatedTodos,BOYS,spending} from './trip-features.js';
import {japanClock} from './timing.js';
const KindIcon=({kind,...props})=>kind==='buy'?<ShoppingBag {...props}/>:<ListChecks {...props}/>;
// One row, used on the day panel and on the full list, so a job looks the same wherever it is
// ticked off. Anyone can tick; the wording and the bin are a parent's.
function TodoRow({item,user,mutate,busy,onEdit,showDay,state}){
 const parent=user.role==='parent',done=!!item.doneAt;
 // A boy's own thing to buy can be handed straight to his spending money, where it is counted
 // against what he actually has. Offered once: something already over there is not offered again.
 const boy=BOYS.includes(user.name)?user.name:null;
 const toBuy=state&&boy&&item.kind==='buy'&&!done&&[boy,'Family'].includes(item.person)
  &&!spending(state).items.some(i=>i.todoId===item.id);
 return <div className={`todo-row ${done?'done':''}`}>
  <label className="todo-tick">
   <input type="checkbox" checked={done} disabled={busy}
    onChange={e=>mutate({type:'todoStatus',id:item.id,done:e.target.checked,by:user.name})}
    aria-label={`${done?'Untick':'Tick off'} ${item.title}`}/>
  </label>
  <div className="todo-body">
   <strong><KindIcon kind={item.kind} size={15}/>{item.title}</strong>
   <small>{item.person==='Family'?'All of us':`For ${item.person}`}
    {showDay&&` · ${item.day?dayLabel(item.day):'No day yet'}`}
    {item.pending?' · Waiting to sync':done?` · Done by ${item.doneBy}${item.doneAt?` at ${japanClock(new Date(item.doneAt))}`:''}`:''}</small>
   {item.notes&&<p>{item.notes}</p>}
   {toBuy&&<button className="todo-tospend" disabled={busy}
    onClick={()=>mutate({type:'spendAdd',person:boy,title:item.title,notes:item.notes,day:item.day,todoId:item.id,by:user.name})}>
    <PiggyBank size={15}/>Buy this with my spending money</button>}
  </div>
  {parent&&onEdit&&<div className="todo-actions">
   <button className="icon" aria-label={`Edit ${item.title}`} onClick={()=>onEdit(item)}><CalendarDays size={16}/></button>
   <button className="icon danger" aria-label={`Remove ${item.title}`} disabled={busy}
    onClick={()=>{if(confirm(`Take “${item.title}” off the list?`))mutate({type:'todoRemove',id:item.id});}}><Trash2 size={16}/></button>
  </div>}
 </div>;
}
// The day's own jobs, on the day's own screen. Quick-add sits inside it, because the moment you
// remember to post the postcards is the moment you are looking at the day you will post them.
export function DayTodos({state,user,day,mutate,busy,go}){
 const [adding,setAdding]=useState(false);
 const list=todosFor(state,day),{done,total}=todoProgress(state,day);
 async function add(e){
  // Hold the form itself: React has let go of the event by the time the save comes back.
  e.preventDefault();const form=e.currentTarget,f=new FormData(form);
  if(await mutate({type:'todoAdd',title:f.get('title'),kind:f.get('kind'),day,person:'Family',by:user.name})){form.reset();setAdding(false);}
 }
 if(!total&&!adding)return <div className="day-todos empty-todos">
  <span><ListChecks size={16}/>Nothing to do or buy on this day.</span>
  <button onClick={()=>setAdding(true)}><Plus size={16}/>Add something</button>
 </div>;
 return <section className="day-todos" aria-label="Things to do or buy on this day">
  <div className="section-heading">
   <div><p className="eyebrow">THINGS TO DO OR BUY</p><h2>{done} of {total} ticked off</h2></div>
   <button onClick={()=>setAdding(a=>!a)}><Plus size={16}/>Add</button>
  </div>
  {list.map(item=><TodoRow key={item.id} item={item} state={state} user={user} mutate={mutate} busy={busy}/>)}
  {adding&&<form className="todo-add" onSubmit={add}>
   <input name="title" required maxLength={250} autoFocus placeholder="Post the postcards · buy a SIM at the airport"/>
   <select name="kind" defaultValue="do" aria-label="Kind">{TODO_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
   <button className="primary" disabled={busy}>Add to this day</button>
   <button type="button" onClick={()=>setAdding(false)}>Cancel</button>
  </form>}
  {go&&<button className="todo-all" onClick={()=>go('todo')}>The whole list<ChevronRight size={16}/></button>}
 </section>;
}
export default function TodoList({state,user,mutate,busy,go}){
 const [edit,setEdit]=useState(null),[kind,setKind]=useState(''),[person,setPerson]=useState(''),[show,setShow]=useState('open');
 const parent=user.role==='parent';
 const match=t=>(!kind||t.kind===kind)&&(!person||t.person===person)&&(show==='all'||(show==='done'?!!t.doneAt:!t.doneAt));
 const loose=unallocatedTodos(state).filter(match);
 const byDay=state.days.map(d=>({day:d,list:todosFor(state,d.date).filter(match)})).filter(g=>g.list.length);
 const all=todos(state),open=all.filter(t=>!t.doneAt).length;
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:edit.id?'todoEdit':'todoAdd',id:edit.id,title:f.get('title'),kind:f.get('kind'),
   day:f.get('day')||null,person:f.get('person'),notes:f.get('notes'),by:user.name}))setEdit(null);
 }
 return <><p className="eyebrow">THE LITTLE THINGS, WRITTEN DOWN</p><h1>To-do list</h1>
 <p>Things we want to do or buy. Put a day on one and it shows up on that day’s screen, where you will actually be standing when it matters. Anyone can add one and anyone can tick it off, with no signal needed.</p>
 <button className="primary" onClick={()=>setEdit({kind:'do',day:'',person:'Family',title:'',notes:''})}><Plus size={18}/>Add something</button>
 <div className="document-filters">
  <div className="form-row">
   <label>Show<select value={show} onChange={e=>setShow(e.target.value)}><option value="open">Still to do</option><option value="done">Ticked off</option><option value="all">Everything</option></select></label>
   <label>Kind<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Both</option>{TODO_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>For<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Anyone</option><option>Family</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  </div>
 </div>
 <p><strong>{open} still to do</strong> of {all.length}</p>
 {!!loose.length&&<section className="todo-group">
  <h2>No day yet</h2>
  <p><small>Before we go, or whenever it fits. Give one a day to have it show on that day.</small></p>
  {loose.map(item=><TodoRow key={item.id} item={item} state={state} user={user} mutate={mutate} busy={busy} onEdit={setEdit}/>)}
 </section>}
 {byDay.map(({day:d,list})=><section className="todo-group" key={d.date}>
  <h2>{dayLabel(d.date)} · {d.city}</h2>
  <p><small>{d.title}</small></p>
  {list.map(item=><TodoRow key={item.id} item={item} state={state} user={user} mutate={mutate} busy={busy} onEdit={setEdit} showDay={false}/>)}
 </section>)}
 {!loose.length&&!byDay.length&&<div className="empty"><Inbox/><h2>{all.length?'Nothing matches those filters.':'Nothing on the list.'}</h2><p>{all.length?'Try Everything, or a different kind.':'Write down the small things — post the postcards, buy a SIM at the airport, charge the power banks — and put a day on the ones that belong to one.'}</p></div>}
 {edit&&<form key={edit.id||'new'} className="feature-card" onSubmit={save}>
  <h2>{edit.id?'Edit this one':'Add something'}</h2>
  <label>What needs doing?<input name="title" required maxLength={250} defaultValue={edit.title||''} placeholder="Post the postcards · buy a SIM at the airport"/></label>
  <div className="form-row">
   <label>Kind<select name="kind" defaultValue={edit.kind}>{TODO_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>For<select name="person" defaultValue={edit.person}><option>Family</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  </div>
  <label>Which day<select name="day" defaultValue={edit.day||''}><option value="">No day yet</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
  <label>Notes<textarea name="notes" maxLength={2000} defaultValue={edit.notes||''} placeholder="Which post office, how many stamps, what size"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save':'Add it'}</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>}
 {go&&BOYS.includes(user.name)&&<p className="callout"><PiggyBank size={18}/><span>Something you are buying with your own money belongs on your <button onClick={()=>go('spending')}>Spending money</button>, where it counts against what you actually have.</span></p>}
 {go&&<p className="callout"><ShoppingBag size={18}/><span>For a proper shop — budgets, quantities, which shop and a link — use the <button onClick={()=>go('shopping')}>Shopping list</button>. This one is for the small things you just need to remember.</span></p>}
 </>;
}
