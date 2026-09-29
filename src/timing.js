export const japanDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const japanClock=(date=new Date())=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
export const minutes=t=>t?Number(t.slice(0,2))*60+Number(t.slice(3)):null;
export const asClock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
// A group is either alternatives, where only the chosen option is on the day, or a split, where
// every option is on the day because each is somebody's (see split.js).
export const activeSteps=(state,day)=>state.steps.filter(s=>s.day===day&&(!s.group||state.groupModes?.[s.group]==='split'||!state.choices[s.group]||state.choices[s.group]===s.option)).sort((a,b)=>a.order-b.order);
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
const icsStamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
const icsEsc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
// A calendar line longer than 75 characters is continued on the next line after a space; a
// calendar app that does not fold is a calendar app that drops the event.
const icsFold=line=>{const out=[];let s=line;while(s.length>72){out.push(s.slice(0,72));s=' '+s.slice(72);}out.push(s);return out.join('\r\n');};
export function calendarEvent(step){
 if(!step.time)return null;
 const start=new Date(`${step.day}T${step.time}:00+09:00`),end=new Date(+start+Math.max(step.duration||30,5)*60000);
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pasfield//Japan Trip//EN','BEGIN:VEVENT',`UID:${step.id}@pasfield-japan`,`DTSTAMP:${icsStamp(new Date())}`,`DTSTART:${icsStamp(start)}`,`DTEND:${icsStamp(end)}`,`SUMMARY:${icsEsc(step.title)}`,`LOCATION:${icsEsc(step.place)}`,`DESCRIPTION:${icsEsc(step.notes)}`,`URL:${location.origin}/?day=${step.day}&step=${step.id}`,'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Trip reminder','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
}
// The whole trip as one calendar a phone subscribes to once: a line across each day saying where
// we are and where we sleep, and every fixed booking as a timed event with two alerts — one at
// the leave-by time, worked out the same way the Home card works it out, and one ten minutes
// before the booking itself. The phone's own Calendar then does what the app cannot: it says so
// on the lock screen with the app closed. Booking references stay out of it; a calendar is shared
// more casually than the app is. The phone asks for a fresh copy about once an hour.
export function calendarFeed(state,origin=''){
 const now=icsStamp(new Date()),lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pasfield//Japan Trip//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Japan 2026','X-WR-TIMEZONE:Asia/Tokyo','REFRESH-INTERVAL;VALUE=DURATION:PT1H','X-PUBLISHED-TTL:PT1H'];
 for(const d of state.days){
  const after=new Date(`${d.date}T00:00:00Z`);after.setUTCDate(after.getUTCDate()+1);
  lines.push('BEGIN:VEVENT',`UID:day-${d.date}@pasfield-japan`,`DTSTAMP:${now}`,`DTSTART;VALUE=DATE:${d.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${after.toISOString().slice(0,10).replace(/-/g,'')}`,`SUMMARY:${icsEsc(`${d.title} · ${d.city}`)}`,`LOCATION:${icsEsc(d.hotel)}`,`URL:${origin}/?day=${d.date}`,'TRANSP:TRANSPARENT','END:VEVENT');
  for(const s of activeSteps(state,d.date)){
   if(!s.locked||!s.time||s.status==='skipped')continue;
   const start=new Date(`${s.day}T${s.time}:00+09:00`),end=new Date(+start+Math.max(s.duration||30,5)*60000),lead=(s.travelMinutes??20)+(s.arrivalBuffer??15);
   lines.push('BEGIN:VEVENT',`UID:${s.id}@pasfield-japan`,`DTSTAMP:${now}`,`DTSTART:${icsStamp(start)}`,`DTEND:${icsStamp(end)}`,`SUMMARY:${icsEsc(s.title)}`,`LOCATION:${icsEsc(s.place)}`,
    `DESCRIPTION:${icsEsc(`Fixed booking. Leave by ${japanClock(new Date(+start-lead*60000))}.${s.notes?`\n${s.notes}`:''}`)}`,`URL:${origin}/?day=${s.day}&step=${s.id}`,
    'BEGIN:VALARM',`TRIGGER:-PT${lead}M`,'ACTION:DISPLAY',`DESCRIPTION:${icsEsc(`Leave now for ${s.title}`)}`,'END:VALARM',
    'BEGIN:VALARM','TRIGGER:-PT10M','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(`${s.title} in 10 minutes`)}`,'END:VALARM','END:VEVENT');
  }
 }
 // Booking windows: the moment a booking opens, with an alert the day before, a quarter of an
 // hour before and on the minute, because the good ones are gone in the first few minutes. The
 // calendar does the waking; the phone says it in whatever time zone it is in.
 for(const w of state.bookingWindows||[]){
  if(w.bookedAt||!Number.isFinite(Date.parse(w.opensAt)))continue;
  const start=new Date(w.opensAt),end=new Date(+start+15*60000);
  lines.push('BEGIN:VEVENT',`UID:window-${w.id}@pasfield-japan`,`DTSTAMP:${now}`,`DTSTART:${icsStamp(start)}`,`DTEND:${icsStamp(end)}`,`SUMMARY:${icsEsc(`Booking opens: ${w.title}`)}`,
   `DESCRIPTION:${icsEsc(`${japanClock(start)} Japan time.${w.notes?`\n${w.notes}`:''}${w.url?`\n${w.url}`:''}`)}`,`URL:${w.url||`${origin}/?tab=windows`}`,
   'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(`Tomorrow: ${w.title} opens`)}`,'END:VALARM',
   'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(`${w.title} opens in 15 minutes`)}`,'END:VALARM',
   'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(`${w.title} is open now`)}`,'END:VALARM','END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 return lines.map(icsFold).join('\r\n')+'\r\n';
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
// How far off the trip is, counted in Japan's calendar days so the number turns over at midnight
// in Tokyo rather than wherever the phone happens to be. Before we fly it counts down; once we
// land it says which day of the trip this is and how many are left; after, it says we are home.
const dayGap=(from,to)=>Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000);
export function tripCountdown(days,today=japanDate()){
 const dates=(days||[]).map(d=>d.date).filter(Boolean).sort(),first=dates[0],last=dates.at(-1);
 if(!first)return null;
 const total=dayGap(first,last)+1;
 if(today<first){const n=dayGap(today,first);return {phase:'before',days:n,total,text:n===1?'Tomorrow we fly!':`${n} days to go`};}
 if(today>last)return {phase:'after',days:0,total,text:'Home again'};
 const day=dayGap(first,today)+1,left=total-day;
 return {phase:'during',day,days:left,total,text:`Day ${day} of ${total}`,sub:left===0?'Our last day':left===1?'1 more day after today':`${left} more days after today`};
}
// A day is behind us once every stop on it is settled, or once Japan's calendar has moved past it.
export const dayBehind=(state,date,today=japanDate())=>dayProgress(state,date).finished||date<today;
