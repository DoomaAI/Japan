import {activeSteps,japanDate,japanClock,minutes,windowOf,zonedInstant} from './timing.js';
import {stepsFor} from './split.js';
import {nextSummary} from './trip-features.js';
import {LINES,routeFor,routeMinutes} from './route-data.js';
import {sayTime} from './ask-voice.js';
// The questions somebody walking between stops actually asks, answered from the plan on the
// phone: what is next, how long until something, how do we get there, anything to know. They
// need no model, no search and no signal, so they come back at once — through AirPods, from a
// Siri Shortcut, or typed — and anything they cannot settle goes to the Concierge as before.
// Nothing here changes the plan. Every answer is built from what the plan says, never guessed:
// a stop it cannot find by name is not an answer, it is a question for the Concierge.
const tidy=v=>String(v??'').replace(/\s+/g,' ').trim();
const said=text=>tidy(text).toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?;:"“”]/g,' ').replace(/\s+/g,' ').trim();
const open=s=>!['done','skipped'].includes(s.status);
const when=s=>s.bookingTime||s.time||null;
// "1 hr 20 min" is for reading; out loud it is "an hour and 20 minutes".
export function saySpan(m){
 const n=Math.round(Math.abs(m)),h=Math.floor(n/60),r=n%60;
 const hours=h===1?'an hour':`${h} hours`,mins=`${r} minute${r===1?'':'s'}`;
 if(n<1)return 'no time at all';
 if(h===0)return mins;
 return r?`${hours} and ${mins}`:hours;
}
// The words that name nothing. What is left is the name of the stop being asked about.
const FILLER=new Set(['the','a','an','to','at','for','our','my','we','i','us','me','get','go','going','there','do','does','is','it','of','on','in','into','from','until','till','til','before','next','stop','place','please','can','you','tell','how','what','when','where','start','starts','time','today','tonight','this','that','with','by','up','have','we\'ve','long','much','left','need','leave','reach','arrive','arriving','be','will','should','directions','way','route','take','find','nearest']);
const words=text=>said(text).split(' ').filter(w=>w&&!FILLER.has(w));
// The stop a few words name, from the day in hand first: still to come, then done, then the rest
// of the trip. Only a real word in the stop's name or place counts, and the best share of the
// words asked wins — "the tea ceremony" finds Tea ceremony at Camellia, not every stop with "the".
export function findStop(state,day,text,person=null,{better=(a,b)=>TRAVEL.test(a.title)&&!TRAVEL.test(b.title)}={}){
 const want=words(text).filter(w=>w.length>=3||/^\d+$/.test(w));
 if(!want.length)return null;
 const today=stepsFor(state,day,person),later=state.steps.filter(s=>s.day>day).sort((a,b)=>a.day.localeCompare(b.day)||a.order-b.order);
 const pool=[...today.filter(open),...today.filter(s=>!open(s)),...later.filter(s=>activeSteps(state,s.day).includes(s))];
 let best=null,bestScore=0;
 for(const s of pool){
  const hay=said(`${s.title} ${s.place||''}`),hit=want.filter(w=>hay.split(' ').some(h=>h===w||(w.length>=4&&h.startsWith(w))||(h.length>=4&&w.startsWith(h)))).length;
  const score=hit/want.length;
  // On a tie the stop itself beats the walk to it — "when is dinner" is the table, not the
  // stroll — unless the question is the way there, when the stop with the route wins.
  if(hit&&(score>bestScore||(score===bestScore&&better(best,s)))){best=s;bestScore=score;}
 }
 return bestScore>=.5?best:null;
}
const TRAVEL=/^(walk|leave|head|taxi|subway|train|bus|return|transfer|go)\b/i;
const hotelWords=/\b(hotel|room|check ?in|bed|where we're staying|where we are staying)\b/;
// What kind of question it is, and what it is about. Null for anything else, which goes on to
// the Concierge unchanged.
export function quickIntent(question){
 const q=said(question);
 if(!q||q.length>160)return null;
 if(/^(what('s| is)? the )?time( is it)?( now)?( in japan)?$|^what time is it/.test(q))return {kind:'clock'};
 let m;
 if((m=/\b(?:how do (?:i|we) get to|how (?:do|can|should) (?:i|we) get to|how to get to|directions? to|take (?:me|us) to|the way to|route to|get me to|navigate to|how far is(?: it to)?)\s*(.*)$/.exec(q)))return {kind:'directions',target:m[1]};
 if(/\bhow do (?:i|we) get there\b|\bdirections\b$|^directions$|\bwhich way\b/.test(q))return {kind:'directions',target:''};
 if((m=/\bwhen do (?:we|i) (?:need to |have to |should )?(?:leave|go|head off)(?: for)?\s*(.*)$/.exec(q)))return {kind:'leave',target:m[1]};
 if((m=/\bhow (?:long|much time|many minutes|many hours)(?: (?:do|have) (?:i|we)(?: got| have)?)?(?: left)?(?: (?:until|till|til|before|to)\b)\s*(.*)$/.exec(q)))return {kind:'until',target:m[1]};
 if((m=/\bwhen (?:is|does|do we have|are we at|do we do)\s+(.*?)(?:\s+(?:start|begin|on))?$/.exec(q))&&!/\b(open|close|shut)\b/.test(q))return {kind:'until',target:m[1]};
 if(/\b(what'?s|what is|whats) (?:next|after this|after that|coming up|on next|up next)\b|\bwhat (?:are we|do we|am i) (?:doing|do) next\b|\bwhere (?:are we|am i) (?:going|off to)(?: next)?\b|\bnext (?:stop|thing|up)\b|^next$|^up next$|^what now$|\bwhat'?s the plan\b/.test(q))return {kind:'next'};
 if(/\b(any )?tips?\b|\bwhat should (?:i|we) know\b|\banything (?:i|we) should know\b|\bheads up\b/.test(q)&&!/\btip(ping)?\b.*\b(restaurant|waiter|taxi|driver)\b|\bshould (?:i|we) tip\b/.test(q))return {kind:'tips',target:q.replace(/.*\b(?:tips?|know)\b\s*(?:for|about|at)?\s*/,'')};
 return null;
}
// "It is at" only when the place says something the stop's name does not.
const placeNote=x=>{if(!x?.place)return '';const t=said(x.title),p=said(x.place);return t.includes(p)||p.includes(t)?'':`It is at ${x.place}.`;};
const stopTime=s=>{const t=when(s);return t?sayTime(t):'';};
// One leg, as you would tell somebody beside you: the walk as the guide wrote it, the train by
// its line, which way and where to get off.
export function sayLeg(leg){
 const mins=leg.minutes||leg.options?.[0]?.minutes||0,about=mins?`, about ${saySpan(mins)}`:'';
 if(leg.mode==='ride'){
  const line=LINES[leg.line]?.name||'the train',towards=tidy(String(leg.towards||'').replace(/\s*[（(][^)）]*[)）]/g,'').split(/[;.]/)[0]);
  return `Take the ${line} from ${leg.from} to ${leg.to}${towards?`, towards ${towards}`:''}${about}.${leg.exit?` ${tidy(String(leg.exit).replace(/\s*[（(][^)）]*[)）]/g,'')).split(/(?<=\.)\s/)[0]}`:''}`;
 }
 const text=tidy(String(leg.text||'').replace(/\s*[（(][^)）]*[)）]/g,''));
 const how={walk:'Walk',taxi:'Taxi',stop:'On the way',other:'Then'}[leg.mode]||'Then';
 return text?`${how}: ${text.replace(/\.$/,'')}${about}.`:`${how}${about}.`;
}
const mapsFor=(place,mode='transit')=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}&travelmode=${mode}`;
const cap=v=>{const t=tidy(v);return t.charAt(0).toUpperCase()+t.slice(1);};
const answer=(verdict,text,extra={})=>({verdict:cap(verdict),answer:tidy(text),because:[],days:extra.days||[],checkFirst:'',sources:[],quick:true,...extra});
// What is on now and what is next for this person on this day. A stop under way is "now" and
// the one after it is next. With nothing started, today goes by the clock as well as the ticks:
// a stop whose planned time is long gone and was never ticked is not what is next, because
// nobody walking to dinner wants to hear about breakfast. Any other day goes by the ticks alone.
export const LATE_GRACE=30;
function nowAndNext(state,day,person,now){
 const {current}=nextSummary(state,day,person);
 const steps=stepsFor(state,day,person),rest=steps.filter(open);
 const started=rest.find(s=>s.status==='started');
 if(started)return {started,next:rest[rest.indexOf(started)+1]||null,rest};
 if(day!==japanDate(now))return {started:null,next:current||null,rest};
 const clock=minutes(japanClock(now));let last=null;
 const due=rest.find(s=>{
  const w=windowOf(s),t=w?w.end:minutes(when(s))??last;
  if(minutes(when(s))!==null)last=minutes(when(s));
  return t===null||t+(w?0:Math.max(s.duration||0,LATE_GRACE))>=clock;
 });
 return {started:null,next:due||current||null,rest};
}
function untilText(step,now){
 const t=when(step);
 if(!t)return {text:`${step.title} has no set time${step.place?`; it is at ${step.place}`:''}.`};
 const at=zonedInstant(step.day,t),gap=Math.round((at.getTime()-now.getTime())/60000);
 const w=windowOf(step);
 if(gap>=1){
  const day=step.day===japanDate(now)?'':` on ${new Intl.DateTimeFormat('en-AU',{weekday:'long',timeZone:'Asia/Tokyo'}).format(at)}`;
  const span=gap>=36*60?`${Math.round(gap/1440)} days`:saySpan(gap);
  return {gap,text:`${span} until ${step.title}, at ${sayTime(t)}${day}${w?`, and you can go in any time until ${sayTime(w.until)}`:''}.`};
 }
 if(w){const left=Math.round((zonedInstant(step.day,w.until).getTime()-now.getTime())/60000);
  if(left>=1)return {gap,text:`${step.title} is open to you now: you have ${saySpan(left)}, until ${sayTime(w.until)}.`};}
 return {gap,text:`${step.title} was due at ${sayTime(t)}, ${saySpan(-gap)} ago.`};
}
// The answer, or null when the Concierge should answer it instead.
export function quickAnswer(state,question,{person=null,now=new Date(),day=null}={}){
 const intent=quickIntent(question);
 if(!intent||!state?.days?.length)return null;
 const today=japanDate(now),onTrip=state.days.some(d=>d.date===today);
 const date=onTrip?today:day&&state.days.some(d=>d.date===day)?day:null;
 if(intent.kind==='clock')return answer(`It is ${sayTime(japanClock(now))} in Japan.`,'');
 if(!date)return null;
 const dayRow=state.days.find(d=>d.date===date);
 const {started,next,rest}=nowAndNext(state,date,person,now);
 const target=tidy(intent.target||'');
 const named=target&&!/^(it|there|here|next|the next( one| stop)?|this|that)$/.test(said(target))?target:'';
 if(intent.kind==='next'){
  if(!rest.length)return answer('That is everything on today’s plan.',dayRow?.hotel?`The night is at ${dayRow.hotel}.`:'',{days:[date]});
  const n=next;
  if(!n)return answer(`${started.title} is the last thing today.`,dayRow?.hotel?`After that, back to ${dayRow.hotel}.`:'',{days:[date],step:started.id});
  const u=untilText(n,now),after=rest[rest.indexOf(n)+1];
  const nextLine=x=>{const g=untilText(x,now).gap;return `${x.title}${stopTime(x)?` at ${stopTime(x)}`:''}${g>=1&&g<36*60?`, in ${saySpan(g)}`:''}`;};
  const go=x=>x.place?{url:mapsFor(x.place),label:`Directions to ${x.place}`}:null;
  // Its time has come and it has not been ticked: it is what is on now, and the next is after it.
  if(u.gap!==undefined&&u.gap<1&&after)return answer(`Now: ${n.title}, from ${stopTime(n)}.`,
   `Next is ${nextLine(after)}. ${placeNote(after)}`,{days:[date],step:after.id,link:go(after)});
  return answer(`Next is ${nextLine(n)}.`,
   [placeNote(n),n.locked?'It is booked.':'',
    routeFor(n)?.length?'Ask “how do we get there” for the way.':'',after?`After that, ${after.title}${stopTime(after)?` at ${stopTime(after)}`:''}.`:''].join(' '),
   {days:[date],step:n.id,link:go(n)});
 }
 if(intent.kind==='leave'){
  const s=named?findStop(state,date,named,person):null;
  const {fixed,departure}=nextSummary(state,date,person);
  const goal=s||fixed;
  if(!goal)return null;
  const legs=routeFor(goal),travel=legs?.length?routeMinutes(legs):(goal.travelMinutes??20);
  const t=when(goal);if(!t)return null;
  const leaveAt=s&&s!==fixed?new Date(zonedInstant(goal.day,t).getTime()-(travel+10)*60000):departure;
  const gap=Math.round((leaveAt.getTime()-now.getTime())/60000);
  const clock=sayTime(japanClock(leaveAt));
  return answer(gap>0?`Leave by ${clock}, ${saySpan(gap)} from now.`:`You should be on your way now: leaving by ${clock} was the plan.`,
   `That is for ${goal.title} at ${sayTime(t)}, allowing ${saySpan(travel)} to get there and a little to spare.`,{days:[goal.day],step:goal.id});
 }
 if(intent.kind==='until'){
  const s=named?findStop(state,date,named,person):next;
  if(!s)return null;
  const u=untilText(s,now);
  if(u.gap===undefined)return answer(u.text,'',{days:[s.day],step:s.id});
  return answer(u.text,s.place&&u.gap>0?`It is at ${s.place}.`:'',{days:[s.day],step:s.id});
 }
 if(intent.kind==='directions'){
  let s=named?findStop(state,date,named,person,{better:(a,b)=>!routeFor(a)?.length&&!!routeFor(b)?.length}):next;
  // Tonight's bed is a place, not a stop: the hotel on the day, unless a stop is the check-in.
  if(!s&&named&&hotelWords.test(said(named))&&dayRow?.hotel)
   return answer(`To ${dayRow.hotel}.`,'Directions are on the screen, from wherever you are standing.',{days:[date],link:{url:mapsFor(dayRow.hotel),label:`Directions to ${dayRow.hotel}`}});
  if(!s)return null;
  const legs=routeFor(s)||[],place=s.place||s.title;
  const link={url:mapsFor(place),label:`Directions to ${place}`};
  if(!legs.length)return answer(`${s.title} is at ${place}.`,'There is no route written for it in the plan, so Maps has the way: directions are on the screen.',{days:[s.day],step:s.id,link});
  const total=routeMinutes(legs);
  return answer(`To ${s.title}: about ${saySpan(total)}, in ${legs.length} ${legs.length===1?'step':'steps'}.`,legs.map(sayLeg).join(' '),{days:[s.day],step:s.id,link});
 }
 if(intent.kind==='tips'){
  const s=named?findStop(state,date,named,person):(started||next);
  if(!s?.notes)return null;
  const w=windowOf(s);
  return answer(`For ${s.title}:`,`${tidy(s.notes)}${s.locked?' It is booked.':''}${w?` You can go in any time between ${sayTime(w.from)} and ${sayTime(w.until)}.`:''}`,{days:[s.day],step:s.id});
 }
 return null;
}
// What is read out: the verdict and the answer, as one thing to hear. An English voice cannot
// read the Japanese on a sign, so a sentence carrying some is left to the screen and said once.
const JAPANESE=/[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/;
export function quickSpoken(item){
 const text=[item?.verdict,item?.answer].map(tidy).filter(Boolean).join(' ');
 const sentences=text.match(/[^.!?]+[.!?]*\s*/g)||[];
 const kept=sentences.filter(x=>!JAPANESE.test(x));
 return tidy(kept.join(' ')+(kept.length<sentences.length?' The Japanese to look for is on the screen.':''));
}
