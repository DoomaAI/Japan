import {AppError,MEMBERS} from './model.mjs';
import {proposalDraft,partyBrief,proposals,EVENT_KINDS,tripAreas,dayAreas,eventDays} from '../src/trip-features.js';
export const eventsReady=()=>!!process.env.ANTHROPIC_API_KEY;
export const MAX_EVENTS=10;
// Finding what is on is almost all searching — league fixtures, festival calendars, concert
// listings, exhibition pages — so this call gets the same budget as suggestions and spends it
// on dates rather than on ideas.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:5,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const SYSTEM=`You find dated events in Japan for one Australian family: major sport, music, festivals and cultural events, exhibitions and seasonal happenings that are on while they are there and near where they are staying.

The family: Damien and Lauren, with their sons Boston (8) and Nate (5). They speak no Japanese.

How to choose:
- Only events with real dates that you found in a search. Every event needs a start and an end date, and a source: the address of the page you read it on, exactly as the search returned it. If you cannot find the dates, leave the event out. Never invent an event, a date or an address.
- Only what overlaps the dates they give you, and only what is in or within easy reach of the places they are staying on those dates. Say which of their bases it is reachable from and roughly how long it takes to get there.
- Prefer the things worth changing a plan for: a big match, a major festival, a headline concert, a once-a-year exhibition or seasonal event. Skip ordinary weekly markets and permanent attractions — those are not events.
- Use what they have said about themselves: "why" names the person or the interest it answers.
- Be honest about tickets: sold out, on sale, free, on the door, or unknown. A sold-out event is still worth knowing about only if there is a real way in; otherwise leave it out.
- Nate is five. Anything late, loud or long is for the others, and suitableFor should say so. Leave suitableFor empty only when it genuinely suits all four.
- Leave out anything already on their plan or their board — both lists are given to you.

Search, then call record_events exactly once. Everything you found goes in that call, not in a message.`;
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
const isDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
const isTime=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''));
function recordTool(areas){
 const event={
  type:'object',additionalProperties:false,
  required:['title','japanese','kind','venue','startDate','endDate','startTime','reachableFrom','travelMinutes','duration','cost','tickets','suitableFor','notes','why','source'],
  properties:{
   title:{type:'string',description:'The event, in English, as the family would name it.'},
   japanese:{type:'string',description:'Its name in Japanese if the source gives it. Empty rather than guessed.'},
   kind:{type:'string',enum:EVENT_KINDS.map(([id])=>id)},
   venue:{type:'string',description:'The venue or area, and the city.'},
   startDate:{type:'string',description:'YYYY-MM-DD, the first day it is on.'},
   endDate:{type:'string',description:'YYYY-MM-DD, the last day it is on. The same as startDate for a one-day event.'},
   startTime:{type:'string',description:'HH:MM in Japan time if the source gives one, otherwise empty.'},
   reachableFrom:{type:'array',items:{type:'string',enum:areas},description:'Which of their bases it is within easy reach of.'},
   travelMinutes:{type:'integer',description:'Rough minutes to get there from the nearest of those bases.'},
   duration:{type:'integer',description:'Minutes they would spend there.'},
   cost:{anyOf:[{type:'integer'},{type:'null'}],description:'Rough yen for one adult ticket, 0 if free, null if unknown.'},
   tickets:{type:'string',enum:['on sale','sold out','free','on the door','unknown']},
   suitableFor:{type:'array',items:{type:'string',enum:MEMBERS},description:'Who it genuinely suits. Empty means all four.'},
   notes:{type:'string',description:'Two or three sentences: what it is, and what to know before going — tickets, queues, what to wear.'},
   why:{type:'string',description:'One sentence on why THIS family, naming the person or the interest it answers.'},
   source:{type:'string',description:'The address of the page the dates came from, exactly as the search returned it.'}}
 };
 return {name:'record_events',description:'Record the events for this family, once, at the end.',strict:true,
  input_schema:{type:'object',additionalProperties:false,required:['events','note'],
   properties:{events:{type:'array',items:event,description:'Most worth knowing about first.'},
    note:{type:'string',description:'One line on what you searched and what you could not confirm.'}}}};
}
// Every address a search actually returned. An event keeps its link only if it is one of these:
// the model is asked for its source, and this is how a made-up one is caught.
export function searchedUrls(content){
 const urls=new Set();
 for(const block of content||[])if(block.type==='web_search_tool_result'&&Array.isArray(block.content))
  for(const r of block.content)if(r?.url)urls.add(r.url);
 return urls;
}
// An event lands on the board as an ordinary idea on the day it fits, with its dates in the
// available-times line so nobody has to open the source to know when it is on.
export function normaliseEvent(item,state,{from,to,urls}){
 const members=state.members||MEMBERS;
 if(!isDate(item.startDate))return null;
 const start=item.startDate,end=isDate(item.endDate)&&item.endDate>=start?item.endDate:start;
 if(end<from||start>to)return null;
 const areas=tripAreas(state),near=[...new Set((Array.isArray(item.reachableFrom)?item.reachableFrom:[]).filter(a=>areas.includes(a)))];
 const days=eventDays(state,{start,end,near,from});
 const time=isTime(item.startTime)?item.startTime:null;
 const kind=EVENT_KINDS.some(([id])=>id===item.kind)?item.kind:'other';
 const source=urls.has(item.source)&&/^https:\/\//.test(item.source)?item.source:'';
 const cost=Number.isInteger(item.cost)&&item.cost>=0&&item.cost<=10000000?item.cost:null;
 const tickets=['on sale','sold out','free','on the door','unknown'].includes(item.tickets)?item.tickets:'unknown';
 const dates=start===end?start:`${start} to ${end}`;
 const draft=proposalDraft({
  title:clamp(item.title,250),place:clamp(item.venue,250),japanese:clamp(item.japanese,250),website:source,
  notes:clamp(item.notes,4000),cost,costNote:tickets==='unknown'?'':clamp(`Tickets: ${tickets}`,250),
  duration:Number.isInteger(item.duration)&&item.duration>0&&item.duration<=1440?item.duration:120,
  category:'event',timing:time&&start===end?'fixed':'window',availability:clamp(`${dates}${time?` · from ${time}`:''}`,250),
  day:days[0]||null,time:days.length&&time?time:null,
  suitableFor:(Array.isArray(item.suitableFor)?item.suitableFor:[]).filter(n=>members.includes(n)),
  tags:['event',EVENT_KINDS.find(([id])=>id===kind)[1].toLowerCase(),...(tickets==='on sale'?['book ahead']:[])],
  source:'suggested'
 });
 if(!draft.title)return null;
 if(draft.suitableFor.length===members.length)draft.suitableFor=[];
 return {draft,kind,start,end,time,days,near,tickets,
  travelMinutes:Number.isInteger(item.travelMinutes)&&item.travelMinutes>=0&&item.travelMinutes<=600?item.travelMinutes:null,
  why:clamp(item.why,500),verified:!!source};
}
// The window to search: the trip, from today if it has started, or one day or one base of it.
export function eventWindow(state,{day,area},today){
 const dates=state.days.map(d=>d.date).sort();
 if(!dates.length)throw new AppError('The trip has no days yet.');
 if(day){
  if(!state.days.some(d=>d.date===day))throw new AppError('Choose a trip day.');
  return {from:day,to:day,areas:dayAreas(state.days.find(d=>d.date===day))};
 }
 const areas=tripAreas(state);
 if(area&&!areas.includes(area))throw new AppError('Choose one of the places we are staying.');
 const mine=area?state.days.filter(d=>dayAreas(d).includes(area)).map(d=>d.date).sort():dates;
 const from=[mine[0],today].filter(Boolean).sort().at(-1),to=mine.at(-1);
 if(from>to)throw new AppError(area?`We have finished with ${area} on this trip.`:'The trip is over.');
 return {from,to,areas:area?[area]:areas};
}
function alreadyHave(state){
 return [...new Set([...state.steps.map(s=>s.title),...proposals(state).map(p=>p.title)])].slice(0,300);
}
const japanToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
export async function findEvents({day,area,kinds,count},state,{today=japanToday()}={}){
 if(!eventsReady())throw new AppError('Event search is not switched on. Add an Anthropic API key to the deployment.',503);
 const {from,to,areas}=eventWindow(state,{day,area},today);
 const want=(Array.isArray(kinds)?kinds:[]).filter(id=>EVENT_KINDS.some(([key])=>key===id));
 if(!want.length)throw new AppError('Choose at least one kind of event.');
 const wanted=Math.min(MAX_EVENTS,Math.max(3,Number(count)||6));
 const where=areas.map(a=>{
  const on=state.days.filter(d=>d.date>=from&&d.date<=to&&dayAreas(d).includes(a)).map(d=>d.date);
  return `${a}: ${on.join(', ')}`;
 });
 const ask=`Find up to ${wanted} events on between ${from} and ${to}.

