// Tomorrow's check and Plan B: the night-before pass a Japan specialist would make. It runs on a
// schedule in the Japan evening, reads tomorrow's stops, and searches for what would derail them —
// a Monday museum closure, a national holiday, a last entry earlier than the plan assumes, rail
// works on the line we are taking, a typhoon or heavy-rain warning. What it finds is written onto
// the day as notes a parent accepts or dismisses; nothing in the plan moves.
//
// Plan B is made in the same pass and kept in the trip for no signal: the nearest indoor
// alternative to each stop, and somewhere to sit down with a five-year-old who has had enough.
//
// The two are separate calls, run side by side, each saved as it lands: the function has sixty
// seconds, and a check that finishes should not be lost because the fallbacks ran long.
import {AppError} from './model.mjs';
import {withGuide} from '../src/guide-data.js';
import {updateTrip} from './store.mjs';
import {seenHosts,checkedLink} from './links.mjs';
import {weatherLine} from './ask.mjs';
import {movesOf,cleanMoveCheck,forwardingPlanned} from '../src/move-data.js';
import {stayFor} from '../src/stay-data.js';
import {INSIDER_FIELDS,insiderWanted,cleanInsider} from '../src/insider-data.js';
import {activeSteps,japanDate,windowText} from '../src/timing.js';
import {NOTE_KIND_IDS,PLAN_B_REASONS,REST_KINDS,cleanDayCheck,cleanPlanB,keepChecks,spareIdeas} from '../src/day-check.js';
export const tomorrowReady=()=>!!process.env.ANTHROPIC_API_KEY;
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
const SEARCH={type:'web_search_20260209',name:'web_search',user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const source={type:'object',additionalProperties:false,required:['title','url'],properties:{title:{type:'string'},url:{type:'string'}}};
const CHECK={
 name:'record_check',
 description:'Record what the check found about the day, once, at the end.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['summary','notes'],properties:{
  summary:{type:'string',description:'One line a parent reads at dinner: "Nothing to worry about" or the one thing that matters most.'},
  notes:{type:'array',description:'Only what would change what they do tomorrow, most urgent first. Empty when the day is clear — an empty list is a good answer.',items:{
   type:'object',additionalProperties:false,required:['kind','stepId','title','detail','act','sources'],properties:{
    kind:{type:'string',enum:NOTE_KIND_IDS},
    stepId:{type:'string',description:'The id in square brackets of the stop this is about, exactly as given. Empty if it is about the whole day.'},
    title:{type:'string',description:'The problem in a few words. "Closed on Mondays", "Last entry 16:00", "Heavy rain from noon".'},
    detail:{type:'string',description:'One or two sentences: what you found, and what they could do about it.'},
    act:{type:'boolean',description:'True if they need to do something before tomorrow (book, swap, set out earlier). False if it is only worth knowing.'},
    sources:{type:'array',items:source,description:'The pages you actually opened that say so. A note without one is dropped.'}}}}}}
};
const PLANB={
 name:'record_plan_b',
 description:'Record the fallbacks for the day, once, at the end.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['stops','rest'],properties:{
  stops:{type:'array',description:'For the outdoor or weather-exposed stops, and any likely to be shut or full: one alternative near each, indoors where rain is the risk.',items:{
   type:'object',additionalProperties:false,required:['stepId','fromIdea','kind','title','area','japanese','why','walkMinutes'],properties:{
    stepId:{type:'string',description:'The id in square brackets of the stop this replaces, exactly as given. Empty for an idea that fits in if there is time.'},
    fromIdea:{type:'string',description:'When this is one of their own ideas or missed stops, its reference in square brackets exactly as given (idea:… or stop:…). Otherwise empty.'},
    kind:{type:'string',enum:PLAN_B_REASONS.map(([id])=>id)},
    title:{type:'string',description:'The place as a sign outside reads it.'},
    area:{type:'string',description:'The district and nearest station, enough to find it.'},
    japanese:{type:'string',description:'The name in Japanese, to show a taxi driver. Empty rather than guessed.'},
    why:{type:'string',description:'One line: why this one, for this family.'},
    walkMinutes:{type:'integer',description:'Rough walk or short ride in minutes from the stop it replaces.'}}}},
  rest:{type:'array',description:'Two to four places near the day’s stops to sit down with a tired five-year-old: department-store kids’ floors, indoor playgrounds, a café with room, a shady park.',items:{
   type:'object',additionalProperties:false,required:['kind','title','area','japanese','why','walkMinutes'],properties:{
    kind:{type:'string',enum:REST_KINDS.map(([id])=>id)},
    title:{type:'string'},area:{type:'string'},japanese:{type:'string'},why:{type:'string'},
    walkMinutes:{type:'integer',description:'Rough minutes from the nearest stop of the day.'}}}}}}
};
const FAMILY='Damien and Lauren, with their sons Boston (8) and Nate (5), from Australia. They speak no Japanese.';
const CHECK_SYSTEM=`You are the night-before check a good Japan travel specialist makes for one family. ${FAMILY}

You are given tomorrow's stops, each with an id in square brackets. Search for what would derail them tomorrow specifically:
- Closing days. Many Tokyo and Kyoto museums, galleries and gardens close on Mondays, and open on a Monday that is a national holiday and close the Tuesday after. Check the official site for the date given.
- Japanese national holidays on that date, and what they do to crowds and opening days.
- Last entry and closing times earlier than the plan's time for the stop.
- Rail works, suspensions or timetable changes on lines the stops need, from the operator's own notices.
- Typhoon, heavy-rain or heat warnings from the Japan Meteorological Agency or tenki.jp for that area and date. Early October is still typhoon season.
- Where the forecast makes an outdoor stop a bad idea, a swap with another stop that day is a "swap" note.
- Dress rules a venue publishes for itself that would catch them out: shoes off, wading water, no hats or bags on a deck, a costume policy, a dress code at a restaurant. A "dress" note, only where the venue's own page says so; the general etiquette of temples and onsen is already known to them.

Rules:
- Only what changes what they do tomorrow. A day with nothing wrong gets an empty list and a summary that says so. Do not pad.
- Every note needs a page you actually opened that says it. Never invent a URL. A note you cannot source is not a note.
- A booked stop is fixed. Say plainly if something threatens it, and that changing it means going to whoever it was booked with.
- Never say a place is open or a train is running as settled fact beyond what the page says.

Search, then call record_check exactly once. Everything goes in that call.`;
const PLANB_SYSTEM=`You make tomorrow's Plan B for one family, the night before, so it is on their phones with no signal. ${FAMILY}

You are given tomorrow's stops, each with an id in square brackets, and the forecast. For each stop that is outdoors, weather-exposed, or likely to be shut or full, name the nearest good alternative — indoors if rain is the risk — that a five-year-old will manage. Then name two to four places near the day's route to sit down when a five-year-old has had enough: department-store kids' floors, indoor playgrounds, a café with room, a shady park.

They also have their own list: ideas on their planning board that no day has taken yet, stops put back in Options, and stops an earlier day skipped or never got to. Each has a reference in square brackets. Where one of those is near tomorrow's route and would work as a fallback, prefer it to a new place and give its reference in fromIdea — it is something they already wanted. Where one is near enough to fit in on a good day, add it with kind "spare", an empty stepId and its reference. Leave out any that are far from tomorrow's city or route.

Rules:
- Real places you have seen in a search, near the stop they replace. A short walk or one stop on a train, not across the city.
- Indoor stops that will not be affected need no alternative. Leave them out rather than padding.
- Keep "why" to one line about this family: the boys, the weather, the walk.
- Japanese names only where you have seen them. Empty rather than guessed.

Search as needed, then call record_plan_b exactly once.`;
const MOVE={
 name:'record_move',
 description:'Record what you found about the two hotels for this move, once, at the end.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['forwardingCutoff','forwardingWhere','forwardingArrives','forwardingCost','checkOut','bagDrop','checkIn','earlyCheckIn','notes','sources'],properties:{
  forwardingCutoff:{type:'string',description:'The latest time, HH:MM 24-hour, the hotel they are leaving takes bags for delivery by the move day. Empty if not published.'},
  forwardingWhere:{type:'string',description:'Where to hand the bags in (front desk, bell desk, a Yamato counter in the lobby) and which carrier. One line.'},
  forwardingArrives:{type:'string',description:'Whether bags sent the evening before arrive at the next hotel by check-in, and anything that changes that (distance, a resort hotel delivered to the park desk). One line.'},
  forwardingCost:{type:'string',description:'The usual price per suitcase for this distance, said as the estimate it is. Empty if unknown.'},
  checkOut:{type:'string',description:'Check-out time of the hotel they are leaving, HH:MM. Empty if not found.'},
  bagDrop:{type:'string',description:'Whether the next hotel holds bags before check-in, and where. One line.'},
  checkIn:{type:'string',description:'Check-in time of the next hotel, HH:MM. Empty if not found.'},
  earlyCheckIn:{type:'string',description:'Whether early check-in can be asked for or bought, and how. One line.'},
  notes:{type:'string',description:'Anything else that decides the morning: a shuttle, a luggage service from the park, a desk that closes. Two sentences at most.'},
  sources:{type:'array',items:source,description:'The pages you actually opened, best first.'}}}
};
const MOVE_SYSTEM=`You are the concierge for one family's hotel move in Japan. ${FAMILY}

You are given the hotel they are leaving and the one they are going to, with the dates. Search the two hotels' own pages first, then the carrier (Yamato Transport's TA-Q-BIN, Sagawa) and the resort's pages, for:
- luggage forwarding from the hotel they are leaving: where it is done, the cut-off for delivery by the move day, and whether it arrives by check-in at the next hotel;
- check-out time at the one they leave, check-in time at the next;
- whether the next hotel holds bags before check-in, and early check-in.

Only what the pages say. A time you could not find is left empty, never guessed. Search, then call record_move exactly once.`;
export async function moveDay(state,date,now=new Date()){
 const move=movesOf(state).find(m=>m.date===date);if(!move)throw new AppError('That is not a hotel move.',404);
 const from=stayFor(state,new Date(Date.parse(`${date}T12:00:00Z`)-86400000).toISOString().slice(0,10)),to=stayFor(state,date);
 const ask=`The move: ${date}.
Leaving: ${move.from}${from?.address?`, ${from.address}`:''}${from?.japanese?` (${from.japanese})`:''} — ${from?.city||''}.
Going to: ${move.to}${to?.address?`, ${to.address}`:''}${to?.japanese?` (${to.japanese})`:''} — ${to?.city||''}.
The plan has check-out ${from?.checkOut||'not set'} and check-in ${to?.checkIn||'not set'}. ${forwardingPlanned(state,move)?'They plan to forward the cases the evening before.':'They have not said whether they will forward the cases.'}`;
 try{
  const {input,hosts,searches}=await run(withGuide(MOVE_SYSTEM,state,japanDate()),MOVE,ask,5);
  const {value,error}=cleanMoveCheck({...input,sources:(input.sources||[]).map(s=>({title:s?.title,url:checkedLink(s?.url,hosts)}))});
  if(error)throw new AppError(error,502);
  return {check:value,at:now.toISOString(),searches};
 }catch(e){throw apiError(e);}
}
export const saveMove=(date,found)=>updateTrip(state=>({...state,moves:{...(state.moves||{}),[date]:{...(state.moves?.[date]||{}),check:found.check,at:found.at}}}));
// Tomorrow as the model reads it: the city, the hotel, the weather, and every stop with its id so
// a note can point at one. Booked stops say so, because a booking is what the check protects.
export function dayBrief(state,day){
 const d=state.days.find(x=>x.date===day);if(!d)return '';
 const weekday=new Intl.DateTimeFormat('en-AU',{weekday:'long',timeZone:'Asia/Tokyo'}).format(new Date(`${day}T12:00:00+09:00`));
 const steps=activeSteps(state,day).filter(s=>s.status!=='skipped');
 const next=state.days[state.days.findIndex(x=>x.date===day)+1];
 return [`The day: ${weekday} ${day}, in ${d.city} — ${d.title}.${d.hotel?` Staying at ${d.hotel}.`:''}${weatherLine(state,day)}`,
  next&&next.hotel!==d.hotel?`The next morning they move to ${next.hotel}.`:'',
  steps.length?'Their stops, in order:':'Nothing is planned yet.',
  ...steps.slice(0,30).map(s=>`  [${s.id}] ${[s.time||'no set time',s.title,s.place,s.japanese?`(${clamp(s.japanese,80)})`:'',s.duration?`${s.duration} min`:'',s.locked||s.bookingTime?`booked${s.bookingTime?` for ${s.bookingTime}`:''}`:'',windowText(s)?`timed entry: any time ${windowText(s)}`:''].filter(Boolean).join(' · ')}`)]
  .filter(Boolean).join('\n');
}
// Which day "tomorrow" is, in Japan. Run after midnight Japan time by a late scheduler, it would
// otherwise check the day after the one everybody is about to wake up to.
export function tomorrowOf(state,now=new Date()){
 const today=japanDate(now),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hour12:false}).format(now));
 if(hour<4&&state.days.some(d=>d.date===today))return today;
 const next=new Date(`${today}T12:00:00+09:00`);next.setUTCDate(next.getUTCDate()+1);
 const date=next.toISOString().slice(0,10);
 return state.days.some(d=>d.date===date)?date:null;
}
async function run(system,tool,ask,maxUses){
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let message,messages=[{role:'user',content:ask}];const contents=[];
 for(let attempt=0;attempt<3;attempt++){
  message=await client.messages.create({model:'claude-opus-5-5',max_tokens:6000,system,thinking:{type:'adaptive'},output_config:{effort:'low'},
   tools:[{...SEARCH,max_uses:maxUses},tool],messages});
  contents.push(message.content);
  if(message.stop_reason!=='pause_turn')break;
  messages=[...messages,{role:'assistant',content:message.content}];
 }
 const call=message.content.find(b=>b.type==='tool_use'&&b.name===tool.name);
 if(!call?.input)throw new AppError(message.stop_reason==='max_tokens'?'The check ran long and did not finish.':'The check came back empty.',502);
 return {input:call.input,hosts:seenHosts(contents),searches:message.usage?.server_tool_use?.web_search_requests??0};
}
const apiError=e=>{
 if(e instanceof AppError)return e;
 if(e?.status===401)return new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
 if(e?.status===429)return new AppError('Checks are busy. Try again in a moment.',429);
 return new AppError('The check could not be reached. Try again when the signal is better.',502);
};
// A source is only kept if its site came back in this answer's own searches.
const checkedSources=(notes,hosts)=>(Array.isArray(notes)?notes:[]).map(n=>({...n,sources:(Array.isArray(n?.sources)?n.sources:[]).map(s=>({title:s?.title,url:checkedLink(s?.url,hosts)}))}));
export async function checkDay(state,day,now=new Date()){
 const brief=dayBrief(state,day);if(!brief)throw new AppError('Choose a trip day.');
 try{
  const {input,hosts,searches}=await run(withGuide(CHECK_SYSTEM,state,japanDate()),CHECK,`Check this day for them.\n\n${brief}`,6);
  return {check:cleanDayCheck({...input,notes:checkedSources(input.notes,hosts)},state,day,now.toISOString()),searches};
 }catch(e){throw apiError(e);}
}
export async function planBDay(state,day,now=new Date()){
 const brief=dayBrief(state,day);if(!brief)throw new AppError('Choose a trip day.');
 try{
  const spare=spareIdeas(state,day);
  const list=spare.length?`\n\nTheir own list, not on any day yet or missed:\n${spare.map(x=>`  [${x.ref}] ${[x.title,x.place,x.note].filter(Boolean).join(' · ')}`).join('\n')}`:'';
  const {input,searches}=await run(withGuide(PLANB_SYSTEM,state,japanDate()),PLANB,`Make the Plan B for this day.\n\n${brief}${list}`,4);
  return {planB:cleanPlanB(input,state,day,now.toISOString()),searches};
 }catch(e){throw apiError(e);}
}
// Saved onto the trip as each one lands. The cleaning is done again against the plan as it is
// at the moment of writing, so a stop removed while the check was running is not pointed at.
export const saveCheck=(day,check)=>updateTrip(state=>({...state,dayChecks:keepChecks({...state.dayChecks,[day]:cleanDayCheck(check,state,day,check.at)})}));
export const savePlanB=(day,planB)=>updateTrip(state=>({...state,planB:keepChecks({...state.planB,[day]:cleanPlanB({stops:planB.stops.map(s=>({...s,kind:s.reason})),rest:planB.rest},state,day,planB.at)})}));
// Both parts for one day, side by side. Either may fail without losing the other; what failed is
// reported rather than thrown, because the scheduler only needs to know it ran.
// A move tomorrow is looked up the night before, once: hotels' forwarding rules do not change
// overnight, and a parent can look again by hand.
const INSIDER={
 name:'record_insider',
 description:'Record the insider notes for the stops, once, at the end.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['stops'],properties:{
  stops:{type:'array',items:{type:'object',additionalProperties:false,required:['stepId',...INSIDER_FIELDS.map(([k])=>k),'sources'],properties:{
   stepId:{type:'string',description:'The id in square brackets, exactly as given.'},
   queue:{type:'string',description:'How getting in works: a ticket machine or numbered ticket first, a timed entry, a list to write your name on, which queue is which. Empty if nothing particular.'},
   payment:{type:'string',description:'What is taken: cash only, IC cards, cards, a ticket machine that wants notes. Empty if unknown.'},
   access:{type:'string',description:'Stroller access (steps, lifts, stroller parking) and where the toilets are. Empty if unknown.'},
   lockers:{type:'string',description:'Lockers or bag rules: coin lockers nearby, bags not allowed in, a cloakroom. Empty if unknown.'},
   bestTime:{type:'string',description:'The best hour to arrive and why (opening, before the tour groups, the light). Empty if unknown.'},
   mistake:{type:'string',description:'The one mistake visitors commonly make here. Empty if you do not know one.'},
   sources:{type:'array',items:source,description:'Pages you actually opened.'}}}}}}
};
const INSIDER_SYSTEM=`You write the insider notes for a family's stops in Japan — the working details someone who has been would tell them at the door. ${FAMILY}

For each stop given (each with an id in square brackets): how the queue or entry works, payment, stroller access and toilets, lockers and bag rules, the best time to arrive, and the mistake visitors commonly make. Prefer the venue's own pages, then official tourism pages; recent visitor reports only for how the queue really works.

Rules:
- Each line short and practical, one or two sentences. An unknown field is empty, never guessed.
- Skip a stop entirely if there is nothing useful to say (a hotel breakfast, a generic street).
- Never state hours or prices as settled; that is not what these notes are for.

Search, then call record_insider exactly once.`;
export async function insiderDay(state,day){
 const stops=insiderWanted(state,day);
 if(!stops.length)return {notes:{},searches:0};
 const d=state.days.find(x=>x.date===day);
 const ask=`Their stops on ${day}, in ${d?.city||'Japan'}:\n${stops.map(s=>`  [${s.id}] ${[s.title,s.place,s.japanese].filter(Boolean).join(' · ')}`).join('\n')}`;
 try{
  const {input,hosts,searches}=await run(INSIDER_SYSTEM,INSIDER,ask,6);
  const notes={};
  for(const raw of Array.isArray(input.stops)?input.stops:[]){
   if(!stops.some(s=>s.id===raw?.stepId)||notes[raw.stepId])continue;
   const n=cleanInsider({...raw,sources:(raw.sources||[]).map(x=>({title:x?.title,url:checkedLink(x?.url,hosts)}))});
   if(n)notes[raw.stepId]=n;
  }
  return {notes,searches};
 }catch(e){throw apiError(e);}
}
// Saved as drafts for a parent to read over; a note a parent has already passed or dismissed is
// never overwritten by a later run.
export const saveInsider=(notes,at=new Date().toISOString())=>updateTrip(state=>({...state,insider:{...(state.insider||{}),
 ...Object.fromEntries(Object.entries(notes).filter(([id])=>!state.insider?.[id]&&state.steps.some(s=>s.id===id)).map(([id,n])=>[id,{...n,status:'draft',at}]))}}));
