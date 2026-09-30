// What a Japan specialist does that a guidebook cannot: reads tomorrow the night before, calls
// before a problem lands, and hands over a change to make rather than an opinion about one.
// Three things share this file because they share one rule — nothing here changes the plan on
// its own. A note waits for a parent to accept or dismiss it; a Plan B waits on the day for the
// moment it is needed; a draft from Ask waits for a parent to look it over and apply it.
//
// Every shape here is cleaned the same way on the server, where it is written, and on the phone,
// where it is drawn, so a stored check from an older version never draws something half-formed.
import {activeSteps,minutes} from './timing.js';
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
const https=v=>{try{const u=new URL(String(v||'').trim());return u.protocol==='https:'&&!u.username&&!u.password?u.href.slice(0,500):'';}catch{return '';}};
const isClock=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const mapSearch=q=>q?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`:'';

// Tomorrow's check ---------------------------------------------------------------------------
// What kind of problem a note is about, so the card can say it in one word and one icon.
export const NOTE_KINDS=[['closed','Closed'],['holiday','Public holiday'],['hours','Hours'],['transport','Trains'],['weather','Weather'],['swap','Worth swapping'],['other','Worth knowing']];
export const NOTE_KIND_IDS=NOTE_KINDS.map(([id])=>id);
export const NOTE_STATUS=['open','accepted','dismissed'];
export const MAX_NOTES=8;
// A check is about the day it was run for and the few after it that it touched; a fortnight of
// old ones is enough to look back on and not enough to weigh down every phone's copy.
export const KEEP_CHECKS=20;
// A note is the same note when it is about the same stop and says the same thing in its title,
// so running the check again keeps whatever a parent already decided about it.
const noteKey=n=>`${n.kind}|${n.stepId||''}|${clamp(n.title,120).toLowerCase()}`;
const cleanSources=list=>(Array.isArray(list)?list:[]).map(s=>({title:clamp(s?.title,200),url:https(s?.url)})).filter(s=>s.url).slice(0,4);
// A note that cannot point at something it read is not a note. Everything is cut to what the
// card draws, a stop has to be on the day checked, and a note without a source is dropped rather
// than shown as though somebody had looked it up.
export function cleanNote(n,state,day,previous=[]){
 if(!n||typeof n!=='object')return null;
 const title=clamp(n.title,160),detail=clamp(n.detail,600),sources=cleanSources(n.sources);
 if(!title||!sources.length)return null;
 const onDay=activeSteps(state,day);
 const stepId=typeof n.stepId==='string'&&onDay.some(s=>s.id===n.stepId)?n.stepId:null;
 const kind=NOTE_KIND_IDS.includes(n.kind)?n.kind:'other';
 const note={id:clamp(n.id,60)||'',kind,title,detail,stepId,act:!!n.act,sources,status:'open'};
 const before=previous.find(p=>noteKey(p)===noteKey(note));
 return {...note,id:before?.id||note.id||`${day}-${Math.random().toString(36).slice(2,10)}`,status:before?.status||'open',
  ...(before?.decidedBy?{decidedBy:before.decidedBy,decidedAt:before.decidedAt}:{})};
}
export function cleanDayCheck(found,state,day,now=new Date().toISOString()){
 const previous=state.dayChecks?.[day]?.notes||[];
 const seen=new Set(),notes=[];
 for(const raw of Array.isArray(found?.notes)?found.notes:[]){
  const n=cleanNote(raw,state,day,previous);
  if(!n||seen.has(noteKey(n)))continue;seen.add(noteKey(n));notes.push(n);
  if(notes.length>=MAX_NOTES)break;
 }
 return {day,at:now,summary:clamp(found?.summary,300),notes};
}
export const dayCheckOf=(state,day)=>state?.dayChecks?.[day]||null;
export const openNotes=(state,day)=>(dayCheckOf(state,day)?.notes||[]).filter(n=>n.status==='open');
// The checks kept: the newest few days' worth, so the trip does not carry every night's run.
export const keepChecks=checks=>Object.fromEntries(Object.entries(checks||{}).sort(([a],[b])=>b.localeCompare(a)).slice(0,KEEP_CHECKS));
// What accepting a note does: it goes into the stop's own notes, dated and with where it came
// from, so it is there offline on the stop card and in the printed guide. A note about the day as
// a whole has no stop to go on, and simply stays on the day marked as seen.
export function acceptedLine(note,day){
 const source=note.sources?.[0]?.url?` (${note.sources[0].url})`:'';
 return `Checked ${day}: ${note.title}${note.detail?` — ${note.detail}`:''}${source}`;
}

// Plan B ---------------------------------------------------------------------------------------
// A fallback per stop, made the night before and kept in the trip, so it is there in a basement
// with no signal: somewhere indoors near it for rain or a closed door, and somewhere nearby to sit
// down with a five-year-old who has had enough.
export const PLAN_B_REASONS=[['rain','If it rains'],['closed','If it is shut or full'],['spare','If there is time'],['tired','If we are done in']];
// What Plan B may reach for besides new places: the ideas on the board no day has taken yet, the
// stops put back in Options, and the stops an earlier day skipped or never got to. When one of
// them is near tomorrow's route it is a better fallback than a stranger's recommendation — it is
// something one of us already wanted. Each is named by a reference the model copies back exactly.
export const MAX_SPARE=24;
export function spareIdeas(state,day){
 const out=[];
 for(const p of state?.proposals||[]){
  if(p.parked||(state.steps||[]).some(s=>s.id===p.stepId))continue;
  out.push({ref:`idea:${p.id}`,kind:'idea',id:p.id,title:p.title,place:p.place||'',note:p.availability||''});
 }
 for(const s of state?.steps||[])if(s.day===null&&!['done','started'].includes(s.status))out.push({ref:`stop:${s.id}`,kind:'options',id:s.id,title:s.title,place:s.place||'',note:'in Options'});
 const missed=[];
 for(const d of state?.days||[]){
  if(d.date>=day)break;
  for(const s of activeSteps(state,d.date))if(['todo','skipped'].includes(s.status)&&!s.locked&&!s.bookingTime&&s.kind!=='fixed')
   missed.push({ref:`stop:${s.id}`,kind:'missed',id:s.id,title:s.title,place:s.place||'',note:`${s.status==='skipped'?'skipped':'not done'} on ${d.date} in ${d.city}`,day:d.date,skipped:s.status==='skipped'});
 }
 // Skipped first, then the most recent: the stops we meant to do and did not are the ones missed.
 missed.sort((a,b)=>(b.skipped-a.skipped)||b.day.localeCompare(a.day));
 return [...out,...missed].slice(0,MAX_SPARE);
}
const spareFor=(state,day,ref)=>typeof ref==='string'&&ref?spareIdeas(state,day).find(x=>x.ref===ref)||null:null;
export const REST_KINDS=[['kids-floor','Department-store kids’ floor'],['playground','Indoor playground'],['cafe','Café with space'],['park','Park with shade'],['other','Somewhere to sit']];
export const MAX_PLAN_B=12,MAX_REST=4;
function cleanPlace(p,kinds){
 if(!p||typeof p!=='object')return null;
 const title=clamp(p.title,160);if(!title)return null;
 const area=clamp(p.area,200),japanese=clamp(p.japanese,200);
 return {title,area,japanese,why:clamp(p.why,300),walkMinutes:Number.isInteger(p.walkMinutes)&&p.walkMinutes>=0&&p.walkMinutes<=120?p.walkMinutes:null,
  kind:kinds.some(([id])=>id===p.kind)?p.kind:kinds.at(-1)[0],
  mapUrl:mapSearch([japanese||title,area].filter(Boolean).join(' '))};
}
export function cleanPlanB(found,state,day,now=new Date().toISOString()){
 const onDay=activeSteps(state,day).filter(s=>s.status!=='skipped');
 const stops=[],used=new Set();
 for(const raw of Array.isArray(found?.stops)?found.stops:[]){
  // A fallback either stands in for a stop on the day, or is one of our own ideas or missed
  // stops that fits in if there is time; anything pointing at neither is dropped.
  const step=onDay.find(s=>s.id===raw?.stepId)||null;
  const spare=spareFor(state,day,raw?.fromIdea??(raw?.from?`${raw.from.kind==='idea'?'idea':'stop'}:${raw.from.id}`:''));
  if(!step&&!spare)continue;
  const place=cleanPlace(raw,PLAN_B_REASONS);if(!place)continue;
  if(!step)place.kind='spare';
  const key=`${step?.id||spare.ref}|${place.kind}`;if(used.has(key))continue;used.add(key);
  stops.push({...place,stepId:step?.id||null,reason:place.kind,...(spare?{from:{kind:spare.kind,id:spare.id,title:spare.title,...(spare.day?{day:spare.day}:{})}}:{})});
  if(stops.length>=MAX_PLAN_B)break;
 }
 for(const s of stops)delete s.kind;
 const rest=(Array.isArray(found?.rest)?found.rest:[]).map(r=>cleanPlace(r,REST_KINDS)).filter(Boolean).slice(0,MAX_REST);
 return {day,at:now,stops,rest};
}
export const planBOf=(state,day)=>state?.planB?.[day]||null;
export const planBFor=(state,day,stepId)=>(planBOf(state,day)?.stops||[]).filter(s=>s.stepId===stepId);

// A draft change from Ask ---------------------------------------------------------------------
// Ask reads the plan and gives an opinion. When the opinion is "move this to tomorrow", it can
// hand back the move itself, as a draft a parent looks over and applies in one tap. It is only
// ever a draft: nothing is written until a parent applies it, and applying it goes through the
// same checks as moving a stop by hand.
export const DRAFT_ACTIONS=[['move','Move'],['skip','Skip'],['later','Back to Options']];
export const DRAFT_ACTION_IDS=DRAFT_ACTIONS.map(([id])=>id);
export const MAX_DRAFT=12;
// A stop that is booked, locked, under way or finished is not the model's to move.
export const movable=s=>!!s&&!s.locked&&!s.bookingTime&&!['done','started','skipped'].includes(s.status);
export function cleanDraft(found,state){
 if(!found||typeof found!=='object')return null;
 const changes=[],seen=new Set();
 for(const c of Array.isArray(found.changes)?found.changes:[]){
  const id=typeof c?.stepId==='string'?c.stepId:typeof c?.id==='string'?c.id:'';
  const step=state.steps.find(s=>s.id===id);
  if(!movable(step)||seen.has(id)||!DRAFT_ACTION_IDS.includes(c.action))continue;
  if(c.action==='move'){
   const day=state.days.some(d=>d.date===c.day)?c.day:step.day;
   const time=isClock(c.time)?c.time:c.time===null||c.time===''?null:step.time;
   if(!day||(day===step.day&&time===step.time))continue;
   changes.push({id,action:'move',day,time});
  }else if(c.action==='later'){if(step.day===null)continue;changes.push({id,action:'later',day:null,time:null});}
  else changes.push({id,action:'skip',day:step.day,time:step.time});
  seen.add(id);
  if(changes.length>=MAX_DRAFT)break;
 }
 if(!changes.length)return null;
 return {summary:clamp(found.summary,300),changes};
}
// Where each stop sits once the draft is applied, with the fixed times it would run into. Worked
// out on the phone against the plan as it is now, so a draft from yesterday that the day has
// since overtaken says so rather than applying something nobody meant any more.
export function draftPreview(state,draft){
 const rows=[],conflicts=[];let stale=false;
 const moved=new Map();
 for(const c of draft?.changes||[]){
  const step=state.steps.find(s=>s.id===c.id);
  if(!movable(step)){stale=true;rows.push({id:c.id,title:step?.title||'A stop no longer on the plan',action:c.action,from:step?{day:step.day,time:step.time}:null,to:{day:c.day,time:c.time},stale:true});continue;}
  rows.push({id:c.id,title:step.title,action:c.action,from:{day:step.day,time:step.time},to:{day:c.day,time:c.time},stale:false});
  if(c.action==='move')moved.set(c.id,{...step,day:c.day,time:c.time});
 }
 const gone=new Set((draft?.changes||[]).filter(c=>c.action!=='move').map(c=>c.id));
 for(const [id,s] of moved){
  if(!s.time)continue;
  const start=minutes(s.time),end=start+(s.duration||0);
  if(end>=1440)conflicts.push(`${s.title} would run past midnight at ${s.time}.`);
  for(const other of activeSteps(state,s.day)){
   if(other.id===id||gone.has(other.id)||moved.has(other.id)||other.status==='skipped'||!other.time)continue;
   if(!(other.locked||other.bookingTime))continue;
   const o=minutes(other.bookingTime||other.time),oe=o+(other.duration||0);
   if(start<oe&&o<end)conflicts.push(`${s.title} at ${s.time} would run into ${other.title} (booked for ${other.bookingTime||other.time}).`);
  }
  for(const [otherId,t] of moved){
   if(otherId<=id||t.day!==s.day||!t.time)continue;
   const o=minutes(t.time),oe=o+(t.duration||0);
   if(start<oe&&o<end)conflicts.push(`${s.title} and ${t.title} would overlap on ${s.day}.`);
  }
 }
 return {rows,conflicts:[...new Set(conflicts)],stale};
}
// Where a stop moved to another day goes in that day's order: after whatever is timed before
// it, so the day at a glance still reads top to bottom by the clock.
function slotOrder(state,step,day,time){
 const others=state.steps.filter(s=>s.day===day&&s.id!==step.id).sort((a,b)=>a.order-b.order);
 if(!others.length)return 10;
 if(!time)return others.at(-1).order+10;
 const after=others.findIndex(s=>s.time&&minutes(s.time)>minutes(time));
 if(after===-1)return others.at(-1).order+10;
 const prev=after>0?others[after-1].order:others[after].order-20;
 return (prev+others[after].order)/2;
}
// Applying it: every stop is checked again against the plan as it stands on the server, and one
// that is no longer movable fails the whole draft rather than half of it going through.
export function applyDraft(state,changes){
 if(!Array.isArray(changes)||!changes.length||changes.length>MAX_DRAFT)return {error:'Nothing to apply.'};
 const clean=cleanDraft({changes:changes.map(c=>({...c,stepId:c.id}))},state);
 if(!clean||clean.changes.length!==changes.length)return {error:'The plan has moved on since this was suggested. Ask again for a fresh one.'};
 const preview=draftPreview(state,clean);
 if(preview.stale)return {error:'The plan has moved on since this was suggested. Ask again for a fresh one.'};
 if(preview.conflicts.length)return {error:preview.conflicts[0]};
 const lines=[];
 for(const c of clean.changes){
  const step=state.steps.find(s=>s.id===c.id);
  if(c.action==='move'){
   if(c.day!==step.day)step.order=slotOrder(state,step,c.day,c.time);
   lines.push(`${step.title} → ${c.day}${c.time?` ${c.time}`:''}`);
   step.day=c.day;step.time=c.time;
  }else if(c.action==='skip'){step.status='skipped';delete step.completedAt;lines.push(`${step.title} skipped`);}
  else{
   step.backlogFrom={day:step.day,time:step.time,bookingTime:step.bookingTime??null,status:step.status};
   Object.assign(step,{day:null,time:null,bookingTime:null,group:'',option:'',status:'todo'});
   delete step.startedAt;delete step.completedAt;delete step.legsDone;
   lines.push(`${step.title} back to Options`);
  }
 }
 return {changes:clean.changes,summary:lines.join('; ')};
}
