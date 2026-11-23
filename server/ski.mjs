// The ski fields on the server: the runs and lifts for a resort, read from OpenStreetMap and
// kept, the run checklist and the meet-ups, and the notifications a meet-up sends.
import {AppError} from './model.mjs';
import {randomUUID} from 'node:crypto';
import {planDays,skiResort,overpassQuery,readOverpass,OVERPASS_URL,OSM_CREDIT,validRunId,MEETUP_ANSWERS,MEETUP_AHEAD_MS,MEETUP_KEEP_MS,meetupAudience,meetupPush} from '../src/ski-data.js';
import {planOf} from '../src/plan-context.js';

// The map of a resort changes when somebody edits OpenStreetMap, which is rarely, so one read
// is kept for half a day and shared by everybody. Overpass is a free service run by
// volunteers; asking once a resort per half day is well inside its usage policy. If it does not
// answer, the last read is given back marked stale, and the phone has its own copy as well.
const KEEP_MS=12*3600000,cache=new Map();
export async function skiMap(resortId,now=Date.now(),get=fetch){
 const resort=skiResort(resortId);if(!resort)throw new AppError('That is not one of the Sapporo resorts.',404);
 const kept=cache.get(resort.id);if(kept&&now-Date.parse(kept.checkedAt)<KEEP_MS)return kept;
 let feed;
 try{
  const r=await get(OVERPASS_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json','User-Agent':'family-trip-companion/1.0'},
   body:`data=${encodeURIComponent(overpassQuery(resort))}`,signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw new Error(String(r.status));feed=await r.json();
 }catch{
  if(kept)return {...kept,stale:true};
  throw new AppError('The run map is not answering right now. The resort’s own trail map has every run.',502);
 }
 const out={...readOverpass(feed,resort),checkedAt:new Date(now).toISOString(),source:OSM_CREDIT};
 cache.set(resort.id,out);return out;
}
export const resetSkiCache=()=>cache.clear();

// ---- Operations ---------------------------------------------------------------------------
const SKI_OPS=['skiRun','skiWant','meetupAdd','meetupAnswer','meetupHere','meetupCancel','whereaboutsOpen','planDays'];
// The ones anybody in the group may make for themselves.
export const SKI_MEMBER_OPS=SKI_OPS.filter(t=>!['whereaboutsOpen','planDays'].includes(t));
const cleanText=(v,max)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
export function skiOperation(state,op,user,fail,now){
 if(!SKI_OPS.includes(op?.type))return null;
 const parent=user.role==='parent';
 if(op.type==='skiRun'||op.type==='skiWant'){
  if(!validRunId(op.runId))fail('Unknown run.',404);
  if(!state.members.includes(op.person))fail('Choose someone in the group.');
  if(!parent&&op.person!==user.name)fail('Tick only your own runs.',403);
  const flag=op.type==='skiRun'?op.done:op.want;
  if(typeof flag!=='boolean')fail('Invalid run tick.');
  let at=now;
  if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid run time.');at=new Date(op.at).toISOString();}
  const runs=state.skiRuns||{},entry=runs[op.runId]||{},key=op.type==='skiRun'?'done':'wants',list={...(entry[key]||{})};
  if(flag)list[op.person]=list[op.person]||at;else delete list[op.person];
  // The run's name is kept with the tick, so the list still reads right if the map is redrawn.
  const name=cleanText(op.name,120)||entry.name;
  state.skiRuns={...runs,[op.runId]:{...entry,...(name?{name}:{}),[key]:list}};
  // A tick is not news for Family updates: ten people ticking runs would bury everything else.
  return {summary:null,important:false,private:true,title:name||'Run'};
 }
 if(op.type==='whereaboutsOpen'){
  if(!parent)fail('An organiser can change who sees where.',403);
  if(typeof op.open!=='boolean')fail('Invalid setting.');
  state.whereaboutsOpen=op.open;
  return {summary:null,important:false,title:'Where we are'};
 }
 // The dates and where each day is, for a plan that started from its own state (the family's
 // days are its guide's and are not rewritten here). A stop on a day that is no longer in the
 // trip goes to the ideas with no date, not into the bin.
 if(op.type==='planDays'){
  if(!parent)fail('An organiser sets the dates.',403);
  if(!state.ownSeed)fail('This plan’s days come from its guide.');
  const {days,problem}=planDays({from:op.from,to:op.to,places:op.places&&typeof op.places==='object'?op.places:{}},state.days||[]);
  if(problem)fail(problem);
  const kept=new Set(days.map(d=>d.date));
  for(const st of state.steps||[])if(st.day&&!kept.has(st.day)){st.backlogFrom={day:st.day,time:st.time,bookingTime:st.bookingTime,status:st.status};st.day=null;st.time=null;st.bookingTime=null;st.status='todo';}
  state.days=days;
  return {summary:`Dates set: ${days[0].date} to ${days.at(-1).date}`,important:true,title:'Trip dates'};
 }
 const meetups=(state.meetups||[]).filter(m=>Date.parse(m.at)>Date.parse(now)-MEETUP_KEEP_MS*4);
 state.meetups=meetups;
 if(op.type==='meetupAdd'){
  if(!skiResort(op.resort))fail('Choose one of the resorts.');
  const label=cleanText(op.place?.label,100);if(!label)fail('Say where to meet.');
  const lat=Number(op.place?.lat),lon=Number(op.place?.lon),point=Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
  const at=Date.parse(op.at),t=Date.parse(now);
  if(!Number.isFinite(at)||at<t-10*60000||at>t+MEETUP_AHEAD_MS)fail('Choose a time in the next week.');
  if(meetups.filter(m=>!m.cancelledAt).length>=40)fail('That is a lot of meet-ups. Cancel an old one first.');
  const m={id:`meet-${randomUUID()}`,resort:op.resort,place:{label,...(point?{lat:Math.round(lat*1e5)/1e5,lon:Math.round(lon*1e5)/1e5}:{})},
   at:new Date(at).toISOString(),note:cleanText(op.note,140),by:user.name,createdAt:now,answers:{[user.name]:{answer:'yes',at:now}},here:{}};
  state.meetups=[...meetups,m];
  return {summary:null,important:false,title:`Meet-up: ${label}`};
 }
 const m=meetups.find(x=>x.id===op.id);if(!m)fail('That meet-up is not on the list any more.',404);
 if(m.cancelledAt&&op.type!=='meetupCancel')fail('That meet-up was cancelled.');
 if(op.type==='meetupAnswer'){
  if(!MEETUP_ANSWERS[op.answer])fail('Coming, running late or can’t make it.');
  const minutes=op.answer==='late'&&Number.isInteger(op.minutes)&&op.minutes>0&&op.minutes<=180?op.minutes:null;
  m.answers={...(m.answers||{}),[user.name]:{answer:op.answer,...(minutes?{minutes}:{}),at:now}};
  return {summary:null,important:false,private:true,title:m.place.label};
 }
 if(op.type==='meetupHere'){
  m.here={...(m.here||{}),[user.name]:m.here?.[user.name]||now};
  m.answers={...(m.answers||{}),[user.name]:{answer:'yes',at:now}};
  return {summary:null,important:false,private:true,title:m.place.label};
 }
 if(op.type==='meetupCancel'){
  if(!parent&&m.by!==user.name)fail('Only whoever set it, or an organiser, can call it off.',403);
  if(!m.cancelledAt){m.cancelledAt=now;m.cancelledBy=user.name;}
  return {summary:null,important:false,title:`Meet-up called off: ${m.place.label}`};
 }
 return null;
}

// ---- Notifications ------------------------------------------------------------------------
// What a meet-up change tells the others, worked out from the state after the change. A new one
// goes to everyone but whoever set it; a late, a can't-make-it or an I'm-here goes to the rest
// of the people still coming; a cancellation to everyone who had not already said no.
export function meetupNotice(state,event,id,by){
 const m=(state.meetups||[]).find(x=>x.id===id);if(!m)return null;
 const zone=planOf(state).timeZone;
 const to=event==='new'?(state.members||[]).filter(n=>n!==by):meetupAudience(state,m,by);
 if(!to.length)return null;
 const stamp=event==='late'?m.answers?.[by]?.minutes||'':event==='here'?'':event==='cancel'?m.cancelledAt:m.answers?.[by]?.at||'';
 return {key:`meetup|${event}|${m.id}|${by}|${stamp}`,kind:'meetups',...meetupPush(event,m,by,zone),url:`/?tab=ski&meetup=${encodeURIComponent(m.id)}`,to};
}
// Which notice a saved change to a meet-up deserves, read from the state before and after it
// rather than from the operation alone, so a second "coming", a second "I'm here" or a second
// cancel says nothing, and a new lateness says it again.
export function meetupChange(before,after,op,user){
 if(op?.type==='meetupAdd'){
  const had=new Set((before.meetups||[]).map(m=>m.id)),m=(after.meetups||[]).find(x=>!had.has(x.id));
  return m?meetupNotice(after,'new',m.id,user.name):null;
 }
 if(!['meetupAnswer','meetupHere','meetupCancel'].includes(op?.type))return null;
 const was=(before.meetups||[]).find(x=>x.id===op.id),now=(after.meetups||[]).find(x=>x.id===op.id);
 if(!was||!now)return null;
 if(op.type==='meetupCancel')return !was.cancelledAt&&now.cancelledAt?meetupNotice(after,'cancel',now.id,user.name):null;
 if(op.type==='meetupHere')return !was.here?.[user.name]&&now.here?.[user.name]?meetupNotice(after,'here',now.id,user.name):null;
 const a=was.answers?.[user.name],b=now.answers?.[user.name];
 if(!b||b.answer==='yes'||(a?.answer===b.answer&&a?.minutes===b.minutes))return null;
 return meetupNotice(after,b.answer,now.id,user.name);
}
// Who sees whose position on the map: everyone in a group that has said so, else the parents.
export const positionSeers=(state,parentsOf)=>state?.whereaboutsOpen?[...(state.members||[])]:parentsOf(state);
