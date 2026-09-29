// Push notifications: what the phones should be told, and when. This is the list of moments —
// the leave-by time for each fixed booking, a booking window a quarter of an hour before it opens
// and on the minute, and a short briefing at half past seven each trip morning — worked out from
// the trip alone, so the server can ask "what fell due since I last looked?" and never send the
// same thing twice. Each has a key that names it for good; a key already sent is not sent again.
import {activeSteps,japanClock} from './timing.js';
import {dayBriefing} from './briefing-data.js';
export const PUSH_KINDS=[
 ['leave','Time to leave','The leave-by time for each fixed booking'],
 ['windows','Booking windows','15 minutes before a booking opens, and when it opens (parents)'],
 ['changes','Plan changes','When someone else changes the plan'],
 ['morning','Morning briefing','At 7:30 each trip morning, the day in a line']
];
export const PUSH_KIND_IDS=PUSH_KINDS.map(([id])=>id);
export const MORNING_AT='07:30';
const at=(day,time)=>Date.parse(`${day}T${time}:00+09:00`);
// Every moment in the trip worth a notification, as {key, kind, at (ms), title, body, url, to}.
// `to` is a list of names, or null for the whole family.
export function pushMoments(state){
 const out=[];
 for(const d of state.days||[]){
  for(const s of activeSteps(state,d.date)){
   if(!s.locked||!s.time||['done','skipped'].includes(s.status))continue;
   const start=at(d.date,s.time),lead=(s.travelMinutes??20)+(s.arrivalBuffer??15);
   out.push({key:`leave|${s.id}|${d.date}|${s.time}`,kind:'leave',at:start-lead*60000,title:`Time to leave for ${s.title}`,
    body:`It starts at ${s.time}. Leave now to be there with ${s.arrivalBuffer??15} minutes to spare.`,url:`/?day=${d.date}&step=${s.id}`,to:s.participants?.length?[...s.participants]:null});
  }
  const b=dayBriefing(state,d.date);
  if(b)out.push({key:`morning|${d.date}`,kind:'morning',at:at(d.date,MORNING_AT),title:`Day ${b.dayNumber} of ${b.total} · ${b.city}`,
   body:[b.stops?`${b.stops} stop${b.stops===1?'':'s'}${b.starts?`, from ${b.starts}`:''}`:'A free day',b.fixed.length?`fixed: ${b.fixed.map(f=>`${f.time} ${f.title}`).join(', ')}`:'',b.weather?`${b.weather.icon} ${b.weather.max}°`:''].filter(Boolean).join(' · '),url:`/?day=${d.date}`,to:null});
 }
 const parents=(state.members||[]).filter(n=>['Damien','Lauren'].includes(n));
 for(const w of state.bookingWindows||[]){
  if(w.bookedAt||!Number.isFinite(Date.parse(w.opensAt)))continue;
  const open=Date.parse(w.opensAt);
  out.push({key:`window-soon|${w.id}|${w.opensAt}`,kind:'windows',at:open-15*60000,title:`${w.title} opens in 15 minutes`,body:`At ${japanClock(new Date(open))} Japan time. Have the booking page open.`,url:w.url||'/?tab=windows',to:parents});
  out.push({key:`window-open|${w.id}|${w.opensAt}`,kind:'windows',at:open,title:`${w.title} is open now`,body:w.notes||'Book it before it goes.',url:w.url||'/?tab=windows',to:parents});
 }
 return out.sort((a,b)=>a.at-b.at);
}
// What fell due after `since` and up to `now`. Anything more than an hour late is let go rather
// than sent: a leave-by alert for a train that has left is worse than none.
export const PUSH_LATE_LIMIT=60*60000;
export function duePushes(state,since,now){
 const from=Math.max(since,now-PUSH_LATE_LIMIT);
 return pushMoments(state).filter(m=>m.at>from&&m.at<=now);
}
// Whether a subscription wants a moment: the right person, and the kind switched on.
export const wants=(sub,moment)=>(!moment.to||moment.to.includes(sub.name))&&(sub.prefs?.[moment.kind]??true);
