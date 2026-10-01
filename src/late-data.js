// Running late, said to the people waiting. On a split day half the family is at the ramen shop
// at six and the other half is still on a train; the half on the train says so in two taps, and
// the half at the ramen shop is told who, by how much, for what, and about when they will walk
// in. It is a message, not a change to the plan: nothing in the day moves, and it is told only
// to the people it is for. Re-timing the day is the separate "We're running late" a parent has.
import {daySplits,laneOf,stepsFor} from './split.js';
import {checkInDestinations} from './checkin-data.js';
import {awarenessAllows} from './child-levels.js';
import {japanClock,japanDate,minutes,activeSteps} from './timing.js';
import {isParent} from './people.js';
export const LATE_MINUTES=[5,10,15,20,30,45,60];
export const LATE_MAX=180;
// A notice stays on the waiting phones until half an hour after the new time, then it is history.
export const LATE_SHOWN_MIN=30;
export const LATE_NOTE_MAX=200;
export const lateNotices=state=>state?.lateNotices||[];
export const liveLate=(state,now=new Date())=>lateNotices(state).filter(n=>!n.clearedAt&&+now<Date.parse(n.eta)+LATE_SHOWN_MIN*60000);
// What one phone shows: the ones it was told, and the one it sent.
export const lateFor=(state,name,now=new Date())=>liveLate(state,now).filter(n=>n.from===name||n.with.includes(name)||n.to.includes(name));
export const myLate=(state,name,now=new Date())=>liveLate(state,now).find(n=>n.from===name)||null;
// The new time. Late for something with a time is that time plus the minutes; late with nothing
// in particular to be late for is the minutes from now. Either way in Japan time.
export function lateEta({minutes:m,time,day},now=new Date()){
 if(time&&/^\d{2}:\d{2}$/.test(time)){
  const at=Date.parse(`${day||japanDate(now)}T${time}:00+09:00`)+m*60000;
  // Already late for it by more than they said: the time they gave is from now instead.
  if(Number.isFinite(at)&&at>+now)return new Date(at);
 }
 return new Date(+now+m*60000);
}
// Who is late, who to tell and what for, guessed from the day. On a split, it is my lane telling
// the other lanes, for where we meet back up. Otherwise it is me telling everybody, for my next
// stop. A boy whose phone is kept free of being late is never told by default.
export function lateDefaults(state,day,name,now=new Date()){
 const members=state?.members||[],told=n=>n!==name&&awarenessAllows(state,n,'late');
 const t=day===japanDate(now)?minutes(japanClock(now)):-1;
 for(const split of daySplits(state,day)){
  const lane=laneOf(split,name);
  if(!lane||(split.meet?.time&&t>minutes(split.meet.time)+LATE_SHOWN_MIN))continue;
  const others=split.members.filter(m=>!lane.members.includes(m));
  return {with:lane.members.includes(name)?lane.members:[name,...lane.members],to:others.filter(told),target:split.meet?{key:`step:${split.meet.id}`,label:split.meet.title,stepId:split.meet.id,time:split.meet.time||null}:null};
 }
 const next=stepsFor(state,day,name).find(s=>(s.participants||[]).includes(name)&&!['done','skipped'].includes(s.status)&&(!s.time||minutes(s.time)>=t));
 return {with:[name],to:members.filter(told),target:next?{key:`step:${next.id}`,label:next.title,stepId:next.id,time:next.time||null}:null};
}
// What it could be late for: where a split meets back up first, then the places Check In offers.
export function lateTargets(state,day,name,now=new Date()){
 const out=[],seen=new Set(),add=t=>{if(!seen.has(t.key)){seen.add(t.key);out.push(t);}};
 const d=lateDefaults(state,day,name,now);if(d.target)add(d.target);
 for(const split of daySplits(state,day))if(split.meet)add({key:`step:${split.meet.id}`,label:split.meet.title,stepId:split.meet.id,time:split.meet.time||null});
 // A stop whose time went by more than half an hour ago is not what anybody is late for now.
 const t=day===japanDate(now)?minutes(japanClock(now)):-1;
 for(const o of checkInDestinations(state,day)){
  const s=o.stepId&&(state.steps||[]).find(s=>s.id===o.stepId);
  if(s?.time&&minutes(s.time)<t-LATE_SHOWN_MIN)continue;
  add({key:o.key,label:o.label,stepId:o.stepId||null,time:s?.time||null});
 }
 return out;
}
// "Damien + Boston", or "you" for the phone reading it.
export function whoText(names,viewer){
 const list=names.includes(viewer)?['You',...names.filter(n=>n!==viewer)]:names;
 return list.length<3?list.join(' and '):`${list.slice(0,-1).join(', ')} and ${list.at(-1)}`;
}
export function lateLine(n,viewer){
 const who=whoText(n.with,viewer),many=n.with.length>1||n.with[0]===viewer;
 return `${who} ${many?'are':'is'} running ${n.minutes} min late${n.target?` for ${n.target}`:''}`;
}
export const etaText=n=>`there about ${japanClock(new Date(n.eta))}${n.time?` instead of ${n.time}`:''}`;
// ---- Asking for more than to be waited for ---------------------------------------------------
// A running-late message can carry one of two things besides the news. "Push it back" asks the
// people waiting to start the stop later by the same minutes; it is a request, and the stop only
// moves when somebody waiting agrees (a grown-up on one side or the other: a boy cannot move the
// plan by asking his brother). "We'll skip it" says the late ones will miss that stop and meet
// the others at the next one they are both on; nothing in the plan moves for that.
export const LATE_ASKS=['delay','skip'];
const clock=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export const pushedBack=(time,m)=>clock(minutes(time)+m);
// A stop can be pushed back when it has a time to push, is not a booking that cannot move, has not
// started, and the later start still falls on the same day.
export function canDelay(step,m){
 return !!step&&!!step.time&&!step.locked&&step.kind!=='fixed'&&!['started','done','skipped'].includes(step.status)&&minutes(step.time)+m<24*60;
}
// Where the late ones meet the others after skipping a stop: the next stop that day, still to do,
// that somebody being told is on.
export function meetAfter(state,day,stepId,to){
 const steps=activeSteps(state,day),i=steps.findIndex(s=>s.id===stepId);
 if(i<0)return null;
 return steps.slice(i+1).find(s=>!['done','skipped'].includes(s.status)&&(s.participants||[]).some(p=>to.includes(p)))||null;
}
// Who may say yes to "push it back": somebody it was sent to, and a grown-up on one side or other.
export const canAgree=(state,n,name)=>n.ask==='delay'&&n.proposal?.status==='open'&&n.to.includes(name)&&(isParent(state,name)||isParent(state,n.from));
export function askLine(n,viewer){
 if(n.ask==='skip')return `Skipping ${n.target||'it'}${n.meet?` · meet you at ${n.meet}${n.meetTime?` at ${n.meetTime}`:''}`:''}`;
 if(n.ask!=='delay'||!n.proposal)return null;
 const p=n.proposal,what=`${n.target} at ${p.to} instead of ${p.from}`;
 if(p.status==='accepted')return `${p.by===viewer?'You':p.by} agreed: ${what}`;
 if(p.status==='declined')return `${p.by===viewer?'You':p.by} said no to starting ${n.target} later`;
 return `${n.from===viewer?'You asked':'Asks'} to start ${what}`;
}
// The words on the lock screen of the phones it was sent to.
export const latePush=n=>({title:`${whoText(n.with,'')} ${n.with.length>1?'are':'is'} running ${n.minutes} min late`,
 body:[n.ask==='skip'?`${askLine(n,'')}.`:n.target?`For ${n.target}, ${etaText(n)}.`:`Now ${etaText(n)}.`,n.ask==='delay'?`Can we start it at ${n.proposal.to}?`:null,n.note].filter(Boolean).join(' ')});
