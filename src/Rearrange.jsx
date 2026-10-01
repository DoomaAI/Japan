import React,{useState} from 'react';
import {ArrowUp,ArrowDown,ArrowLeftRight,LockKeyhole,RotateCcw,Check} from 'lucide-react';
import {dayBegun,withGroupMates,undoOrder} from './day-moves.js';
// Moving more than one stop at a time. Whole days are swapped, or put in a new order; or some of a
// day's stops are ticked and moved to another day, or traded for stops ticked there. The choices
// are made with selects and tick boxes rather than by dragging, so a whole day can be moved
// one-handed on a platform, and the change is shown before it is made. Both kinds can be undone
// from the message that follows.
export default function Rearrange({state,day,busy,mutate,notice,dayLabel,close}){
 const [mode,setMode]=useState('days');
 return <div className="rearrange">
  <label>What to rearrange<select value={mode} onChange={e=>setMode(e.target.value)}>
   <option value="days">Whole days</option>
   <option value="stops">Some stops from a day</option>
  </select></label>
  {mode==='days'?<WholeDays state={state} day={day} busy={busy} mutate={mutate} notice={notice} dayLabel={dayLabel} close={close}/>:<SomeStops state={state} day={day} busy={busy} mutate={mutate} notice={notice} dayLabel={dayLabel} close={close}/>}
 </div>;
}

const dayName=(state,dayLabel,date)=>{const i=state.days.findIndex(d=>d.date===date);return `Day ${i+1} · ${dayLabel(date)}`;};

function WholeDays({state,day,busy,mutate,notice,dayLabel,close}){
 const dates=state.days.map(d=>d.date),byDate=new Map(state.days.map(d=>[d.date,d]));
 const open=dates.filter(d=>!dayBegun(state,d));
 const [how,setHow]=useState('swap');
 const first=open.includes(day)?day:open[0]||'';
 const [a,setA]=useState(first);
 const [b,setB]=useState(open.find(d=>d>first)||open.find(d=>d!==first)||'');
 const [order,setOrder]=useState(dates);
 const [locked,setLocked]=useState('stay');
 const proposed=how==='swap'?dates.map(d=>d===a?b:d===b?a:d):order;
 const moves=dates.map((to,i)=>({from:proposed[i],to})).filter(m=>m.from&&m.from!==m.to);
 const blocked=moves.flatMap(m=>[m.from,m.to]).filter(d=>dayBegun(state,d));
 const lockedCount=[...new Set(moves.map(m=>m.from))].reduce((n,d)=>n+state.steps.filter(s=>s.day===d&&s.locked).length,0);
 const shift=(i,by)=>{const j=i+by;if(j<0||j>=order.length)return;const next=[...order];[next[i],next[j]]=[next[j],next[i]];setOrder(next);};
 const place=(i,to)=>{const next=[...order],[d]=next.splice(i,1);next.splice(to,0,d);setOrder(next);};
 async function apply(){
  const moveLocked=locked==='move';
  if(!await mutate({type:'orderDays',order:proposed,moveLocked}))return;
  const back=undoOrder(dates,proposed);
  notice({text:moves.length===2&&how==='swap'?`${byDate.get(a).title} and ${byDate.get(b).title} swapped days.`:`${moves.length} days moved.`,undo:async()=>{if(await mutate({type:'orderDays',order:back,moveLocked}))notice('The days are back where they were.');}});
  close();
 }
 const option=d=><option key={d} value={d} disabled={dayBegun(state,d)}>{dayName(state,dayLabel,d)} · {byDate.get(d).title}{dayBegun(state,d)?' (begun)':''}</option>;
 return <>
  <p>The dates and hotels stay put; each day’s name, city, guide pages and stops move. A day that has begun stays where it is.</p>
  <label>How<select value={how} onChange={e=>setHow(e.target.value)}>
   <option value="swap">Swap two days</option>
   <option value="order">Put the days in a new order</option>
  </select></label>
  {how==='swap'?<div className="form-row">
   <label>This day<select value={a} onChange={e=>setA(e.target.value)}>{dates.map(option)}</select></label>
   <ArrowLeftRight size={18} aria-hidden="true"/>
   <label>With this day<select value={b} onChange={e=>setB(e.target.value)}>{dates.map(option)}</select></label>
  </div>:<>
   <ol className="rearrange-order">{order.map((d,i)=>{const fixed=dayBegun(state,d);return <li key={d} className={d!==dates[i]?'moved':''}>
    <span><small>{dayName(state,dayLabel,dates[i])}</small><strong>{byDate.get(d).title}</strong>{d!==dates[i]&&<small>was {dayLabel(d)}</small>}{fixed&&<small>Begun — stays put</small>}</span>
    <span className="rearrange-tools">
     <select aria-label={`Move ${byDate.get(d).title} to`} value={i} disabled={busy||fixed} onChange={e=>place(i,Number(e.target.value))}>{dates.map((x,j)=><option key={x} value={j}>Day {j+1}</option>)}</select>
     <button type="button" className="icon" disabled={busy||fixed||i===0} aria-label={`Move ${byDate.get(d).title} earlier`} onClick={()=>shift(i,-1)}><ArrowUp size={16}/></button>
     <button type="button" className="icon" disabled={busy||fixed||i===order.length-1} aria-label={`Move ${byDate.get(d).title} later`} onClick={()=>shift(i,1)}><ArrowDown size={16}/></button>
    </span>
   </li>;})}</ol>
   <button type="button" disabled={busy||order.every((d,i)=>d===dates[i])} onClick={()=>setOrder(dates)}><RotateCcw size={16}/>Start again</button>
  </>}
  {lockedCount>0&&<label>Stops with booked times ({lockedCount})<select value={locked} onChange={e=>setLocked(e.target.value)}>
   <option value="stay">Stay on their date — the booking is for that day</option>
   <option value="move">Move with their day — I’ll change the bookings</option>
  </select></label>}
  {moves.length>0&&<div className="rearrange-preview"><strong>After the change</strong><ul>{moves.map(m=><li key={m.to}>{dayName(state,dayLabel,m.to)}: {byDate.get(m.from).title} <small>(from {dayLabel(m.from)})</small></li>)}</ul></div>}
  {blocked.length>0&&<p className="callout">{[...new Set(blocked)].map(dayLabel).join(', ')} {new Set(blocked).size===1?'has':'have'} begun and can’t move.</p>}
  <div className="row wrap"><button type="button" className="primary" disabled={busy||!moves.length||blocked.length>0} onClick={apply}><Check size={18}/>{how==='swap'?'Swap these days':'Use this order'}</button><button type="button" onClick={close}>Cancel</button></div>
 </>;
}

