import {AppError,MEMBERS} from './model.mjs';
import {PROPOSAL_KINDS,PROPOSAL_TIMING,SUGGEST_KINDS,proposalDraft,partyBrief,proposals} from '../src/trip-features.js';
export const suggestReady=()=>!!process.env.ANTHROPIC_API_KEY;
export const MAX_SUGGESTIONS=8;
// Enough searching to check what is actually on in that city while they are there, and to drop
// anything that has since closed. Hours, prices and tickets are not this call's job — those come
// from looking one place up, so nothing here has to be right about a Tuesday.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:5,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const suggestion={
 type:'object',additionalProperties:false,
 required:['title','place','japanese','flavour','category','timing','duration','cost','costNote','suitableFor','tags','notes','why','bookAhead'],
 properties:{
  title:{type:'string',description:'What it is, in English, as the family would name it.'},
  place:{type:'string',description:'The area or district it is in, and the city.'},
  japanese:{type:'string',description:'The name in Japanese if you know it. Empty rather than guessed.'},
  flavour:{type:'string',enum:SUGGEST_KINDS.map(([id])=>id),description:'Which of the asked-for flavours this one answers.'},
  category:{type:'string',enum:PROPOSAL_KINDS.map(([id])=>id)},
  timing:{type:'string',enum:PROPOSAL_TIMING.map(([id])=>id)},
  duration:{type:'integer',description:'Minutes it usually takes.'},
  cost:{anyOf:[{type:'integer'},{type:'null'}],description:'Rough yen for one adult, 0 if free, null if you do not know. A ballpark, and it will be checked.'},
  costNote:{type:'string',description:'Anything worth saying about the price, such as free for under-sixes.'},
  suitableFor:{type:'array',items:{type:'string',enum:MEMBERS},description:'Who it genuinely suits. Empty means all four.'},
  tags:{type:'array',items:{type:'string'}},
  notes:{type:'string',description:'Two or three sentences: what it actually is, and what to know before going.'},
  why:{type:'string',description:'One sentence on why THIS family, naming the person or the interest it answers.'},
  bookAhead:{type:'boolean',description:'True if it normally has to be booked before the day.'}}
};
const RECORD={
 name:'record_suggestions',
 description:'Record the ideas for this family, once, at the end.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['suggestions','note'],
  properties:{
   suggestions:{type:'array',items:suggestion,description:'Best first.'},
   note:{type:'string',description:'One line on what you leaned on and what you are least sure of.'}}}
};
const SYSTEM=`You suggest things for one Australian family to do in Japan, for a place and a set of flavours they have asked about.

The family: Damien and Lauren, with their sons Boston (8) and Nate (5). They are in Japan from 21 September to 6 October 2026, and speak no Japanese.

How to choose:
- Answer the flavours asked for, and spread the list across them rather than giving nine versions of one. "The famous ones" means what everybody goes to and would regret missing. "Only-in-Japan, off the usual list" means the ones a visitor would never find without being told — not obscure for its own sake, and not a landmark with a different name on it.
- Use what they have said about themselves. "why" names the person or the interest it answers — if it is on the list because Boston ticked trains, say so. An idea that suits nobody in particular is a weak idea.
- Read the pace and the budget. A gentle day does not want a two-hour queue in it, and a family watching the yen does not want three paid attractions in a row.
- Nate is five. Anything with a long queue, a late finish, a height limit or a fright is for the others, and suitableFor should say so. Leave suitableFor empty only when it genuinely suits all four.
- Do not suggest anything already on their plan or their board — both lists are given to you.
- Search to check what is actually on in that city while they are there — a festival, a match, an exhibition with dates — and to drop anything that has closed since. A dated event beats a generic suggestion.
- Write "notes" as what it actually is and what to know before going. Two or three sentences, no brochure language.

What this is not: you are not checking opening hours, prices or whether tickets are available. The family looks a place up separately for that, and the app tells them so. Give a rough cost and a rough duration and be plain that they are rough. Never invent a web address — you are not asked for one and there is nowhere to put it.

Search if it helps, then call record_suggestions exactly once. Everything you suggest goes in that call, not in a message.`;
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
// A suggestion lands on the board as an ordinary idea, so it is cut to the same shape and the
// same limits as one somebody typed. It carries no links at all: nothing here has been checked,
// and an unchecked address is worse than none.
export function normaliseSuggestion(item,state){
 const members=state.members||MEMBERS;
 const cost=Number.isInteger(item.cost)&&item.cost>=0&&item.cost<=10000000?item.cost:null;
 const duration=Number.isInteger(item.duration)&&item.duration>0&&item.duration<=1440?item.duration:60;
 const draft=proposalDraft({
  title:clamp(item.title,250),place:clamp(item.place,250),japanese:clamp(item.japanese,250),
  notes:clamp(item.notes,4000),cost,costNote:clamp(item.costNote,250),duration,
  category:PROPOSAL_KINDS.some(([id])=>id===item.category)?item.category:'place',
  timing:PROPOSAL_TIMING.some(([id])=>id===item.timing)?item.timing:'flex',
  suitableFor:(Array.isArray(item.suitableFor)?item.suitableFor:[]).filter(n=>members.includes(n)),
  tags:(Array.isArray(item.tags)?item.tags:[]).map(t=>clamp(t,50)).filter(Boolean).slice(0,20),
  source:'suggested'
 });
 if(draft.suitableFor.length===members.length)draft.suitableFor=[];
 if(item.bookAhead&&!draft.tags.includes('book ahead'))draft.tags=[...draft.tags,'book ahead'].slice(0,20);
 return {draft,
  flavour:SUGGEST_KINDS.some(([id])=>id===item.flavour)?item.flavour:'unique',
  why:clamp(item.why,500),bookAhead:item.bookAhead===true};
}
// Everything they already have, itinerary and board alike, so the same shrine does not come
// back a third time. The whole plan rather than the matching city: an area typed by hand — "Gion
// after dark" — is not a city name, and a near-duplicate is worth more than the tokens it costs.
function alreadyHave(state){
 return [...new Set([...state.steps.map(s=>s.title),...proposals(state).map(p=>p.title)])].slice(0,300);
}
export async function suggestIdeas({city,day,kinds,count},state){
 if(!suggestReady())throw new AppError('Suggestions are not switched on. Add an Anthropic API key to the deployment.',503);
 const onDay=day?state.days.find(d=>d.date===day):null;
 if(day&&!onDay)throw new AppError('Choose a trip day.');
 const where=clamp(onDay?onDay.city:city,120);
 if(!where)throw new AppError('Choose a day or type where you want ideas for.');
 const want=(Array.isArray(kinds)?kinds:[]).filter(id=>SUGGEST_KINDS.some(([key])=>key===id));
 if(!want.length)throw new AppError('Choose at least one kind of idea.');
 const wanted=Math.min(MAX_SUGGESTIONS,Math.max(3,Number(count)||6));
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 const cityDays=state.days.filter(d=>d.city===where);
 const ask=`Suggest ${wanted} ideas in ${where}${onDay?` for ${onDay.date}, the day they are on "${onDay.title}"`:''}.

Flavours they asked for: ${want.map(id=>SUGGEST_KINDS.find(([key])=>key===id)[1]).join(', ')}

Who is going:
${partyBrief(state)}

${cityDays.length?`They are in ${where} on: ${cityDays.map(d=>`${d.date} (${d.title})`).join(', ')}`:`They have not got ${where} on the plan yet.`}

Already on their plan or their planning board — do not suggest these again:
${alreadyHave(state).join(' · ')||'nothing yet'}`;
 let message,messages=[{role:'user',content:ask}];
 try{
  for(let attempt=0;attempt<4;attempt++){
   message=await client.messages.create({
    model:'claude-opus-5',
    max_tokens:12000,
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
  if(e?.status===429)throw new AppError('Suggestions are busy. Wait a moment and try again.',429);
  if(e?.status===400)throw new AppError(`Suggestions were refused: ${clamp(e?.error?.error?.message||e?.message,200)}`,502);
  throw new AppError('Suggestions could not be reached. Add your own ideas, or try again when the signal is better.',502);
 }
 if(message.stop_reason==='refusal')throw new AppError('Suggestions declined that one.',422);
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_suggestions');
 const result=call?.input;
 if(!result||!Array.isArray(result.suggestions))throw new AppError(message.stop_reason==='max_tokens'?'Suggestions ran long and did not finish. Ask for fewer.':'Nothing came back to suggest. Try again, or narrow it to one kind.',502);
 const suggestions=result.suggestions.map(item=>normaliseSuggestion(item,state)).filter(s=>s.draft.title).slice(0,MAX_SUGGESTIONS);
 if(!suggestions.length)throw new AppError('Nothing usable came back. Try a different place or another kind of idea.',502);
 return {suggestions,where,note:clamp(result.note,500),
  usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
