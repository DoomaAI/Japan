import React,{useState} from 'react';
import {AlertCircle,ArrowRight,CalendarX,Check,Clock,CloudRain,ExternalLink,Info,LifeBuoy,MapPin,Plus,RefreshCw,Repeat,TrainFront,X} from 'lucide-react';
import {NOTE_KINDS,PLAN_B_REASONS,REST_KINDS,dayCheckOf,planBOf,draftPreview} from './day-check.js';
const KIND_ICON={closed:CalendarX,holiday:CalendarX,hours:Clock,transport:TrainFront,weather:CloudRain,swap:Repeat,other:Info};
const label=(list,id)=>list.find(([k])=>k===id)?.[1]||'';
const dayLabel=d=>d?new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(`${d}T12:00:00+09:00`)):'Options';
const when=iso=>iso?new Intl.DateTimeFormat('en-AU',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(iso)):'';
// Tomorrow's check and Plan B, on the day they are about, above its stops. The notes are what the
// night-before check found; a parent accepts one (it goes into the stop's notes) or dismisses it.
// Plan B folds under them: made the same night, kept in the trip, there with no signal.
export default function DayCheck({state,user,day,config,online=true,request,mutate,accept,notice,selectStep,busy}){
 const parent=user?.role==='parent',[working,setWorking]=useState(''),[error,setError]=useState('');
 const check=dayCheckOf(state,day),planB=planBOf(state,day);
 const ready=!!config?.tomorrow;
 const notes=(check?.notes||[]).filter(n=>n.status!=='dismissed');
 const hidden=(check?.notes||[]).length-notes.length;
 const stepTitle=id=>state.steps.find(s=>s.id===id)?.title;
 async function run(parts){
  if(!online){setError('Checking needs a signal. What was found before is still here.');return;}
  setWorking(parts.join());setError('');
  try{const r=await request('day-check',{day,parts});accept(r);
   notice?.(r.checkError?`Plan B is ready; the check itself did not finish: ${r.checkError}`:r.planBError?`Checked. Plan B did not finish: ${r.planBError}`:
    parts.includes('check')?`Checked ${dayLabel(day)}: ${r.check?.notes?`${r.check.notes} thing${r.check.notes===1?'':'s'} to look at`:'nothing to worry about'}.`:'Plan B is ready for the day.');}
  catch(e){setError(e.message||'The check did not work. Try again in a moment.');}
  finally{setWorking('');}
 }
 // One of our own ideas or missed stops, put onto this day by a parent the way the board or the
 // Options list would put it there: an idea through the board, a parked stop through Options, and
 // a stop an earlier day missed moved across and set back to be done.
 const addable=p=>{
  if(!parent||!p.from||!mutate)return null;
  const onDay=p.from.kind==='idea'?state.steps.some(s=>s.id===state.proposals?.find(x=>x.id===p.from.id)?.stepId):state.steps.find(s=>s.id===p.from.id)?.day===day;
  if(onDay)return {done:true};
  return {run:async()=>{
   const ok=p.from.kind==='idea'?await mutate({type:'proposalSchedule',id:p.from.id,day,time:null})
    :p.from.kind==='options'?await mutate({type:'schedule',id:p.from.id,day,time:null})
    :await mutate({type:'patch',id:p.from.id,patch:{day,time:null,group:'',option:''}})&&(state.steps.find(s=>s.id===p.from.id)?.status==='skipped'?await mutate({type:'status',id:p.from.id,status:'todo'}):true);
   if(ok)notice?.(`${p.from.title} is on ${dayLabel(day)}.`);
  }};
 };
 if(!check&&!planB&&!(parent&&ready))return null;
 return <section className="day-check" aria-label="Checked the night before">
  <div className="day-check-head"><p className="eyebrow">CHECKED THE NIGHT BEFORE</p>
   {check&&<small>{when(check.at)}</small>}</div>
  {check?<>
   {check.summary&&<p className="day-check-summary">{check.summary}</p>}
   {!notes.length&&<p className="day-check-clear"><Check size={16}/>{hidden?'Everything it found has been dealt with.':'Nothing found that changes the day.'}</p>}
   {notes.map(n=>{const Icon=KIND_ICON[n.kind]||Info;return <article key={n.id} className={`day-check-note${n.act&&n.status==='open'?' act':''}${n.status==='accepted'?' accepted':''}`}>
    <div className="day-check-note-head"><Icon size={17}/><span className="tag">{label(NOTE_KINDS,n.kind)}</span>{n.act&&n.status==='open'&&<span className="tag act">Before morning</span>}</div>
    <h3>{n.title}</h3>
    {n.stepId&&stepTitle(n.stepId)&&<button type="button" className="linkish" onClick={()=>selectStep?.(n.stepId)}>{stepTitle(n.stepId)}</button>}
    {n.detail&&<p>{n.detail}</p>}
    {!!n.sources?.length&&<p className="day-check-sources">{n.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title||new URL(s.url).hostname} <ExternalLink size={12}/></a>)}</p>}
    {n.status==='accepted'?<small><Check size={13}/> Accepted by {n.decidedBy||'a parent'}{n.stepId?' · in the stop’s notes':''}</small>
     :parent&&<div className="row wrap"><button type="button" className="primary" disabled={busy} onClick={()=>mutate({type:'dayCheckNote',day,id:n.id,status:'accepted'})}><Check size={16}/>{n.stepId?'Accept · add to the stop':'Accept'}</button>
      <button type="button" disabled={busy} onClick={()=>mutate({type:'dayCheckNote',day,id:n.id,status:'dismissed'})}><X size={16}/>Dismiss</button></div>}
   </article>;})}
   {parent&&hidden>0&&<details className="day-check-dismissed"><summary>Dismissed ({hidden})</summary>
    {check.notes.filter(n=>n.status==='dismissed').map(n=><div key={n.id} className="list-row"><span>{n.title}</span><button type="button" className="linkish" disabled={busy} onClick={()=>mutate({type:'dayCheckNote',day,id:n.id,status:'open'})}>Bring back</button></div>)}</details>}
  </>:<p>Not checked yet. {ready?'It runs by itself each evening in Japan for the next day.':''}</p>}
  {planB&&(planB.stops.length>0||planB.rest.length>0)&&<details className="plan-b"><summary><LifeBuoy size={16}/>Plan B for the day ({planB.stops.length+planB.rest.length})</summary>
   {planB.stops.some(p=>p.stepId)&&<><h4>Instead of a stop</h4>{planB.stops.filter(p=>p.stepId).map((p,i)=><PlanBPlace key={i} place={p} lead={`${label(PLAN_B_REASONS,p.reason)} · instead of ${stepTitle(p.stepId)||'a stop'}`} add={addable(p)}/>)}</>}
   {planB.stops.some(p=>!p.stepId)&&<><h4>From our own list, if there is time</h4>{planB.stops.filter(p=>!p.stepId).map((p,i)=><PlanBPlace key={i} place={p} lead={label(PLAN_B_REASONS,p.reason)} add={addable(p)}/>)}</>}
   {planB.rest.length>0&&<><h4>Somewhere to sit down</h4>{planB.rest.map((p,i)=><PlanBPlace key={i} place={p} lead={label(REST_KINDS,p.kind)}/>)}</>}
   <small>Made {when(planB.at)} and kept on this phone. Opening hours are not checked; look before you walk over.</small>
  </details>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {parent&&ready&&<div className="row wrap day-check-actions">
   <button type="button" disabled={!!working||!online} onClick={()=>run(['check','planb'])}><RefreshCw size={16}/>{working==='check,planb'?'Checking… (up to a minute)':check?'Check again':'Check this day now'}</button>
   {check&&!planB&&<button type="button" disabled={!!working||!online} onClick={()=>run(['planb'])}><LifeBuoy size={16}/>{working==='planb'?'Making Plan B…':'Make Plan B'}</button>}
  </div>}
 </section>;
}
const FROM={idea:'From the planning board',options:'From Options',missed:'Missed earlier'};
function PlanBPlace({place,lead,add}){
 const [busy,setBusy]=useState(false);
 return <div className="plan-b-place">
  <small>{lead}{place.walkMinutes!=null?` · about ${place.walkMinutes} min away`:''}</small>
  {place.from&&<span className="tag plan-b-from">{FROM[place.from.kind]}{place.from.kind==='missed'&&place.from.day?` · ${dayLabel(place.from.day)}`:''}</span>}
  <strong>{place.title}</strong>{place.japanese&&<span lang="ja">{place.japanese}</span>}
  {place.area&&<span><MapPin size={13}/>{place.area}</span>}
  {place.why&&<p>{place.why}</p>}
  {place.mapUrl&&<a href={place.mapUrl} target="_blank" rel="noopener noreferrer">Map <ExternalLink size={12}/></a>}
  {add?.done&&<small><Check size={13}/> On this day</small>}
  {add?.run&&<button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await add.run();}finally{setBusy(false);}}}><Plus size={15}/>Add to this day</button>}
 </div>;
}
// A stop's own fallbacks, on its card, so "it's raining, what now" is answered where it is asked.
export function StopPlanB({state,step}){
 const list=(planBOf(state,step?.day)?.stops||[]).filter(p=>p.stepId===step?.id);
 if(!list.length)return null;
 return <details className="plan-b stop-plan-b"><summary><LifeBuoy size={16}/>Plan B ({list.length})</summary>
  {list.map((p,i)=><PlanBPlace key={i} place={p} lead={label(PLAN_B_REASONS,p.reason)}/>)}</details>;
}
// A draft change from Ask: what moves where, what it would run into, and one button to apply it.
// Worked out against the plan as it is now, so a draft the day has overtaken says so.
export function DraftChange({state,draft,canApply,apply}){
 const [busy,setBusy]=useState(false);
 const {rows,conflicts,stale}=draftPreview(state,draft);
 const applied=!!draft.appliedAt;
 const to=r=>r.action==='skip'?'skipped':r.action==='later'?'back to Options':`${dayLabel(r.to.day)}${r.to.time?` ${r.to.time}`:', no set time'}`;
 return <div className={`ask-draft${applied?' applied':''}`}>
  <p className="eyebrow">{applied?'APPLIED':'SUGGESTED CHANGE'}</p>
  {draft.summary&&<p><b>{draft.summary}</b></p>}
  <ul>{rows.map(r=><li key={r.id} className={r.stale&&!applied?'stale':''}><span>{r.title}</span>
   {!applied&&r.from&&<small>{dayLabel(r.from.day)}{r.from.time?` ${r.from.time}`:''}</small>}<ArrowRight size={14}/><strong>{to(r)}</strong></li>)}</ul>
  {applied?<small><Check size={13}/> Applied by {draft.appliedBy||'a parent'}</small>:<>
   {stale&&<p className="callout"><AlertCircle size={18}/>The plan has moved on since this was suggested: a stop in it is booked, under way, done or gone. Ask again for a fresh one.</p>}
   {conflicts.map(c=><p className="callout" key={c}><AlertCircle size={18}/>{c}</p>)}
   {canApply&&<button type="button" className="primary" disabled={busy||stale||!!conflicts.length} onClick={async()=>{setBusy(true);try{await apply();}finally{setBusy(false);}}}><Check size={16}/>Apply this change</button>}
   {!canApply&&<small>A parent can apply this.</small>}
  </>}
 </div>;
}