function SomeStops({state,day,busy,mutate,notice,dayLabel,close}){
 const dates=state.days.map(d=>d.date);
 const [from,setFrom]=useState(dates.includes(day)?day:dates[0]);
 const [to,setTo]=useState(dates.find(d=>d>from&&!dayBegun(state,d))||dates.find(d=>d!==from&&!dayBegun(state,d))||dates.find(d=>d!==from));
 const [picked,setPicked]=useState([]);
 const [action,setAction]=useState('move');
 const [back,setBack]=useState([]);
 const [moveLocked,setMoveLocked]=useState(false);
 const stopsOn=d=>state.steps.filter(s=>s.day===d).sort((a,b)=>a.order-b.order);
 const going=withGroupMates(state,picked),coming=action==='swap'?withGroupMates(state,back):[];
 const anyLocked=[...going,...coming].some(s=>s.locked);
 const pickFrom=d=>{setFrom(d);setPicked([]);if(d===to){setTo(dates.find(x=>x!==d));setBack([]);}};
 const pickTo=d=>{setTo(d);setBack([]);};
 async function apply(){
  const swapIds=action==='swap'?back:[];
  if(!await mutate({type:'moveSteps',ids:picked,to,swapIds,moveLocked}))return;
  const what=going.length===1?going[0].title:`${going.length} stops`;
  notice({text:coming.length?`${what} swapped with ${coming.length===1?coming[0].title:`${coming.length} stops`} on ${dayLabel(to)}.`:`${what} moved to ${dayLabel(to)}.`,
   undo:async()=>{if(await mutate({type:'moveSteps',ids:going.map(s=>s.id),to:from,swapIds:coming.map(s=>s.id),moveLocked}))notice('Back where they were.');}});
  close();
 }
 const daySelect=(value,set,skip)=><select value={value} onChange={e=>set(e.target.value)}>{dates.map(d=><option key={d} value={d} disabled={d===skip}>{dayName(state,dayLabel,d)} · {state.days.find(x=>x.date===d).title}</option>)}</select>;
 return <>
  <p>Tick the stops to move. Times stay the same and each stop is slotted in by its time; an option goes with its alternatives.</p>
  <label>From{daySelect(from,pickFrom)}</label>
  <StopPicker steps={stopsOn(from)} value={picked} onChange={setPicked} busy={busy}/>
  <div className="form-row">
   <label>Action<select value={action} onChange={e=>setAction(e.target.value)}>
    <option value="move">Move them to</option>
    <option value="swap">Swap them with stops on</option>
   </select></label>
   <label>Day{daySelect(to,pickTo,from)}</label>
  </div>
  {action==='swap'&&<StopPicker steps={stopsOn(to)} value={back} onChange={setBack} busy={busy}/>}
  {anyLocked&&<label className="checkline"><input type="checkbox" checked={moveLocked} onChange={e=>setMoveLocked(e.target.checked)}/>Move booked stops too — I’ll change the bookings</label>}
  <div className="row wrap"><button type="button" className="primary" disabled={busy||!picked.length||(action==='swap'&&!back.length)||(anyLocked&&!moveLocked)} onClick={apply}><Check size={18}/>{action==='swap'?`Swap ${going.length} for ${coming.length}`:`Move ${going.length} stop${going.length===1?'':'s'}`}</button><button type="button" onClick={close}>Cancel</button></div>
 </>;
}

// A tick box per stop, with one to tick them all. Stops that are done or under way stay where they are.
function StopPicker({steps,value,onChange,busy}){
 const movable=steps.filter(s=>s.status!=='done'&&s.status!=='started');
 const all=movable.length>0&&movable.every(s=>value.includes(s.id));
 const toggle=(id,on)=>onChange(on?[...value,id]:value.filter(x=>x!==id));
 if(!steps.length)return <p className="rearrange-empty">No stops on this day.</p>;
 return <fieldset className="stop-picker">
  <label className="checkline"><input type="checkbox" checked={all} disabled={busy||!movable.length} onChange={e=>onChange(e.target.checked?movable.map(s=>s.id):[])}/><strong>All stops that can move</strong></label>
  {steps.map(s=>{const fixed=s.status==='done'||s.status==='started';return <label className="checkline" key={s.id}>
   <input type="checkbox" checked={value.includes(s.id)} disabled={busy||fixed} onChange={e=>toggle(s.id,e.target.checked)}/>
   <span>{s.time||'—'} · {s.title}{s.option?` (${s.option})`:''}{s.locked&&<LockKeyhole size={12} aria-label=" booked time"/>}{fixed&&<small> · {s.status==='done'?'done':'under way'}</small>}</span>
  </label>;})}
 </fieldset>;
}