export const moveTomorrow=(state,day)=>movesOf(state).some(m=>m.date===day)&&!state.moves?.[day]?.check;
export async function nightly(state,day,parts=['check','planb',...(moveTomorrow(state,day)?['move']:[]),...(insiderWanted(state,day).length?['insider']:[])],{onCheck}={}){
 const out={day};
 await Promise.all([
  parts.includes('insider')&&insiderDay(state,day).then(async({notes,searches})=>{if(Object.keys(notes).length)await saveInsider(notes);out.insider={stops:Object.keys(notes).length,searches};}).catch(e=>{out.insiderError=e.message;}),
  parts.includes('move')&&moveDay(state,day).then(async found=>{await saveMove(day,found);out.move={searches:found.searches};}).catch(e=>{out.moveError=e.message;}),
  parts.includes('check')&&checkDay(state,day).then(async({check,searches})=>{await saveCheck(day,check);out.check={notes:check.notes.length,act:check.notes.filter(n=>n.act).length,searches};await onCheck?.(check);}).catch(e=>{out.checkError=e.message;}),
  parts.includes('planb')&&planBDay(state,day).then(async({planB,searches})=>{await savePlanB(day,planB);out.planB={stops:planB.stops.length,rest:planB.rest.length,searches};}).catch(e=>{out.planBError=e.message;})
 ]);
 return out;
}
