import {AppError,MEMBERS} from './model.mjs';
import {partyBrief,proposals,proposalPlacement,todos} from '../src/trip-features.js';
import {activeSteps,japanDate,japanClock} from '../src/timing.js';
import {describe,forecastFor,hoursFor,daySummary,forecastAge,ageLabel} from '../src/weather-data.js';
export const askReady=()=>!!process.env.ANTHROPIC_API_KEY;
// One question, asked out loud on the day, so it is short on purpose. Anything longer than this
// is two questions, and two questions get one muddled answer.
export const MAX_QUESTION=600;
// Four exchanges of memory, which is enough for "and what about the day after?" to mean
// something and not enough for a whole afternoon of chat to be re-sent on every question.
export const MAX_HISTORY=8;
// The day asked about and the two after it, written out activity by activity. Every other day
// of the trip still goes in, but only as its shape and whatever is booked to a time — which is
// what a "today or tomorrow" answer actually turns on.
export const DETAIL_DAYS=3;
// Enough searching to settle an opening time or a festival date. The plan itself is already in
// the question, so most answers need no search at all.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:5,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const RECORD={
 name:'record_answer',
 description:'Answer the family, once, at the end.',
 strict:true,
 input_schema:{
  type:'object',additionalProperties:false,
  required:['verdict','answer','because','days','checkFirst','sources'],
  properties:{
   verdict:{type:'string',description:'The answer itself, in one line, said plainly. "Do it tomorrow morning." Empty only when the question has no answer of that shape.'},
   answer:{type:'string',description:'Two to five sentences saying it properly, naming the activities and days you are reasoning from.'},
   because:{type:'array',items:{type:'string'},description:'The reasons, strongest first, each a short line that stands on its own.'},
   days:{type:'array',items:{type:'string'},description:'The trip dates the answer turns on, as YYYY-MM-DD, so the app can offer a button to them. Empty if none.'},
   checkFirst:{type:'string',description:'What they must confirm themselves before relying on this, and where. Empty if there is genuinely nothing.'},
   sources:{type:'array',description:'Only pages you actually opened, best first.',items:{
    type:'object',additionalProperties:false,required:['title','url'],
    properties:{title:{type:'string'},url:{type:'string'}}}}}}
};
const SYSTEM=`You answer one Australian family's questions about their own trip to Japan, from inside the app that holds their plan.

The family: Damien and Lauren, with their sons Boston (8) and Nate (5). They are in Japan from 21 September to 6 October 2026, and speak no Japanese.

You are given their plan day by day, the forecast they have checked, what is still on their planning board and their to-do list, and who is going. Answer from that first. Search only for what their plan cannot tell you — opening days, a festival's dates, whether something has closed.

How to answer:
- Answer the question that was asked. "Today or tomorrow" wants a day named, not a list of things to weigh up. That goes in "verdict", in one line, even when it is close — and say that it is close in "answer" rather than refusing to pick.
- Reason from their actual plan. Name the activity, the day and the time you are arguing from, so they can see you have read it. "Tuesday is already three hours in Nara" is an answer; "consider the weather" is not.
- A booked, locked activity is fixed. Never suggest moving one without saying plainly that it is booked and would have to be changed with whoever they booked it with.
- The forecast in the plan was checked at a point in time, and you are told when. If your answer turns on the weather, say how fresh that reading is.
- Nate is five. A late finish, a long queue, a second museum in one day and a two-hour train after dinner all land on him first. Say so where it decides the answer.
- Keep the money in mind where they have set a budget, but do not turn every answer into one about cost.
- "because" is the reasoning in short lines, strongest first. Three or four is usually right, and one good reason beats four weak ones.
- Anything you could not settle — hours on a public holiday, whether tickets are left, what time the last train actually goes — goes in "checkFirst" with where to check it. Leave it empty rather than padding it.
- If the question is not about the trip at all, answer it anyway, briefly, and leave "days" empty.

What you cannot do: you cannot change their plan, move an activity, book anything or send anything to anybody. You are reading and answering only, and the app says so on the screen. Never claim you have done any of it, and never say a place is open, a price is current or a ticket is available as a settled fact.

Never invent a web address. Only list a page you actually opened.

Search if it helps, then call record_answer exactly once. Everything you say goes in that call, not in a message.`;
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
const https=v=>{try{return new URL(v).protocol==='https:'?new URL(v):null;}catch{return null;}};
const clock=h=>`${String(h).padStart(2,'0')}:00`;
// The forecast as one clause on the end of the day's own line, because that is how it is read:
// nobody wants a weather report, they want to know whether this is the day for the garden.
function weatherLine(state,date){
 const day=forecastFor(state,date);
 if(!day)return '';
 const shape=daySummary(hoursFor(state,date));
 const wettest=shape&&shape.wettestHour!==null?`, wettest around ${clock(shape.wettestHour)}`:'';
 return ` · ${describe(day.code)[0].toLowerCase()}, ${day.min}–${day.max}°C${day.rain===null?'':`, ${day.rain}% chance of rain`}${wettest}`;
}
function stepLine(step,detail){
 const bits=[step.time||'no set time',step.title];
 if(step.place)bits.push(step.place);
 if(step.duration)bits.push(`${step.duration} min`);
 if(step.locked)bits.push(`booked${step.bookingTime?` for ${step.bookingTime}`:''}`);
 if(step.status&&step.status!=='todo')bits.push(step.status);
 const note=detail?clamp(step.notes,200):'';
 return `  ${bits.join(' · ')}${note?`\n    note: ${note}`:''}`;
}
// A day the question is about is written out in full. Every other day is still here — a question
// about Thursday is often really a question about what Friday already holds — but only as its
// city, its hotel, its weather and whatever is booked to a time and therefore cannot move.
function dayBlock(state,day,detail){
 const head=`${day.date} · ${day.city} · ${day.title}${day.hotel?` · staying at ${day.hotel}`:''}${weatherLine(state,day.date)}`;
 const steps=activeSteps(state,day.date);
 if(detail)return [head,...steps.slice(0,40).map(s=>stepLine(s,true))].join('\n');
 const booked=steps.filter(s=>s.locked||s.bookingTime);
 return [head,`  ${steps.length} activities planned${booked.length?', of which these are booked:':', none of them booked to a time.'}`,
  ...booked.slice(0,10).map(s=>stepLine(s,false))].join('\n');
}
// Everything the answer is allowed to lean on, written the way a person would say it. The whole
// trip goes in rather than the matching day alone: "is it better today or tomorrow" is answered
// by what tomorrow already holds, and "when should we do this at all" by all sixteen days.
export function tripBrief(state,{day,now=new Date()}={}){
 const today=japanDate(now);
 const focus=state.days.find(d=>d.date===day)||state.days.find(d=>d.date===today)||state.days[0];
 const from=state.days.findIndex(d=>d.date===focus.date);
 const detailed=new Set(state.days.slice(Math.max(0,from),Math.max(0,from)+DETAIL_DAYS).map(d=>d.date));
 const onTrip=state.days.some(d=>d.date===today);
 const lines=[`In Japan it is ${today}, ${japanClock(now)}.`,
  onTrip?'That is one of the trip days, so "today" means that date.'
   :`That is not one of the trip days — the trip runs ${state.days[0].date} to ${state.days.at(-1).date}, so this is being asked before or after it.`,
  `They are asking about ${focus.date} — ${focus.title}, in ${focus.city} — and the days around it.`,
  '','Their plan, day by day. The days written out in full are the ones being asked about; the rest give their shape and whatever is booked to a time:',
  ...state.days.map(d=>dayBlock(state,d,detailed.has(d.date)))];
 const age=forecastAge(state,now);
 lines.push('',`The forecast above was ${ageLabel(age)}${state.weather?.by?`, by ${state.weather.by}`:''}. There is no forecast for a day that does not show one.`);
 const open=proposals(state).filter(p=>proposalPlacement(state,p).state==='open');
 if(open.length)lines.push('','On their planning board, wanted but not yet on any day:',
  ...open.slice(0,30).map(p=>`  ${p.title}${p.place?` · ${p.place}`:''}${p.cost===null||p.cost===undefined?'':p.cost===0?' · free':` · about ¥${p.cost.toLocaleString('en-AU')} each`}${p.availability?` · ${p.availability}`:''}`));
 const jobs=todos(state).filter(t=>!t.doneAt);
 if(jobs.length)lines.push('','Still on the to-do list:',
  ...jobs.slice(0,30).map(t=>`  ${t.title}${t.day?` · on ${t.day}`:' · no day on it'}`));
 lines.push('','Who is going:',partyBrief(state));
 return lines.join('\n');
}
// Nothing a model returns is trusted here either: every line is cut to the length the screen can
// draw, a date it names has to be a real trip day, and a link has to be one it actually opened
// and an HTTPS one. Anything else is dropped rather than tidied into something that looks checked.
export function normaliseAnswer(found,state){
 return {
  verdict:clamp(found?.verdict,240),
  answer:clamp(found?.answer,4000),
  because:(Array.isArray(found?.because)?found.because:[]).map(line=>clamp(line,400)).filter(Boolean).slice(0,6),
  days:[...new Set((Array.isArray(found?.days)?found.days:[]).filter(d=>state.days.some(x=>x.date===d)))].slice(0,8),
  checkFirst:clamp(found?.checkFirst,800),
  sources:(Array.isArray(found?.sources)?found.sources:[]).map(s=>({title:clamp(s?.title,200),url:https(s?.url)?.href||''})).filter(s=>s.url).slice(0,6)
 };
}
// What was said earlier in this conversation, as the phone kept it. It arrives as plain text
// rather than as the model's own blocks, so nothing a previous answer carried — a tool call, a
// search result — can be replayed into this one. Trimmed to the last few turns, oldest dropped.
export function conversation(history){
 const turns=(Array.isArray(history)?history:[]).filter(t=>t&&(t.role==='user'||t.role==='assistant'))
  .map(t=>({role:t.role,content:clamp(t.text,4000)})).filter(t=>t.content);
 const recent=turns.slice(-MAX_HISTORY);
 // A conversation has to start with the person asking, and alternate, or the API refuses it.
 const start=recent.findIndex(t=>t.role==='user');
 if(start===-1)return [];
 const out=[];
 for(const turn of recent.slice(start))if(!out.length||out.at(-1).role!==turn.role)out.push(turn);
 return out.at(-1).role==='assistant'?out:out.slice(0,-1);
}
export async function askTrip({question,day,history},state,user,now=new Date()){
 if(!askReady())throw new AppError('Asking about the trip is not switched on. Add an Anthropic API key to the deployment.',503);
 const asked=clamp(question,MAX_QUESTION+1);
 if(!asked)throw new AppError('Type a question first.');
 if(asked.length>MAX_QUESTION)throw new AppError(`Keep the question under ${MAX_QUESTION} characters. Two questions get one muddled answer — ask them one at a time.`);
 if(day&&!state.days.some(d=>d.date===day))throw new AppError('Choose a trip day.');
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 const who=user?.name&&MEMBERS.includes(user.name)?user.name:'someone in the family';
 const ask=`${tripBrief(state,{day,now})}

${user?.role==='child'?`${who} is asking, and he is one of the boys. Keep it short and kind, in words he can follow, and never talk about money he does not have or a booking he cannot change.`:`${who} is asking.`}

Their question: ${asked}`;
 let message,messages=[...conversation(history),{role:'user',content:ask}];
 try{
  for(let attempt=0;attempt<4;attempt++){
   message=await client.messages.create({
    model:'claude-opus-5',
    max_tokens:6000,
    system:SYSTEM,
    thinking:{type:'adaptive'},
    output_config:{effort:'medium'},
    tools:[SEARCH,RECORD],
    messages
   });
   if(message.stop_reason!=='pause_turn')break;
   messages=[...messages,{role:'assistant',content:message.content}];
  }
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Questions are busy. Wait a moment and ask again.',429);
  if(e?.status===400)throw new AppError(`The question was refused: ${clamp(e?.error?.error?.message||e?.message,200)}`,502);
  throw new AppError('The question could not be sent. Try again when the signal is better — the plan itself is on this phone either way.',502);
 }
 if(message.stop_reason==='refusal')throw new AppError('That one was declined. Try asking it another way.',422);
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_answer');
 if(!call?.input)throw new AppError(message.stop_reason==='max_tokens'?'The answer ran long and did not finish. Ask it in smaller pieces.':'Nothing came back. Try asking it another way.',502);
 const answer=normaliseAnswer(call.input,state);
 if(!answer.answer&&!answer.verdict)throw new AppError('Nothing usable came back. Try asking it another way.',502);
 return {...answer,question:asked,about:day||null,
  usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
