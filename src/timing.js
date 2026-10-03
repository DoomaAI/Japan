// The plan's own clock. Every date and time in the app is the plan's local one: the day a stop
// is on, the clock on the top bar, the leave-by minute. That used to be Japan, written into
// each call; now it is whatever time zone the plan record names (src/plan-context.js), set once
// when the plan is read on the server or arrives on the phone. The names japanDate and
// japanClock stay, because sixty files say them; planDate and planClock are the same functions.
let zone='Asia/Tokyo';
export const planZone=()=>zone;
export const setPlanZone=z=>{zone=z||'Asia/Tokyo';};
export const japanDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const japanClock=(date=new Date())=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
export const planDate=japanDate,planClock=japanClock;
// The instant a plan-local day and clock time name, worked out from the zone's offset at that
// moment rather than a fixed +09:00, so a dinner in Sydney lands in the calendar at the right
// hour on either side of daylight saving.
export function zoneOffsetMinutes(date,z=zone){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:z,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const asUtc=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour%24,parts.minute,parts.second);
 return Math.round((asUtc-Math.floor(date.getTime()/1000)*1000)/60000);
}
export function zonedInstant(day,time,z=zone){
 const [y,m,d]=day.split('-').map(Number),[h,mi]=(time||'00:00').split(':').map(Number);
 const guess=Date.UTC(y,m-1,d,h,mi);
 const first=new Date(guess-zoneOffsetMinutes(new Date(guess),z)*60000);
 return new Date(guess-zoneOffsetMinutes(first,z)*60000);
}
// A plan date moved on (or back) by whole days, at midday UTC so no zone can tip it over.
export const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const minutes=t=>t?Number(t.slice(0,2))*60+Number(t.slice(3)):null;
export const asClock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
// A timed entry: a booked time that opens a window rather than naming a minute. A Vacation
// Package ride or a DPA return time lets us in at any point in the hour from the time printed on
// it, so the stop is on time until the window closes. `windowMinutes` is that length (0 or none
// for a time that is exact, like a restaurant table), and it counts from the booking time.
export const WINDOW_CHOICES=[0,15,30,45,60,90,120];
export const MAX_WINDOW=240;
export const windowOf=step=>{
 const n=Number(step?.windowMinutes)||0,from=step?.bookingTime||step?.time;
 if(n<=0||!from)return null;
 const start=minutes(from),end=Math.min(start+n,1439);
 return {start,end,minutes:n,from:asClock(start),until:asClock(end)};
};
export const windowText=step=>{const w=windowOf(step);return w?`${w.from}–${w.until}`:'';};
// The latest a stop can begin and still be on time: the end of its window, else its own time.
export const latestStart=step=>windowOf(step)?.end??minutes(step?.bookingTime||step?.time);
// A group is either alternatives, where only the chosen option is on the day, or a split, where
// every option is on the day because each is somebody's (see split.js).
export const activeSteps=(state,day)=>state.steps.filter(s=>s.day===day&&(!s.group||state.groupModes?.[s.group]==='split'||!state.choices[s.group]||state.choices[s.group]===s.option)).sort((a,b)=>a.order-b.order);
// Adjusting the rest of a day. Each unfinished flexible stop can be left out of the move, given
// a new length, or skipped; and with `squeeze` on, the stops being moved close up their gaps and,
// if that is not enough, are shortened just enough to finish by the next fixed time.
// Each problem comes back as an issue naming the stop, so the panel can offer the fix beside it.
const MOVABLE_OUT=['done','started','skipped'];
export const movableStep=s=>!s.locked&&!!s.time&&!MOVABLE_OUT.includes(s.status);
const fixedAhead=s=>s.locked&&s.time&&!['done','skipped'].includes(s.status);
export function scheduleProposal(steps,delta,opts={}){
 const skip=new Set(opts.skip||[]),lengths=opts.durations||{},only=opts.move?new Set(opts.move):null;
 const moving=s=>!only||only.has(s.id);
 const issues=[],plan=new Map(),skipped=[];
 for(const s of steps){
  if(!movableStep(s))continue;
  if(skip.has(s.id)){skipped.push(s.id);continue;}
  const d=Number.isFinite(Number(lengths[s.id]))&&lengths[s.id]!==''?Math.max(0,Math.round(Number(lengths[s.id]))):(s.duration||0);
  const t=minutes(s.time)+(moving(s)?delta:0);
  if(t<0||t>=1440){issues.push({id:s.id,kind:'outside',text:`${s.title}: would move outside this day.`});continue;}
  plan.set(s.id,{t,d,moved:moving(s)&&delta!==0});
 }
 if(opts.squeeze){
  // Each run of moved stops before a fixed time is scaled to the room left before it opens.
  let run=[];
  for(const s of steps){
   if(plan.get(s.id)?.moved)run.push(s);
   if(!fixedAhead(s))continue;
   const deadline=latestStart(s);
   if(run.length){
    // Close the gaps from the booking backwards first; only if that is not enough are the
    // longest stops trimmed, five minutes at a time, until the run just fits.
    const ps=run.map(r=>plan.get(r.id)),start=ps[0].t;
    const pack=()=>{let limit=deadline;for(let k=ps.length-1;k>=0;k--){const p=ps[k];p.nt=Math.min(p.t,limit-p.nd);limit=p.nt;}return start-ps[0].nt;};
    for(const p of ps)p.nd=p.d;
    const over=pack();
    if(over>0){
     for(let left=over;left>0;left-=5){const p=ps.reduce((a,b)=>b.nd>(a?.nd??5)?b:a,null);if(!p)break;p.nd-=5;}
     pack();
    }
    let cursor=start;
    for(const p of ps){const t=Math.max(p.nt,cursor);if(t!==p.t||p.nd!==p.d)p.squeezed=true;p.t=t;p.d=p.nd;cursor=t+p.d;delete p.nt;delete p.nd;}
   }
   run=[];
  }
 }
 const ordered=steps.filter(s=>plan.has(s.id));
 const changed=s=>{const p=plan.get(s.id);return p.t!==minutes(s.time)||p.d!==(s.duration||0);};
 for(const [i,s]of steps.entries()){
  const p=plan.get(s.id);
  if(!p||!changed(s))continue;
  const next=steps.slice(i+1).find(fixedAhead);
  if(next&&p.t+p.d>latestStart(next)){const over=p.t+p.d-latestStart(next);issues.push({id:s.id,kind:'fixed',over,blocking:true,with:next.id,text:`${s.title} runs ${spanWords(over)} into ${next.title} at ${windowText(next)||next.time}.`});}
  const previous=steps.slice(0,i).reverse().find(n=>n.locked&&n.time&&n.status!=='skipped');
  if(previous&&p.t<minutes(previous.time)+(previous.duration||0))issues.push({id:s.id,kind:'before',blocking:true,with:previous.id,text:`${s.title} would start before ${previous.title} has finished.`});
  // A stop left where it is can now be crowded by one that moved; that is worth saying, but it
  // is the family's call, so it does not stop the change.
  const j=ordered.indexOf(s),after=ordered[j+1];
  if(after&&!steps.slice(i+1,steps.indexOf(after)).some(fixedAhead)){
   const q=plan.get(after.id),now=p.t+p.d-q.t,was=minutes(s.time)+(s.duration||0)-minutes(after.time);
   if(now>0&&now>was)issues.push({id:s.id,kind:'flex',over:now,blocking:false,with:after.id,text:`${s.title} would overlap ${after.title} by ${spanWords(now)}.`});
  }
 }
 for(const i of issues)if(i.kind==='outside')i.blocking=true;
 const changes=[...ordered.filter(changed).map(s=>{const p=plan.get(s.id),c={id:s.id,time:asClock(p.t)};if(p.d!==(s.duration||0))c.duration=p.d;return c;}),...skipped.map(id=>({id,skip:true}))];
 const unique=[...new Map(issues.map(i=>[i.text,i])).values()];
 return {changes,issues:unique,conflicts:unique.filter(i=>i.blocking).map(i=>i.text),squeezed:[...plan].filter(([,p])=>p.squeezed).map(([id])=>id)};
}
const icsStamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
const icsEsc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
// A calendar line longer than 75 characters is continued on the next line after a space; a
// calendar app that does not fold is a calendar app that drops the event.
const icsFold=line=>{const out=[];let s=line;while(s.length>72){out.push(s.slice(0,72));s=' '+s.slice(72);}out.push(s);return out.join('\r\n');};
export function calendarEvent(step){
 if(!step.time)return null;
 const start=zonedInstant(step.day,step.time),end=new Date(+start+Math.max(step.duration||30,5)*60000);
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pasfield//Japan Trip//EN','BEGIN:VEVENT',`UID:${step.id}@pasfield-japan`,`DTSTAMP:${icsStamp(new Date())}`,`DTSTART:${icsStamp(start)}`,`DTEND:${icsStamp(end)}`,`SUMMARY:${icsEsc(step.title)}`,`LOCATION:${icsEsc(step.place)}`,`DESCRIPTION:${icsEsc(step.notes)}`,`URL:${location.origin}/?day=${step.day}&step=${step.id}`,'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Trip reminder','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
}
// The whole trip as one calendar a phone subscribes to once: a line across each day saying where
// we are and where we sleep, and every fixed booking as a timed event with two alerts — one at
// the leave-by time, worked out the same way the Home card works it out, and one ten minutes
// before the booking itself. The phone's own Calendar then does what the app cannot: it says so
// on the lock screen with the app closed. Booking references stay out of it; a calendar is shared
// more casually than the app is. The phone asks for a fresh copy about once an hour.
export function calendarFeed(state,origin=''){
 const now=icsStamp(new Date()),lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pasfield//Japan Trip//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${icsEsc(state.plan?.title||state.tripName||'Our plan')}`,`X-WR-TIMEZONE:${zone}`,'REFRESH-INTERVAL;VALUE=DURATION:PT1H','X-PUBLISHED-TTL:PT1H'];
 for(const d of state.days){
  const after=new Date(`${d.date}T00:00:00Z`);after.setUTCDate(after.getUTCDate()+1);
  lines.push('BEGIN:VEVENT',`UID:day-${d.date}@pasfield-japan`,`DTSTAMP:${now}`,`DTSTART;VALUE=DATE:${d.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${after.toISOString().slice(0,10).replace(/-/g,'')}`,`SUMMARY:${icsEsc(`${d.title} · ${d.city}`)}`,`LOCATION:${icsEsc(d.hotel)}`,`URL:${origin}/?day=${d.date}`,'TRANSP:TRANSPARENT','END:VEVENT');
  for(const s of activeSteps(state,d.date)){
   if(!s.locked||!s.time||s.status==='skipped')continue;
   const start=zonedInstant(s.day,s.time),end=new Date(+start+Math.max(s.duration||30,5)*60000),lead=(s.travelMinutes??20)+(s.arrivalBuffer??15);
   lines.push('BEGIN:VEVENT',`UID:${s.id}@pasfield-japan`,`DTSTAMP:${now}`,`DTSTART:${icsStamp(start)}`,`DTEND:${icsStamp(end)}`,`SUMMARY:${icsEsc(s.title)}`,`LOCATION:${icsEsc(s.place)}`,
    `DESCRIPTION:${icsEsc(`Fixed booking${windowOf(s)?`, entry window ${windowText(s)}`:''}. Leave by ${japanClock(new Date(+start-lead*60000))}.${s.notes?`\n${s.notes}`:''}`)}`,`URL:${origin}/?day=${s.day}&step=${s.id}`,
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
 const target=zonedInstant(step.day,step.time).getTime()+Math.max(step.duration||0,0)*60000;
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
 const targeted=step?.day&&step?.time?zonedInstant(step.day,step.time).getTime():null;
 const until=new Date(Math.max(targeted??when.getTime(),when.getTime())+duration*60000);
 return {minutes:duration,until:japanClock(until),text:`We plan to stay about ${spanWords(duration)}, moving on around ${japanClock(until)}.`};
}
// The completion time as a phone's time input wants it, and back again. A step is finished on the
// day it sits on, in Japan time, which is the only reading of "14:20" that means anything to a
// family standing in Kyoto — whatever the phone showing it is set to.
export const doneClock=step=>step?.completedAt?japanClock(new Date(step.completedAt)):'';
export const doneStamp=(step,clock)=>zonedInstant(step?.day,clock);
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
