import {AppError} from './model.mjs';
import {SUMO_DIVISIONS} from '../src/trip-features.js';
export const sumoReady=()=>!!process.env.ANTHROPIC_API_KEY;
export const MAX_BOUTS=60;
// The torikumi goes up on the official site the afternoon before, so this is asked close to the
// day and read off that page. Six searches is enough to reach the day's card and the two or
// three names somebody will then want to look up.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:6,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const wrestler={type:'object',additionalProperties:false,required:['name','rank','stable'],
 properties:{
  name:{type:'string',description:'Shikona, in romaji as the English site writes it.'},
  rank:{type:'string',description:'Rank on this day, e.g. Yokozuna, Ozeki, Maegashira 4 East. Empty if you do not know.'},
  stable:{type:'string',description:'Stable (heya), in romaji. Empty if you do not know.'}}};
const CARD={
 name:'record_sumo_day',
 description:'Record the day’s card, once, after reading the official schedule.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,
  required:['found','basho','dayNumber','venue','date','doorsOpen','notes','bouts','sources'],
  properties:{
   found:{type:'boolean',description:'False if there is no tournament on that date, or the card is not published yet.'},
   basho:{type:'string',description:'The tournament, e.g. "Aki Basho 2026 (September, Tokyo)".'},
   dayNumber:{anyOf:[{type:'integer'},{type:'null'}],description:'Which day of the fifteen, 1-15. Null if unknown.'},
   venue:{type:'string',description:'The arena, e.g. Ryogoku Kokugikan.'},
   date:{type:'string',description:'The date asked about, as YYYY-MM-DD.'},
   doorsOpen:{type:'string',description:'When the doors open, HH:MM, 24-hour. Empty if you do not know.'},
   notes:{type:'string',description:'Two or three sentences on how the afternoon runs and what to know — when the top division starts, the ring-entering ceremony, when most people arrive.'},
   bouts:{type:'array',description:'The day’s match-ups in running order, earliest first.',items:{
    type:'object',additionalProperties:false,required:['division','order','time','east','west'],
    properties:{
     division:{type:'string',enum:SUMO_DIVISIONS.map(([id])=>id)},
     order:{type:'integer',description:'Running order across the whole day, 1 upwards.'},
     time:{type:'string',description:'Approximate start, HH:MM, 24-hour. Empty if the card does not give one.'},
     east:wrestler,west:wrestler}}},
   sources:{type:'array',description:'The pages you read, official first.',items:{
    type:'object',additionalProperties:false,required:['title','url'],
    properties:{title:{type:'string'},url:{type:'string'}}}}}}
};
const PROFILE={
 name:'record_wrestler',
 description:'Record what is known about one wrestler, once, after searching.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,
  required:['found','name','japanese','rank','stable','hometown','heightCm','weightKg','record','about','sources'],
  properties:{
   found:{type:'boolean'},
   name:{type:'string',description:'Shikona in romaji.'},
   japanese:{type:'string',description:'Shikona in Japanese. Empty rather than guessed.'},
   rank:{type:'string'},stable:{type:'string'},
   hometown:{type:'string',description:'Where he is from.'},
   heightCm:{anyOf:[{type:'integer'},{type:'null'}]},
   weightKg:{anyOf:[{type:'integer'},{type:'null'}]},
   record:{type:'string',description:'How he is doing in this tournament, e.g. "8-3 after day 11", said as of when you read it.'},
   about:{type:'string',description:'Three or four sentences an eight-year-old would find interesting: how he fights, what he is known for, anything to watch for.'},
   sources:{type:'array',items:{type:'object',additionalProperties:false,required:['title','url'],
    properties:{title:{type:'string'},url:{type:'string'}}}}}}
};
const FAMILY=`The family: Damien and Lauren, with their sons Boston (8) and Nate (5). They are Australian, speak no Japanese, and have never been to sumo.`;
const CARD_SYSTEM=`You read the official sumo schedule for one day and write down the card, for a family who will be sitting in the arena that afternoon.

${FAMILY}

How to work:
- The Japan Sumo Association's own site (sumo.or.jp) is the source that matters. Read the day's torikumi from it. Use anything else only to fill a gap, and say so in the source title.
- The match-ups for a day are published the afternoon before. If the card for the date asked about is not up yet, set found to false and say so in notes — do not put up yesterday's card or a guess.
- Give the bouts in running order, earliest first, with the division each belongs to. The lower divisions fight first and the top division last; that is the shape of the afternoon.
- Times are approximate and everybody knows it. Give what the schedule says; leave time empty rather than inventing one.
- Names in romaji as the English site writes them, because nobody in this family reads Japanese.
- notes is what a first-timer needs: roughly when the top division starts, when the ring-entering ceremonies are, that most people arrive late afternoon, and that it finishes with the bow-twirling.
- If a division has too many bouts to list usefully, give the top divisions in full and leave the earliest ones out rather than truncating a division halfway.

You are copying down a published schedule, not predicting it. Times shift, cards change, and wrestlers withdraw. Say what the page said.`;
const PROFILE_SYSTEM=`You look up one sumo wrestler for a family sitting in the arena, who have just seen his name on the card.

${FAMILY}
Boston is eight and will want to know whether he is any good, how big he is and how he wins. Nate is five and will want to know if he is the biggest.

- Search for him. The Japan Sumo Association's own profile pages are the source that matters; use a reference site to fill gaps.
- "record" is how he is doing in the tournament that is on, said as of when you read it — it changes every day.
- "about" is three or four sentences, plain and concrete: how he fights, what he is known for, what to watch for. Not a list of statistics and not brochure language.
- If you cannot find the man, set found to false rather than describing somebody with a similar name.
- Never invent a height, a weight or a record. Leave it out instead.`;
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
const https=v=>{try{return new URL(v).protocol==='https:'?new URL(v).href:'';}catch{return '';}};
const clock=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''))?v:'';
const sources=list=>(Array.isArray(list)?list:[]).map(s=>({title:clamp(s?.title,200),url:https(s?.url)})).filter(s=>s.url).slice(0,6);
const person=p=>({name:clamp(p?.name,80),rank:clamp(p?.rank,80),stable:clamp(p?.stable,80)});
// Nothing here is trusted either. A bout with nobody on one side of it is not a bout, a time
// that is not a time is dropped rather than shown, and the ids are built here so a result
// recorded in the arena still points at the right row when the card is fetched again.
export function normaliseCard(found){
 const seen=new Set();
 const bouts=(Array.isArray(found.bouts)?found.bouts:[]).map((b,i)=>{
  const division=SUMO_DIVISIONS.some(([id])=>id===b?.division)?b.division:'other';
  const east=person(b?.east),west=person(b?.west);
  const order=Number.isInteger(b?.order)&&b.order>0&&b.order<=999?b.order:i+1;
  return {id:`${division}-${order}`,division,order,time:clock(b?.time),east,west};
 }).filter(b=>b.east.name&&b.west.name&&!seen.has(b.id)&&seen.add(b.id)!==false)
  .sort((a,b)=>a.order-b.order).slice(0,MAX_BOUTS);
 return {basho:clamp(found.basho,120),
  dayNumber:Number.isInteger(found.dayNumber)&&found.dayNumber>=1&&found.dayNumber<=15?found.dayNumber:null,
  venue:clamp(found.venue,120),date:/^\d{4}-\d{2}-\d{2}$/.test(found.date||'')?found.date:null,
  doorsOpen:clock(found.doorsOpen),notes:clamp(found.notes,2000),bouts,sources:sources(found.sources)};
}
export function normaliseWrestler(found){
 const size=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi?v:null;
 return {name:clamp(found.name,80),japanese:clamp(found.japanese,80),rank:clamp(found.rank,80),
  stable:clamp(found.stable,80),hometown:clamp(found.hometown,120),
  heightCm:size(found.heightCm,120,250),weightKg:size(found.weightKg,50,400),
  record:clamp(found.record,120),about:clamp(found.about,2000),sources:sources(found.sources)};
}
async function ask(client,{system,tools,messages,maxTokens}){
 let message,turn=[...messages];
 for(let attempt=0;attempt<4;attempt++){
  message=await client.messages.create({model:'claude-opus-5',max_tokens:maxTokens,system,
   thinking:{type:'adaptive'},output_config:{effort:'medium'},tools,messages:turn});
  if(message.stop_reason!=='pause_turn')break;
  turn=[...turn,{role:'assistant',content:message.content}];
 }
 return message;
}
function apiError(e,what){
 if(e?.status===401)return new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
 if(e?.status===429)return new AppError(`${what} is busy. Wait a moment and try again.`,429);
 if(e?.status===400)return new AppError(`${what} was refused: ${clamp(e?.error?.error?.message||e?.message,200)}`,502);
 return new AppError(`${what} could not be reached. The official schedule is at sumo.or.jp.`,502);
}
export async function fetchSumoDay({date},state){
 if(!sumoReady())throw new AppError('Reading the sumo card is not switched on. Add an Anthropic API key to the deployment.',503);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))||!state.days.some(d=>d.date===date))throw new AppError('Choose a trip day.');
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 let message;
 try{message=await ask(new Anthropic(),{system:CARD_SYSTEM,tools:[SEARCH,CARD],maxTokens:12000,
  messages:[{role:'user',content:`Read the official schedule for ${date} and write down that day's card.\n\nThey have second-floor chair seats at Ryogoku Kokugikan and are arriving mid-afternoon with two children.`}]});
 }catch(e){throw apiError(e,'The sumo schedule');}
 if(message.stop_reason==='refusal')throw new AppError('That one was declined.',422);
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_sumo_day');
 if(!call?.input)throw new AppError('Nothing came back. The official schedule is at sumo.or.jp.',502);
 if(!call.input.found)throw new AppError(clamp(call.input.notes,300)||'No card is published for that date yet. The match-ups go up the afternoon before.',404);
 const card=normaliseCard(call.input);
 if(!card.bouts.length)throw new AppError('The card came back with no bouts in it. Try again closer to the day.',502);
 return {...card,usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
export async function fetchWrestler({name}){
 if(!sumoReady())throw new AppError('Looking wrestlers up is not switched on. Add an Anthropic API key to the deployment.',503);
 if(typeof name!=='string'||!name.trim())throw new AppError('Choose a wrestler.');
 if(name.length>80)throw new AppError('That is not a shikona.');
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 let message;
 try{message=await ask(new Anthropic(),{system:PROFILE_SYSTEM,tools:[SEARCH,PROFILE],maxTokens:6000,
  messages:[{role:'user',content:`Look up the sumo wrestler ${name.trim()}, who is on today's card.`}]});
 }catch(e){throw apiError(e,'The wrestler lookup');}
 if(message.stop_reason==='refusal')throw new AppError('That one was declined.',422);
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_wrestler');
 if(!call?.input)throw new AppError('Nothing came back about him.',502);
 if(!call.input.found)throw new AppError(`Could not find a wrestler called ${clamp(name,80)}.`,404);
 const profile=normaliseWrestler(call.input);
 if(!profile.name)throw new AppError('Nothing usable came back about him.',502);
 return {...profile,usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