Kinds they want: ${want.map(id=>EVENT_KINDS.find(([key])=>key===id)[1]).join(', ')}

Where they are staying, and on which dates:
${where.join('\n')}

Who is going:
${partyBrief(state)}

Already on their plan or their planning board — leave these out:
${alreadyHave(state).join(' · ')||'nothing yet'}`;
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let messages=[{role:'user',content:ask}],content=[],message;
 try{
  for(let attempt=0;attempt<4;attempt++){
   message=await client.messages.create({
    model:'claude-opus-5',max_tokens:12000,system:SYSTEM,
    thinking:{type:'adaptive'},output_config:{effort:'medium'},
    tools:[SEARCH,recordTool(tripAreas(state))],messages
   });
   content=[...content,...message.content];
   if(message.stop_reason!=='pause_turn')break;
   messages=[...messages,{role:'assistant',content:message.content}];
  }
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Event search is busy. Wait a moment and try again.',429);
  if(e?.status===400)throw new AppError(`Event search was refused: ${clamp(e?.error?.error?.message||e?.message,200)}`,502);
  throw new AppError('Event search could not be reached. Try again when the signal is better.',502);
 }
 if(message.stop_reason==='refusal')throw new AppError('Event search declined that one.',422);
 const result=message.content.find(b=>b.type==='tool_use'&&b.name==='record_events')?.input;
 if(!result||!Array.isArray(result.events))throw new AppError(message.stop_reason==='max_tokens'?'Event search ran long and did not finish. Ask for fewer.':'Nothing came back. Try again, or narrow it to one kind.',502);
 const urls=searchedUrls(content);
 const events=result.events.map(item=>normaliseEvent(item,state,{from,to,urls})).filter(Boolean).slice(0,MAX_EVENTS);
 return {events,from,to,areas,note:clamp(result.note,500),
  usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
