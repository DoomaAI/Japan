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
import {updateTrip} from './store.mjs';
import {seenHosts,checkedLink} from './links.mjs';
import {weatherLine} from './ask.mjs';
import {activeSteps,japanDate} from '../src/timing.js';
import {NOTE_KIND_IDS,PLAN_B_REASONS,REST_KINDS,cleanDayCheck,cleanPlanB,keepChecks} from '../src/day-check.js';
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
   type:'object',additionalProperties:false,required:['stepId','kind','title','area','japanese','why','walkMinutes'],properties:{
    stepId:{type:'string',description:'The id in square brackets of the stop this replaces, exactly as given.'},
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

Rules:
- Only what changes what they do tomorrow. A day with nothing wrong gets an empty list and a summary that says so. Do not pad.
- Every note needs a page you actually opened that says it. Never invent a URL. A note you cannot source is not a note.
- A booked stop is fixed. Say plainly if something threatens it, and that changing it means going to whoever it was booked with.
- Never say a place is open or a train is running as settled fact beyond what the page says.

Search, then call record_check exactly once. Everything goes in that call.`;
const PLANB_SYSTEM=`You make tomorrow's Plan B for one family, the night before, so it is on their phones with no signal. ${FAMILY}

You are given tomorrow's stops, each with an id in square brackets, and the forecast. For each stop that is outdoors, weather-exposed, or likely to be shut or full, name the nearest good alternative — indoors if rain is the risk — that a five-year-old will manage. Then name two to four places near the day's route to sit down when a five-year-old has had enough: department-store kids' floors, indoor playgrounds, a café with room, a shady park.

Rules:
- Real places you have seen in a search, near the stop they replace. A short walk or one stop on a train, not across the city.
- Indoor stops that will not be affected need no alternative. Leave them out rather than padding.
- Keep "why" to one line about this family: the boys, the weather, the walk.
- Japanese names only where you have seen them. Empty rather than guessed.

Search as needed, then call record_plan_b exactly once.`;
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
  ...steps.slice(0,30).map(s=>`  [${s.id}] ${[s.time||'no set time',s.title,s.place,s.japanese?`(${clamp(s.japanese,80)})`:'',s.duration?`${s.duration} min`:'',s.locked||s.bookingTime?`booked${s.bookingTime?` for ${s.bookingTime}`:''}`:''].filter(Boolean).join(' · ')}`)]
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
  const {input,hosts,searches}=await run(CHECK_SYSTEM,CHECK,`Check this day for them.\n\n${brief}`,6);
  return {check:cleanDayCheck({...input,notes:checkedSources(input.notes,hosts)},state,day,now.toISOString()),searches};
 }catch(e){throw apiError(e);}
}
export async function planBDay(state,day,now=new Date()){
 const brief=dayBrief(state,day);if(!brief)throw new AppError('Choose a trip day.');
 try{
  const {input,searches}=await run(PLANB_SYSTEM,PLANB,`Make the Plan B for this day.\n\n${brief}`,4);
  return {planB:cleanPlanB(input,state,day,now.toISOString()),searches};
 }catch(e){throw apiError(e);}
}
// Saved onto the trip as each one lands. The cleaning is done again against the plan as it is
// at the moment of writing, so a stop removed while the check was running is not pointed at.
export const saveCheck=(day,check)=>updateTrip(state=>({...state,dayChecks:keepChecks({...state.dayChecks,[day]:cleanDayCheck(check,state,day,check.at)})}));
export const savePlanB=(day,planB)=>updateTrip(state=>({...state,planB:keepChecks({...state.planB,[day]:cleanPlanB({stops:planB.stops.map(s=>({...s,kind:s.reason})),rest:planB.rest},state,day,planB.at)})}));
// Both parts for one day, side by side. Either may fail without losing the other; what failed is
// reported rather than thrown, because the scheduler only needs to know it ran.
export async function nightly(state,day,parts=['check','planb'],{onCheck}={}){
 const out={day};
 await Promise.all([
  parts.includes('check')&&checkDay(state,day).then(async({check,searches})=>{await saveCheck(day,check);out.check={notes:check.notes.length,act:check.notes.filter(n=>n.act).length,searches};await onCheck?.(check);}).catch(e=>{out.checkError=e.message;}),
  parts.includes('planb')&&planBDay(state,day).then(async({planB,searches})=>{await savePlanB(day,planB);out.planB={stops:planB.stops.length,rest:planB.rest.length,searches};}).catch(e=>{out.planBError=e.message;})
 ]);
 return out;
}
