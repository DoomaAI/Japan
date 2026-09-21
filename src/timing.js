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
// What happens after this one. It is the question anybody standing in a place actually has —
// what is next, when does it start, how long does it run, and how long have we got here — and
// until now the answer was three fields on a card nobody opens.
//
// "Next" is positional: the next stop in the day's order. That is what the word means when you
// are looking at a card, and it stays the same whether or not the stop after it has been ticked
// off, so the answer does not move around while somebody is reading it. A skipped stop is the
// one exception, because it is not happening at all.
export function whatsNext(steps,step){
 const list=Array.isArray(steps)?steps:[];
 const at=list.findIndex(s=>s?.id&&s.id===step?.id);
 if(at<0)return null;
 const next=list.slice(at+1).find(s=>s.status!=='skipped');
 if(!next)return null;
 const runs=Math.max(next.duration||0,0);
 // Measured from when this stop is due to FINISH rather than when it starts: the time you have
 // here is the time before the next thing begins, and the plan already says how long we meant
 // to be here. Only where both have a target time, because two unknowns make no gap.
 const from=step?.time?minutes(step.time)+Math.max(step?.duration||0,0):null;
 const to=next.time?minutes(next.time):null;
 const gap=from!==null&&to!==null?to-from:null;
 // Where the next thing starts before this one is due to end, the gap is negative and saying so
 // helps nobody: most stops carry a default half hour rather than a measured one, so "20 min
 // before this one is due to finish" would cry overlap all day about a number nobody set. Fall
 // back to the fact that is certainly true either way — how long after this one starts — and
 // keep the alarm for the genuinely out of order.
 const fromStart=step?.time&&to!==null?to-minutes(step.time):null;
 const after=gap===null?''
  :gap>0?`${spanWords(gap)} after this one`
  :gap===0?'straight after this one'
  :fromStart>0?`${spanWords(fromStart)} after this one starts`
  :fromStart===0?'at the same time as this one'
  :`${spanWords(fromStart)} before this one`;
 const howLong=runs?`about ${spanWords(runs)}`:'no length set';
 return {step:next,at:next.time||null,minutes:runs,runs:runs?spanWords(runs):null,gap,fromStart,after,howLong,
  text:`${next.time||'Any time'} · ${next.title} — ${howLong}${after?`, ${after}`:''}.`};
}
