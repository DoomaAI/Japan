import React,{useState,useEffect,useRef} from 'react';
import PageTitle from './PageTitle.jsx';
import {ListChecks,ShoppingBag,Plus,Trash2,CalendarDays,ChevronRight,Inbox,PiggyBank,Sparkles,ArrowUpDown} from 'lucide-react';
import Dictate from './Dictate.jsx';
import {InBar} from './home-bar.js';
import {parseCaptureLocally,CAPTURE_MAX} from './capture-data.js';
import {japanDate,japanClock} from './timing.js';
import {dayLabel} from './AdventurePages.jsx';
import {TODO_KINDS,todos,todosFor,todoProgress,unallocatedTodos,sortTodos,BOYS,spending} from './trip-features.js';
import {useListWobble,inOrder,listOrder} from './wobble-list.jsx';
// The list in the order the family dragged it into (wobble-list.jsx), ticked-off jobs still
// sinking below the ones left to do; and every job in that order, for a drag to be saved into.
const arranged=(state,list)=>[...inOrder(list,listOrder(state,'todos'))].sort((a,b)=>(!!a.doneAt)-(!!b.doneAt));
const allArranged=state=>arranged(state,sortTodos(todos(state))).map(t=>t.id);
const saveOrder=(mutate,user)=>ids=>mutate({type:'listOrder',list:'todos',ids,by:user.name});
const KindIcon=({kind,...props})=>kind==='buy'?<ShoppingBag {...props}/>:<ListChecks {...props}/>;
// One row, used on the day panel and on the full list, so a job looks the same wherever it is
// ticked off. Anyone can tick; the wording and the bin are a parent's.
function TodoRow({item,user,mutate,busy,onEdit,showDay,state,remove,drag}){
 const parent=user.role==='parent',done=!!item.doneAt;
 // A boy's own thing to buy can be handed straight to his spending money, where it is counted
 // against what he actually has. Offered once: something already over there is not offered again.
 const boy=BOYS.includes(user.name)?user.name:null;
 const toBuy=state&&boy&&item.kind==='buy'&&!done&&[boy,'Family'].includes(item.person)
  &&!spending(state).items.some(i=>i.todoId===item.id);
 return <div {...drag} className={`todo-row ${done?'done':''} ${drag?.className||''}`}>
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
    onClick={()=>remove({type:'todoRemove',id:item.id},{type:'todoAdd',title:item.title,kind:item.kind,day:item.day,person:item.person,notes:item.notes,at:item.createdAt},`“${item.title}” taken off the list.`)}><Trash2 size={16}/></button>
  </div>}
 </div>;
}
// The day's own jobs, on the day's own screen. Quick-add sits inside it, because the moment you
// remember to post the postcards is the moment you are looking at the day you will post them.
export function DayTodos({state,user,day,mutate,busy,go}){
 const [adding,setAdding]=useState(false);
 const list=arranged(state,todosFor(state,day)),{done,total}=todoProgress(state,day);
 const w=useListWobble({ids:list.map(t=>t.id),full:allArranged(state),save:saveOrder(mutate,user)});
 async function add(e){
  // Hold the form itself: React has let go of the event by the time the save comes back.
  e.preventDefault();const form=e.currentTarget,f=new FormData(form);
  if(await mutate({type:'todoAdd',title:f.get('title'),kind:f.get('kind'),day,person:'Family',by:user.name})){form.reset();setAdding(false);}
 }
 if(!total&&!adding)return <div className="day-todos empty-todos">
  <span><ListChecks size={16}/>Nothing to do or buy on this day.</span>
  <button onClick={()=>setAdding(true)}><Plus size={16}/>Add something</button>
 </div>;
 return <section className="day-todos wobble-list" aria-label="Things to do or buy on this day" {...w.listProps}>
  <InBar fallback={<div className="section-heading">
   <div><p className="eyebrow">THINGS TO DO OR BUY</p><h2>{done} of {total} ticked off</h2></div>
   <span className="row">{w.toggle}<button onClick={()=>setAdding(a=>!a)}><Plus size={16}/>Add</button></span>
  </div>}><span className="bar-note">{done} of {total} ticked off</span>{w.toggle}<button onClick={()=>setAdding(a=>!a)}><Plus size={16}/>Add</button></InBar>
  {w.bar}
  {list.map(item=><TodoRow key={item.id} item={item} state={state} user={user} mutate={mutate} busy={busy} drag={w.row(item.id)}/>)}
  {adding&&<form className="todo-add" onSubmit={add}>
   <input name="title" required maxLength={250} autoFocus placeholder="Post the postcards · buy a SIM at the airport"/>
   <select name="kind" defaultValue="do" aria-label="Kind">{TODO_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
   <button className="primary" disabled={busy}>Add to this day</button>
   <button type="button" onClick={()=>setAdding(false)}>Cancel</button>
  </form>}
  {go&&<button className="todo-all" onClick={()=>go('todo')}>The whole list<ChevronRight size={16}/></button>}
 </section>;
}
// One line, said or typed, and the form fills itself in. Claude reads it when there is signal
// and a key; the phone's own parser reads it otherwise, so the box works in a tunnel too. Either
// way nothing is saved here: the parsed job opens in the ordinary form to be looked at first.
export function CaptureBox({state,day,request,online,onParsed,first=null,clearFirst}){
 const [text,setText]=useState(first?.text||''),[busy,setBusy]=useState(false),box=useRef(null);
 // Arriving by Shortcut: a line already dictated is sorted out straight away; a bare "say it"
 // puts the cursor in the box. Either way the request is used up so it does not run again.
 useEffect(()=>{if(!first)return;clearFirst?.();if(first.text)sortIt();else if(first.focus)box.current?.focus();},[]);
 async function sortIt(e){
  e?.preventDefault();const said=(e?text:(first?.text||text)).trim();if(!said)return;
  setBusy(true);
  let parsed;
  try{parsed=online&&request?await request('capture',{text:said,day}):null;}catch{parsed=null;}
  if(!parsed)parsed=parseCaptureLocally(said,state,japanDate());
  setBusy(false);
  if(!parsed.title){parsed={...parsed,title:said.slice(0,250)};}
  setText('');onParsed({...parsed,said});
 }
 return <form className="capture-box" onSubmit={sortIt} aria-label="Say what needs doing">
  <label>Just say it<input ref={box} value={text} maxLength={CAPTURE_MAX} onChange={e=>setText(e.target.value)} placeholder="Buy Nate a rain poncho tomorrow · post the postcards in Kyoto"/></label>
  <div className="row wrap">
   <Dictate onText={heard=>setText(t=>(t?`${t} `:'')+heard)} label="Say it" what="the job, who it is for and which day"/>
   <button className="primary" disabled={busy||!text.trim()}><Sparkles size={16}/>{busy?'Sorting it out…':'Sort it out'}</button>
  </div>
  <small>{online&&request?'The day, who it is for and what kind get filled in for you; check them, then add it.':'No signal: the phone fills in what it can, and you check the rest.'}</small>
 </form>;
}
// One heading's worth of the full list. Every group shares one wobble, so holding a job under
// any day sets them all going; a job is dragged only among its own day's.
function TodoGroup({state,list,full,user,mutate,editing,setEditing,children,...row}){
 const w=useListWobble({ids:list.map(t=>t.id),full,save:saveOrder(mutate,user),editing,setEditing});
 return <section className="todo-group wobble-list" {...w.listProps}>
  {children}
  {list.map(item=><TodoRow key={item.id} item={item} state={state} user={user} mutate={mutate} drag={w.row(item.id)} {...row}/>)}
 </section>;
}
export default function TodoList({state,user,mutate,busy,go,day=null,remove,request,online=true,sayFirst=null,clearSayFirst}){
 const [edit,setEdit]=useState(null),[kind,setKind]=useState(''),[person,setPerson]=useState(''),[show,setShow]=useState('open'),[arranging,setArranging]=useState(false);
 const parent=user.role==='parent';
 const match=t=>(!kind||t.kind===kind)&&(!person||t.person===person)&&(show==='all'||(show==='done'?!!t.doneAt:!t.doneAt));
 const loose=arranged(state,unallocatedTodos(state).filter(match));
 const byDay=state.days.map(d=>({day:d,list:arranged(state,todosFor(state,d.date).filter(match))})).filter(g=>g.list.length);
 const full=allArranged(state),shared={state,full,user,mutate,busy,editing:arranging,setEditing:setArranging,onEdit:setEdit,remove};
 const many=loose.length+byDay.reduce((n,g)=>n+g.list.length,0)>1;
 const all=todos(state),open=all.filter(t=>!t.doneAt).length;
 async function save(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:edit.id?'todoEdit':'todoAdd',id:edit.id,title:f.get('title'),kind:f.get('kind'),
   day:f.get('day')||null,person:f.get('person'),notes:f.get('notes'),by:user.name}))setEdit(null);
 }
 return <><p className="eyebrow">THE LITTLE THINGS, WRITTEN DOWN</p><PageTitle help={<><p>Things we want to do or buy.</p><p>Put a day on one and it shows up on that day’s screen, where you will actually be standing when it matters. Anyone can add one and anyone can tick it off, with no signal needed.</p></>}>To-do list</PageTitle>
 <button className="primary" onClick={()=>setEdit({kind:'do',day:'',person:'Family',title:'',notes:''})}><Plus size={18}/>Add something</button>
 {!edit&&<CaptureBox state={state} day={day} request={request} online={online} first={sayFirst} clearFirst={clearSayFirst} onParsed={p=>setEdit({kind:p.kind,day:p.day||'',person:p.person,title:p.title,notes:p.notes||'',said:p.said,via:p.via})}/>}
 <div className="document-filters">
  <div className="form-row">
   <label>Show<select value={show} onChange={e=>setShow(e.target.value)}><option value="open">Still to do</option><option value="done">Ticked off</option><option value="all">Everything</option></select></label>
   <label>Kind<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">Both</option>{TODO_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>For<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Anyone</option><option>Family</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  </div>
 </div>
 <div className="list-count"><p><strong>{open} still to do</strong> of {all.length}</p>{many&&<button type="button" data-wobble-tool className={`list-reorder${arranging?' on':''}`} aria-pressed={arranging} onClick={()=>setArranging(!arranging)}><ArrowUpDown size={15}/>{arranging?'Done':'Reorder'}</button>}</div>
 {arranging&&<div className="wobble-done" role="status"><small>Drag a job to the line where it should go, within its own day. Tap outside the list to finish.</small></div>}
 {!!loose.length&&<TodoGroup list={loose} {...shared}>
  <h2>No day yet</h2>
  <p><small>Before we go, or whenever it fits. Give one a day to have it show on that day. Hold one to put the list in order.</small></p>
 </TodoGroup>}
 {byDay.map(({day:d,list})=><TodoGroup key={d.date} list={list} showDay={false} {...shared}>
  <h2>{dayLabel(d.date)} · {d.city}</h2>
  <p><small>{d.title}</small></p>
 </TodoGroup>)}
 {!loose.length&&!byDay.length&&<div className="empty"><Inbox/><h2>{all.length?'Nothing matches those filters.':'Nothing on the list.'}</h2><p>{all.length?'Try Everything, or a different kind.':'Write down the small things — post the postcards, buy a SIM at the airport, charge the power banks — and put a day on the ones that belong to one.'}</p></div>}
 {edit&&<form key={edit.id||'new'} className="feature-card" onSubmit={save}>
  <h2>{edit.id?'Edit this one':edit.said?'Check it, then add it':'Add something'}</h2>
  {edit.said&&<p className="hint"><small>You said “{edit.said}”. {edit.via==='claude'?'Filled in for you — change anything it got wrong.':'Filled in on this phone — change anything it got wrong.'}</small></p>}
  <label>What needs doing?<input name="title" required maxLength={250} defaultValue={edit.title||''} placeholder="Post the postcards · buy a SIM at the airport"/></label>
  <div className="form-row">
   <label>Kind<select name="kind" defaultValue={edit.kind}>{TODO_KINDS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>For<select name="person" defaultValue={edit.person}><option>Family</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
  </div>
  {/* A new item starts on the day being looked at, which is nearly always the day it is for;
      an item being edited keeps whatever day it already has, including none. */}
  <label>Which day<select name="day" defaultValue={edit.id?edit.day||'':edit.day||(state.days.some(d=>d.date===day)?day:'')}><option value="">No day yet</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
  <label>Notes<textarea name="notes" maxLength={2000} defaultValue={edit.notes||''} placeholder="Which post office, how many stamps, what size"/></label>
  <div className="row wrap"><button className="primary" disabled={busy}>{edit.id?'Save':'Add it'}</button><button type="button" onClick={()=>setEdit(null)}>Cancel</button></div>
 </form>}
 {go&&BOYS.includes(user.name)&&<p className="callout"><PiggyBank size={18}/><span>Something you are buying with your own money belongs on your <button onClick={()=>go('spending')}>Spending money</button>, where it counts against what you actually have.</span></p>}
 {go&&<p className="callout"><ShoppingBag size={18}/><span>For a proper shop — budgets, quantities, which shop and a link — use the <button onClick={()=>go('shopping')}>Shopping list</button>. This one is for the small things you just need to remember.</span></p>}
 </>;
}
