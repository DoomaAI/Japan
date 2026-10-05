import React,{useEffect,useRef,useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {Check,LockKeyhole,GripVertical,ArrowUpDown,Plus,Trash2,Inbox,Split,Merge,Eye,Clock} from 'lucide-react';
import {japanClock,scheduleVariance,doneClock,doneStamp,windowText,retimeAfterMove} from './timing.js';
import {ticketList} from './trip-features.js';
import {legCount,legsTicked} from './route-data.js';
import {follow,settle} from './lift.js';
import {StepWeather} from './Weather.jsx';
import {WhoseDay} from './SplitDay.jsx';
import EntryIcon from './EntryIcon.jsx';
// How long a finger rests on a handle before the row lifts, and how far it may wander meanwhile.
const HOLD=220,SLOP=8,END=':end';
export default function DayTimeline({steps,allSteps,splits=[],lens,setLens,current,today,state,user,parent,busy,selectStep,mutate,notice,addStep,removeStep,optionStep,onDone}){
 const drag=useRef(null),list=useRef(null),[target,setTarget]=useState(null),[held,setHeld]=useState(null),[ask,setAsk]=useState(null),[adjusting,setAdjusting]=useState(false);
 // On a split day the list shown can be one person's lane, while the order is the whole day's.
 // So a move lands beside the stop it was dropped on within the whole day, and the other lanes'
 // stops keep their places around it.
 const move=(id,to)=>{const shown=steps.map(s=>s.id),from=shown.indexOf(id);if(from<0||to<0||to>=shown.length||to===from)return;const ids=(allSteps||steps).map(s=>s.id).filter(x=>x!==id),at=ids.indexOf(shown[to]);ids.splice(to>from?at+1:at,0,id);mutate({type:'reorder',day:today.date,ids}).then(ok=>ok&&offerRetime(id,ids));};
 // Where a split opens and closes in the list as shown, and which lane each of its stops is on.
 const laneIndex=new Map(),opens=new Map(),closes=new Map();
 for(const split of splits){
  split.lanes.forEach((lane,i)=>lane.steps.forEach(s=>laneIndex.set(s.id,{i,lane})));
  const mine=steps.filter(s=>s.group===split.group);
  if(mine.length){opens.set(mine[0].id,split);closes.set(mine.at(-1).id,split);}
 }
 const shown=new Set(steps.map(s=>s.id));
 const splitOpen=split=><div className="timeline-split open"><Split size={15}/><span>We split up{split.start?` · ${split.start}`:''}<small>{split.lanes.map(l=>l.members.join(' + ')).join('  ·  ')}</small></span></div>;
 // The lanes not shown stay in the list as a line each, so following your own never hides that
 // the others exist — and a tap on one is how you see what they are doing.
 const splitClose=split=><>{split.lanes.filter(l=>!l.steps.some(s=>shown.has(s.id))).map(l=><button key={l.option} type="button" className="timeline-other-lane" onClick={()=>setLens?.(l.members[0])}><Eye size={14}/><span><strong>{l.members.join(' + ')}</strong> {l.steps.map(s=>`${s.time?`${s.time} `:''}${s.title}`).join(' → ')}</span></button>)}{split.meet?<button type="button" className="timeline-split close" onClick={()=>selectStep(split.meet)}><Merge size={15}/><span>Meet back up{split.meet.time?` · ${split.meet.time}`:''}<small>{split.meet.place||split.meet.title}</small></span></button>:<div className="timeline-split close missing"><Merge size={15}/><span>No meet-up planned<small>Add a stop after the split with everyone on it.</small></span></div>}</>;
 // Ticking off is the one change the boys make themselves, so the rule here is the card's rule,
 // not the editing rule: whoever the stop is assigned to can tick it, and a parent can tick any.
 const mine=s=>parent||(s.participants||[]).includes(user?.name);
 // A stop is remembered as "between those two" — the coffee before the train, the walk we
 // forgot. So the gap itself is the button, and the form opens already knowing where the stop
 // goes, rather than adding it to the end of the day and leaving it to be dragged back up.
 // Only the + is the button, not the dashed line across the row: the line runs under a stop's
 // tray and bin, and a thumb reaching for those kept adding a stop instead.
 const insert=(before,label)=>parent&&addStep?<div className={`timeline-insert${before?'':' end'}${target===(before??END)?' drop-gap':''}`}><button type="button" className="timeline-add" disabled={busy||adjusting} aria-label={label} onClick={()=>addStep(before)}><Plus size={15}/>{before?null:<span>Add a stop</span>}</button></div>:parent&&target===(before??END)?<div className="timeline-gap drop-gap" aria-hidden="true"/>:null;
 // A stop can be added here, so it can be taken off here — the alternative was opening the whole
 // edit form to find the one button that deletes it. Nothing goes on the tap itself: it asks
 // first, because this is the one change to the day that cannot simply be made again.
 const drop=s=>parent&&removeStep?<button type="button" className="remove-stop" disabled={busy} aria-label={`Remove ${s.title} from this day`} onClick={()=>removeStep(s)}><Trash2 size={15}/></button>:null;
 // Beside it, the thing the family actually means most of the time: not today, but not gone. It
 // is its own icon rather than a step inside the removal, so nobody has to reach for the bin to
 // find it — and it goes on the tap, because Options is where a stop waits, not where it ends.
 const park=s=>parent&&optionStep?<button type="button" className="to-options" disabled={busy} aria-label={`Save ${s.title} to Options`} onClick={()=>optionStep(s)}><Inbox size={15}/></button>:null;
 // Reordering by hand. A stop is dropped on the line between two others — the same line that
 // adds a stop there — rather than on a stop, so where it will land is never a guess about
 // "above or below". A finger has to rest on the handle for a moment before the row lifts: a
 // thumb scrolling past the handle carries on scrolling, and only a deliberate hold moves a stop.
 // A mouse needs no hold, since it cannot be scrolling the page.
 const gapAt=(y,lifted)=>{for(const row of list.current?.querySelectorAll('[data-step-id]')||[]){if(row===lifted)continue;const r=row.getBoundingClientRect();if(y<r.top+r.height/2)return row.dataset.stepId;}return END;};
 // The two lines either side of the stop being carried would leave it where it is.
 const still=(d,gap)=>gap===d.id||gap===(steps[d.i+1]?.id??END);
 const place=(id,before)=>{const shown=steps.map(s=>s.id).filter(x=>x!==id),ids=(allSteps||steps).map(s=>s.id).filter(x=>x!==id);if(!shown.length)return;const at=before===END?ids.indexOf(shown.at(-1))+1:ids.indexOf(before);if(at<0)return;ids.splice(at,0,id);moved(id,ids);};
 // A drop is undone from the toast, as taking a stop off is. The plan is the whole family's and a
 // row let go on the wrong line is easy to miss; the order it had goes back as it was, and if
 // the day has changed since, the server refuses it rather than scrambling the newer order.
 const moved=async(id,ids)=>{
  const was=(allSteps||steps).map(s=>s.id),title=steps.find(s=>s.id===id)?.title||'Stop';
  if(!await mutate({type:'reorder',day:today.date,ids}))return;
  offerRetime(id,ids);
  notice({text:`Moved ${title}.`,undo:async()=>{if(await mutate({type:'reorder',day:today.date,ids:was})){setAsk(null);notice(`${title} is back where it was.`);}}});
 };
 // A move keeps the stop's time, which is right for a booking and wrong for most else: lunch
 // dragged above the morning temple still says 13:00. So when the time no longer fits between the
 // stops either side, the question is asked under the row, with the middle of that gap filled in
 // and editable; keeping the old time is one tap, and nothing changes until one is chosen.
 const offerRetime=(id,ids)=>{const all=new Map((allSteps||steps).map(s=>[s.id,s])),order=ids.map(x=>all.get(x)).filter(Boolean),fit=retimeAfterMove(order,id);setAsk(fit?{id,...fit}:null);};
 const retimeMoved=async(s,time)=>{
  if(!/^\d{2}:\d{2}$/.test(time||'')){notice('Use a valid time.');return;}
  const was=s.time;
  if(!await mutate({type:'patch',id:s.id,patch:{time}}))return;
  setAsk(null);
  notice({text:`${s.title} now at ${time}.`,undo:async()=>{if(await mutate({type:'patch',id:s.id,patch:{time:was}}))notice(`${s.title} back at ${was}.`);}});
 };
 const retimeAsk=s=>{if(ask?.id!==s.id||!parent)return null;const between=[ask.before&&`${ask.before.title} (${ask.before.time})`,ask.after&&`${ask.after.title} (${ask.after.time})`].filter(Boolean);
  return <form className="timeline-retime" onSubmit={e=>{e.preventDefault();retimeMoved(s,new FormData(e.currentTarget).get('time'));}}><Clock size={15}/><span>Update the time? <small>{s.title} is set for {s.time}, {ask.before&&ask.after?'between':ask.before?'after':'before'} {between.join(' and ')}.</small></span><input key={ask.time} name="time" type="time" defaultValue={ask.time} disabled={busy} aria-label={`New time for ${s.title}`}/><button type="submit" className="primary" disabled={busy}>Update</button><button type="button" disabled={busy} onClick={()=>setAsk(null)}>Keep {s.time}</button></form>;};
 const lift=d=>{d.lifted=true;setHeld(d.id);setAdjusting(true);try{navigator.vibrate?.(12);}catch{}};
 const letGo=()=>{clearTimeout(drag.current?.timer);drag.current=null;setTarget(null);setHeld(null);};
 const grab=(s,i)=>e=>{if(e.button>0)return;e.currentTarget.setPointerCapture?.(e.pointerId);const d={id:s.id,i,x:e.clientX,y:e.clientY,scroll:window.scrollY,row:e.currentTarget.closest('[data-step-id]'),gap:null,lifted:false};drag.current=d;if(e.pointerType==='mouse'||adjusting)lift(d);else d.timer=setTimeout(()=>{if(drag.current===d)lift(d);},HOLD);};
 const carry=e=>{const d=drag.current;if(!d)return;
  if(!d.lifted){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>SLOP)letGo();return;}
  follow(d.row,0,e.clientY-d.y+window.scrollY-d.scroll);
  const gap=gapAt(e.clientY,d.row);d.gap=still(d,gap)?null:gap;setTarget(d.gap);
  if(e.clientY<100)window.scrollBy(0,-16);if(e.clientY>window.innerHeight-100)window.scrollBy(0,16);};
 const release=()=>{const d=drag.current;letGo();if(!d?.lifted)return;settle(d.row,d.gap===null);if(d.gap!==null)place(d.id,d.gap);};
 const cancel=()=>{const d=drag.current;letGo();if(d?.lifted)settle(d.row,true);};
 // Once a row is lifted the page must not scroll under the finger. The handle lets a swipe
 // scroll (touch-action: pan-y), so it is stopped here instead, and only while something is held.
 // It has to be a listener of our own: React's touch listeners are passive and cannot stop it.
 useEffect(()=>{const stop=e=>{if(drag.current?.lifted)e.preventDefault();};document.addEventListener('touchmove',stop,{passive:false});return()=>{document.removeEventListener('touchmove',stop);clearTimeout(drag.current?.timer);};},[]);
 // The arrows beside every stop are gone now that a stop drags; Adjust, at the foot of the day,
 // is the way in for anybody who does not find the hold. Either way the stops wobble, as Home's
 // cards do, and while they wobble a handle lifts at a touch with no hold. Done or Escape settles it.
 useEffect(()=>{if(!adjusting)return;const esc=e=>{if(e.key==='Escape')setAdjusting(false);};document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);},[adjusting]);
 const adjust=parent&&steps.length>1?adjusting?<div className="wobble-done timeline-adjust-done" role="status"><small>Drag a stop by its handle to the line where it should go.</small><button type="button" className="primary" onClick={()=>setAdjusting(false)}>Done</button></div>:<button type="button" className="timeline-adjust" disabled={busy} onClick={()=>setAdjusting(true)}><ArrowUpDown size={15}/>Adjust</button>:null;
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
  onDone?.(s);
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
 return <aside className={`timeline${adjusting?' adjusting':''}`} ref={list}><PageTitle as="h2" className="section-heading" aside={<span>{today?.city}</span>} help={<p>Tap a stop's circle to tick it off as it happens; a completed stop steps back and carries the time it was finished; tap that time underneath it to correct it. A stop reached by more than one leg (a walk, a train, a change) has a tick on each leg in its route card; ticking the last leg completes the stop.{parent?' Hold a handle, or tap Adjust at the foot of the day, and the stops wobble; drag one by its handle to the line where it should go — booking times stay the same, and if a stop’s own time no longer fits between its new neighbours you are offered one in the middle of the gap. Tap a gap to add a stop where it belongs, the tray to move one to Options for another day, or the bin to take it off for good — the bin asks first.':''}</p>}>The day at a glance</PageTitle>{splits.length>0&&setLens&&state&&<WhoseDay state={state} user={user} lens={lens} setLens={setLens}/>}{steps.map((s,i)=><React.Fragment key={s.id}>{opens.has(s.id)&&splitOpen(opens.get(s.id))}{insert(s.id,`Add a stop before ${s.title}`)}<div data-step-id={s.id} className={`timeline-row ${s.status}${laneIndex.has(s.id)?` in-lane lane-${laneIndex.get(s.id).i%4}`:''} ${held===s.id?'lifted':''}`}><span className="timeline-tick"><input type="checkbox" checked={s.status==='done'} disabled={busy||!mine(s)} aria-label={`Mark ${s.title} completed`} onChange={e=>tick(s,e.target.checked)}/></span><button className={`timeline-step ${s.id===current?.id?'active':''} ${s.status}`} onClick={()=>{if(!adjusting)selectStep(s);}}><span className="timeline-time">{s.status==='done'&&s.completedAt?doneClock(s):(s.time||'—')}</span><span className="timeline-dot">{s.status==='done'?<Check size={10} strokeWidth={3}/>:s.locked?<LockKeyhole size={10}/>:null}</span><span><strong><EntryIcon step={s}/>{s.title}</strong>{laneIndex.has(s.id)&&<em className="lane-chip">{laneIndex.get(s.id).lane.members.join(' + ')}</em>}<span className="timeline-meta"><small>{s.status==='done'?`Completed${s.time?` · due ${s.time}`:''}`:s.status==='skipped'?'Skipped':windowText(s)?`Window ${windowText(s)}`:s.locked?'Fixed time':'Flexible'}{s.status!=='done'&&legsTicked(s)>0?` · ${legsTicked(s)} of ${legCount(s)} legs done`:''}</small>{state&&s.status!=='done'&&s.status!=='skipped'&&<StepWeather state={state} step={s} steps={steps} compact/>}</span></span></button>{parent&&<div className="reorder-tools"><button className="drag-handle" disabled={busy} aria-label={`Drag ${s.title} to reorder`} onPointerDown={grab(s,i)} onPointerMove={carry} onPointerUp={release} onPointerCancel={cancel} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{const by={ArrowUp:-1,ArrowDown:1}[e.key];if(by&&!busy){e.preventDefault();move(s.id,i+by);}}}><GripVertical size={18}/></button>{park(s)}{drop(s)}</div>}</div>{retimeAsk(s)}{s.status==='done'&&mine(s)&&<label className="timeline-done-time">Finished<input key={s.completedAt} type="time" defaultValue={doneClock(s)} disabled={busy} aria-label={`Time ${s.title} was finished`} onBlur={e=>retime(s,e.target.value)}/></label>}{closes.has(s.id)&&splitClose(closes.get(s.id))}</React.Fragment>)}{insert(null,steps.length?'Add a stop at the end of the day':'Add the first stop of this day')}{adjust}</aside>;
}
