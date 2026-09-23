import React,{useRef,useState} from 'react';
import {Check,LockKeyhole,GripVertical,ArrowUp,ArrowDown,Plus,Trash2,Inbox} from 'lucide-react';
import {japanClock,scheduleVariance,doneClock,doneStamp} from './timing.js';
import {ticketList} from './trip-features.js';
import {underFinger,follow,settle} from './lift.js';
import {StepWeather} from './Weather.jsx';
export default function DayTimeline({steps,current,today,state,user,parent,busy,selectStep,mutate,notice,addStep,removeStep,optionStep}){
 const drag=useRef(null),[target,setTarget]=useState(null),[held,setHeld]=useState(null);
 const move=(id,to)=>{const ids=steps.map(s=>s.id),from=ids.indexOf(id);if(from<0||to<0||to>=ids.length||to===from)return;ids.splice(from,1);ids.splice(to,0,id);mutate({type:'reorder',day:today.date,ids});};
 // Ticking off is the one change the boys make themselves, so the rule here is the card's rule,
 // not the editing rule: whoever the stop is assigned to can tick it, and a parent can tick any.
 const mine=s=>parent||(s.participants||[]).includes(user?.name);
 // A stop is remembered as "between those two" — the coffee before the train, the walk we
 // forgot. So the gap itself is the button, and the form opens already knowing where the stop
 // goes, rather than adding it to the end of the day and leaving it to be dragged back up.
 const insert=(before,label)=>parent&&addStep?<button type="button" className={`timeline-insert${before?'':' end'}`} disabled={busy} aria-label={label} onClick={()=>addStep(before)}><Plus size={15}/>{before?null:<span>Add a stop</span>}</button>:null;
 // A stop can be added here, so it can be taken off here — the alternative was opening the whole
 // edit form to find the one button that deletes it. Nothing goes on the tap itself: it asks
 // first, because this is the one change to the day that cannot simply be made again.
 const drop=s=>parent&&removeStep?<button type="button" className="remove-stop" disabled={busy} aria-label={`Remove ${s.title} from this day`} onClick={()=>removeStep(s)}><Trash2 size={15}/></button>:null;
 // Beside it, the thing the family actually means most of the time: not today, but not gone. It
 // is its own icon rather than a step inside the removal, so nobody has to reach for the bin to
 // find it — and it goes on the tap, because Options is where a stop waits, not where it ends.
 const park=s=>parent&&optionStep?<button type="button" className="to-options" disabled={busy} aria-label={`Save ${s.title} to Options`} onClick={()=>optionStep(s)}><Inbox size={15}/></button>:null;
 // Ticking one off where the day is read, rather than swiping to its card first. The day at a
 // glance is where somebody standing in a queue looks, and "we've done that one" is the thing
 // they most often want to say.
 async function tick(s,done){
  // Counted before the change, because the tick is what sends them: a booking leaving the ticket
  // list unannounced is alarming to discover later and reassuring to be told about now.
  const at=new Date(),used=state?ticketList(state,{step:s,all:false}).length:0;
  if(!await mutate({type:'status',id:s.id,status:done?'done':'todo'}))return;
  if(!done){notice(`${s.title} is back on the list, with any tickets it marked used.`);return;}
  const variance=scheduleVariance(s,at);
  notice(`${s.title} completed ${japanClock(at)}${variance?`, ${variance.text}`:''}.${used?` ${used} ticket${used===1?'':'s'} marked used.`:''} Change the time below if it was finished earlier.`);
 }
 // The tick lands on the moment it was tapped, which is rarely the moment it happened: the phone
 // comes out of a pocket at the next station. So the time is editable where it is shown, by
 // whoever may tick it, rather than only inside a parent's edit form. It is saved when the field
 // is left rather than on every keystroke, because half-typed hours are valid times too.
 async function retime(s,clock){
  if(!clock)return;
  const at=doneStamp(s,clock);
  if(!Number.isFinite(at.getTime())){notice('Use a valid time.');return;}
  if(at.getTime()>Date.now()+60000){notice('That time is still ahead of us. Say when it was actually finished.');return;}
  if(doneClock(s)===clock)return;
  const variance=scheduleVariance(s,at);
  if(await mutate({type:'status',id:s.id,status:'done',at:at.toISOString()}))notice(`${s.title} finished ${clock}${variance?`, ${variance.text}`:''}.`);
 }
 return <aside className="timeline"><div className="section-heading"><h2>The day at a glance</h2><span>{today?.city}</span></div><details className="timeline-help"><summary>How this works</summary>Tick one off here as it happens; a completed stop steps back and carries the time it was finished, which can be corrected underneath it.{parent?' Drag a handle or use the arrows to reorder — target and booking times stay the same. Tap a gap to add a stop where it belongs, the tray to move one to Options for another day, or the bin to take it off for good — the bin asks first.':''}</details>{steps.map((s,i)=><React.Fragment key={s.id}>{insert(s.id,`Add a stop before ${s.title}`)}<div data-step-id={s.id} className={`timeline-row ${s.status} ${target===s.id&&held!==s.id?'drop-target':''} ${held===s.id?'lifted':''}`}><span className="timeline-tick"><input type="checkbox" checked={s.status==='done'} disabled={busy||!mine(s)} aria-label={`Mark ${s.title} completed`} onChange={e=>tick(s,e.target.checked)}/></span><button className={`timeline-step ${s.id===current?.id?'active':''} ${s.status}`} onClick={()=>selectStep(s)}><span className="timeline-time">{s.status==='done'&&s.completedAt?doneClock(s):(s.time||'—')}</span><span className="timeline-dot">{s.status==='done'?<Check size={13}/>:s.locked?<LockKeyhole size={10}/>:null}</span><span><strong>{s.title}</strong><span className="timeline-meta"><small>{s.status==='done'?`Completed${s.time?` · due ${s.time}`:''}`:s.status==='skipped'?'Skipped':s.locked?'Fixed time':'Flexible'}</small>{state&&s.status!=='done'&&s.status!=='skipped'&&<StepWeather state={state} step={s} steps={steps} compact/>}</span></span></button>{parent&&<div className="reorder-tools"><button className="drag-handle" disabled={busy} aria-label={`Drag ${s.title} to reorder`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:s.id,target:s.id,y:e.clientY,scroll:window.scrollY,row:e.currentTarget.closest('[data-step-id]')};setTarget(s.id);setHeld(s.id);}} onPointerMove={e=>{const d=drag.current;if(!d)return;follow(d.row,0,e.clientY-d.y+window.scrollY-d.scroll);const row=underFinger(e.clientX,e.clientY,'[data-step-id]',d.row);if(row){d.target=row.dataset.stepId;setTarget(row.dataset.stepId);}if(e.clientY<100)window.scrollBy(0,-16);if(e.clientY>window.innerHeight-100)window.scrollBy(0,16);}} onPointerUp={()=>{const d=drag.current;drag.current=null;setTarget(null);setHeld(null);if(!d)return;const to=steps.findIndex(x=>x.id===d.target);settle(d.row,to===i);move(d.id,to);}} onPointerCancel={()=>{settle(drag.current?.row,true);drag.current=null;setTarget(null);setHeld(null);}}><GripVertical size={18}/></button><button disabled={busy||i===0} aria-label={`Move ${s.title} up`} onClick={()=>move(s.id,i-1)}><ArrowUp size={14}/></button><button disabled={busy||i===steps.length-1} aria-label={`Move ${s.title} down`} onClick={()=>move(s.id,i+1)}><ArrowDown size={14}/></button>{park(s)}{drop(s)}</div>}</div>{s.status==='done'&&mine(s)&&<label className="timeline-done-time">Finished at<input key={s.completedAt} type="time" defaultValue={doneClock(s)} disabled={busy} aria-label={`Time ${s.title} was finished`} onBlur={e=>retime(s,e.target.value)}/></label>}</React.Fragment>)}{insert(null,steps.length?'Add a stop at the end of the day':'Add the first stop of this day')}</aside>;
}
