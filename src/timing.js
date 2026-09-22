export const japanDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const japanClock=(date=new Date())=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
export const minutes=t=>t?Number(t.slice(0,2))*60+Number(t.slice(3)):null;
export const asClock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export const activeSteps=(state,day)=>state.steps.filter(s=>s.day===day&&(!s.group||!state.choices[s.group]||state.choices[s.group]===s.option)).sort((a,b)=>a.order-b.order);
export function scheduleProposal(steps,delta){
 const changes=[],conflicts=[];
 for(const s of steps){
  if(s.locked||!s.time||['done','skipped'].includes(s.status))continue;
  const t=minutes(s.time)+delta;
  if(t<0||t>=1440){conflicts.push(`${s.title}: would move outside this day.`);continue;}
  changes.push({id:s.id,time:asClock(t)});
 }
 const changed=new Map(changes.map(x=>[x.id,x.time]));
 for(const [i,s]of steps.entries()){
  if(!changed.has(s.id))continue;
  const next=steps.slice(i+1).find(n=>n.locked&&n.time&&!['done','skipped'].includes(n.status));
  if(next&&minutes(changed.get(s.id))+(s.duration||0)>minutes(next.time))conflicts.push(`${s.title} may overlap ${next.title} at ${next.time}. Shorten or skip it first.`);
  const previous=steps.slice(0,i).reverse().find(n=>n.locked&&n.time&&n.status!=='skipped');
  if(previous&&minutes(changed.get(s.id))<minutes(previous.time)+(previous.duration||0))conflicts.push(`${s.title} would overlap or move before ${previous.title}. Keep it after the fixed activity.`);
 }
 return {changes,conflicts:[...new Set(conflicts)]};
}
export function calendarEvent(step){
 if(!step.time)return null;
 const start=new Date(`${step.day}T${step.time}:00+09:00`),end=new Date(+start+Math.max(step.duration||30,5)*60000);
 const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
 const esc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pasfield//Japan Trip//EN','BEGIN:VEVENT',`UID:${step.id}@pasfield-japan`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${esc(step.title)}`,`LOCATION:${esc(step.place)}`,`DESCRIPTION:${esc(step.notes)}`,`URL:${location.origin}/?day=${step.day}&step=${step.id}`,'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Trip reminder','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
}
// Minutes as a person would say them out loud. Anything under an hour stays in minutes, because
// "75 min" is a number you have to do arithmetic on while standing in a station.
export const spanWords=m=>{const n=Math.round(Math.abs(m)),h=Math.floor(n/60),r=n%60;return n<60?`${n} min`:r?`${h} hr ${r} min`:`${h} hr`;};
// How far ahead or behind the plan an activity is when it is ticked off. "Schedule" here means the
// moment it was meant to be finished — its target time plus the length we set aside for it — rather
// than when it was meant to start, because the rest of the day is built to begin from the finish.
// A step with no target time has nothing to be ahead or behind of, so it says nothing at all.
export function scheduleVariance(step,at=new Date()){
 if(!step?.time||!step?.day)return null;
 const target=new Date(`${step.day}T${step.time}:00+09:00`).getTime()+Math.max(step.duration||0,0)*60000;
 const when=at instanceof Date?at:new Date(at);
 if(!Number.isFinite(when.getTime()))return null;
 const delta=Math.round((when.getTime()-target)/60000);
 return {minutes:delta,target:japanClock(new Date(target)),
  text:delta===0?'right on schedule':`${spanWords(delta)} ${delta<0?'ahead of':'behind'} schedule`};
}
// How long we are planning to stay, said at the moment we arrive. Arriving early does not make the
// stop shorter — a booked hour is still an hour — so the clock starts at the target time when we
// beat it and at the arrival itself when we do not.
export function stayPlan(step,at=new Date()){
 const when=at instanceof Date?at:new Date(at),duration=Math.max(step?.duration||0,0);
 if(!duration||!Number.isFinite(when.getTime()))return {minutes:0,until:null,text:'No length set for this stop — move on whenever you’re ready.'};
 const targeted=step?.day&&step?.time?new Date(`${step.day}T${step.time}:00+09:00`).getTime():null;
 const until=new Date(Math.max(targeted??when.getTime(),when.getTime())+duration*60000);
 return {minutes:duration,until:japanClock(until),text:`We plan to stay about ${spanWords(duration)}, moving on around ${japanClock(until)}.`};
}
// The completion time as a phone's time input wants it, and back again. A step is finished on the
// day it sits on, in Japan time, which is the only reading of "14:20" that means anything to a
// family standing in Kyoto — whatever the phone showing it is set to.
export const doneClock=step=>step?.completedAt?japanClock(new Date(step.completedAt)):'';
export const doneStamp=(step,clock)=>new Date(`${step?.day}T${clock}:00+09:00`);
// A day is behind us when every stop on it has been settled — ticked off, or deliberately
// skipped, which is just as decided. A day with nothing on it is not finished, it is empty, and
// a day with one stop left is still a day we are in the middle of.
export function dayProgress(state,date){
 const steps=activeSteps(state,date),done=steps.filter(s=>s.status==='done').length;
 const skipped=steps.filter(s=>s.status==='skipped').length;
 return {steps:steps.length,done,skipped,finished:steps.length>0&&done+skipped===steps.length};
}
