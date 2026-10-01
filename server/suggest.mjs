import {AppError,MEMBERS,modelReady} from './model.mjs';
import {withGuide} from '../src/guide-data.js';
import {activeSteps,japanDate} from '../src/timing.js';
import {seenHosts,checkedLink} from './links.mjs';
import {PROPOSAL_KINDS,PROPOSAL_TIMING,SUGGEST_KINDS,TRAVEL_MODES,MIN_RATING_VOTES,validRating,ratingText,proposalDraft,partyBrief,proposals,rejoinAt,BOYS} from '../src/trip-features.js';
import {clamp} from '../src/text.js';
export const suggestReady=modelReady;
export const MAX_SUGGESTIONS=8;
// Enough searching to check what is actually on in that city while they are there, and to drop
// anything that has since closed. Hours, prices and tickets are not this call's job — those come
// from looking one place up, so nothing here has to be right about a Tuesday.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:5,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const suggestion={
 type:'object',additionalProperties:false,
 required:['title','place','japanese','flavour','category','timing','duration','cost','costNote','suitableFor','tags','notes','why','bookAhead','travelMinutes','travelMode','rating','ratingCount','website','bookingUrl'],
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
  bookAhead:{type:'boolean',description:'True if it normally has to be booked before the day.'},
  travelMinutes:{anyOf:[{type:'integer'},{type:'null'}],description:'Rough minutes to get there from the starting point they gave, door to door. Null if they gave no starting point.'},
  travelMode:{type:'string',enum:TRAVEL_MODES.map(([id])=>id),description:'How they would most sensibly get there from the starting point: walk if it is under about fifteen minutes on foot.'},
  rating:{anyOf:[{type:'number'},{type:'null'}],description:'Its Google Maps star rating, 1 to 5, as it stands today. Null if you have not actually seen it — never a guess, never another branch, and null for something with no single place, such as a walk or a festival.'},
  ratingCount:{anyOf:[{type:'integer'},{type:'null'}],description:'How many Google ratings that average is made of. Null if you do not know.'},
  website:{type:'string',description:'Its official website, exactly as a search result showed it. Empty if you did not see it in a search — never assembled from the name.'},
  bookingUrl:{type:'string',description:'The page where tickets or a table are actually booked, exactly as a search result showed it: the official ticket page, or the booking service it uses. Empty if you did not see one, or it cannot be booked.'}}
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
- Where it is one place — a museum, a shrine, a café, a park — search for its Google rating and the number of ratings behind it. A rating you have not seen is null; a made-up 4.6 is worse than none.
- Write "notes" as what it actually is and what to know before going. Two or three sentences, no brochure language.

What this is not: you are not checking opening hours, prices or whether tickets are available. The family looks a place up separately for that, and the app tells them so. Give a rough cost and a rough duration and be plain that they are rough. Give "website" and "bookingUrl" only as a search result actually showed them; the app throws away any address whose site did not come up in your searches, so a guessed one is simply lost.

Search if it helps, then call record_suggestions exactly once. Everything you suggest goes in that call, not in a message.`;
// A suggestion lands on the board as an ordinary idea, so it is cut to the same shape and the
// same limits as one somebody typed. An unchecked address is worse than none, so the only links
// it carries are ones whose site the searches in this same answer returned.
export function normaliseSuggestion(item,state,hosts=new Set()){
 const members=state.members||MEMBERS;
 const cost=Number.isInteger(item.cost)&&item.cost>=0&&item.cost<=10000000?item.cost:null;
 // Google's number or nothing, as on Near here: out of range is dropped, and an average of a
 // handful of votes is not one worth choosing a morning on.
 const votes=Number.isInteger(item.ratingCount)&&item.ratingCount>=0?item.ratingCount:null;
 const rating=votes!==null&&votes<MIN_RATING_VOTES?null:validRating(Number(item.rating));
 const ratingCount=rating===null?null:votes;
 const duration=Number.isInteger(item.duration)&&item.duration>0&&item.duration<=1440?item.duration:60;
 const draft=proposalDraft({
  title:clamp(item.title,250),place:clamp(item.place,250),japanese:clamp(item.japanese,250),
  notes:[clamp(item.notes,3900),rating===null?'':`Google ${ratingText(rating,ratingCount)}`].filter(Boolean).join('\n'),cost,costNote:clamp(item.costNote,250),duration,
  category:PROPOSAL_KINDS.some(([id])=>id===item.category)?item.category:'place',
  timing:PROPOSAL_TIMING.some(([id])=>id===item.timing)?item.timing:'flex',
  suitableFor:(Array.isArray(item.suitableFor)?item.suitableFor:[]).filter(n=>members.includes(n)),
  tags:(Array.isArray(item.tags)?item.tags:[]).map(t=>clamp(t,50)).filter(Boolean).slice(0,20),
  website:checkedLink(item.website,hosts),ticketUrl:checkedLink(item.bookingUrl,hosts),
  source:'suggested'
 });
 if(draft.suitableFor.length===members.length)draft.suitableFor=[];
 if(item.bookAhead&&!draft.tags.includes('book ahead'))draft.tags=[...draft.tags,'book ahead'].slice(0,20);
 return {draft,
  flavour:SUGGEST_KINDS.some(([id])=>id===item.flavour)?item.flavour:'unique',
  why:clamp(item.why,500),bookAhead:item.bookAhead===true,
  travelMinutes:Number.isInteger(item.travelMinutes)&&item.travelMinutes>=0&&item.travelMinutes<=240?item.travelMinutes:null,
  travelMode:TRAVEL_MODES.some(([id])=>id===item.travelMode)?item.travelMode:'walk',
  rating,ratingCount};
}
// Everything they already have, itinerary and board alike, so the same shrine does not come
// back a third time. The whole plan rather than the matching city: an area typed by hand — "Gion
// after dark" — is not a city name, and a near-duplicate is worth more than the tokens it costs.
function alreadyHave(state){
 return [...new Set([...state.steps.map(s=>s.title),...proposals(state).map(p=>p.title)])].slice(0,300);
}
// Somebody would rather not do a stop on the plan. What they want is something near it, that fits
// in the time the others are there, and that gets them back for the next thing everyone does.
export function insteadOf(instead,state){
 if(!instead)return null;
 const step=state.steps.find(s=>s.id===instead.stepId);
 if(!step?.day)throw new AppError('Choose a stop on the plan.');
 const who=[...new Set(Array.isArray(instead.who)?instead.who:[])];
 if(!who.length||who.some(n=>!(step.participants||[]).includes(n)))throw new AppError('Choose who would rather not go.');
 const staying=(step.participants||[]).filter(n=>!who.includes(n));
 return {step,who,staying,rejoin:rejoinAt(state,step)};
}
export async function suggestIdeas({city,day,kinds,count,forWhom,near,instead:askedInstead},state){
 const instead=insteadOf(askedInstead,state);
 if(instead){day=instead.step.day;forWhom='';if(!(Array.isArray(kinds)&&kinds.length))kinds=SUGGEST_KINDS.map(([id])=>id);}
 if(!suggestReady())throw new AppError('Suggestions are not switched on. Add an Anthropic API key to the deployment.',503);
 const onDay=day?state.days.find(d=>d.date===day):null;
 if(day&&!onDay)throw new AppError('Choose a trip day.');
 const where=clamp(onDay?onDay.city:city,120);
 if(!where)throw new AppError('Choose a day or type where you want ideas for.');
 const want=(Array.isArray(kinds)?kinds:[]).filter(id=>SUGGEST_KINDS.some(([key])=>key===id));
 if(!want.length)throw new AppError('Choose at least one kind of idea.');
 const wanted=Math.min(MAX_SUGGESTIONS,Math.max(3,Number(count)||6));
 // Ideas for one person rather than the four of them: the same family and the same day, but
 // every idea has to answer something that person said they like.
 const members=state.members||MEMBERS;
 if(forWhom&&!members.includes(forWhom))throw new AppError('Choose a family member, or everyone.');
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 const cityDays=state.days.filter(d=>d.city===where);
 // Somewhere to start from — tonight's hotel, a stop on the day, or where the phone is — turns
 // "ideas for Tokyo" into "what should we do around here", and every card says how far it is.
 const from=instead?clamp(instead.step.place||instead.step.title,250):clamp(near,250);
 const ask=`Suggest ${wanted} ideas in ${where}${onDay?` for ${onDay.date}, the day they are on "${onDay.title}"`:''}.

Flavours they asked for: ${want.map(id=>SUGGEST_KINDS.find(([key])=>key===id)[1]).join(', ')}
${from?`\nStarting from: ${from}. Keep to what is within about thirty minutes of there, nearer first when two are equally good, and give travelMinutes and travelMode from there.${onDay&&!activeSteps(state,onDay.date).length?' Nothing is planned for this day yet, so this is what should fill it.':''}\n`:'\nNo starting point: leave travelMinutes null.\n'}${instead?`
These are alternatives, not extra ideas. ${instead.who.join(' and ')} would rather not do "${instead.step.title}"${instead.step.place?` at ${instead.step.place}`:''}${instead.step.time?`, planned for ${instead.step.time}`:''} for about ${instead.step.duration||30} minutes. ${instead.staying.length?`${instead.staying.join(' and ')} will carry on with it, so`:'Nobody is doing it now, so'} suggest what ${instead.who.join(' and ')} could do instead: close to ${instead.step.place||instead.step.title}, fitting roughly the same time${instead.rejoin?`, and finishing in time to rejoin everyone at "${instead.rejoin.title}"${instead.rejoin.time?` at ${instead.rejoin.time}`:''}${instead.rejoin.place?` (${instead.rejoin.place})`:''}`:''}. Answer what ${instead.who.join(' and ')} said they like, and name it in "why". ${instead.who.every(n=>BOYS.includes(n))?'Only the boys are sitting it out, and they cannot go off alone — say plainly in notes that a grown-up has to go with them.':''} suitableFor is ${instead.who.join(', ')}.
`:forWhom?`
These are for ${forWhom} in particular. Every idea should answer something ${forWhom} ticked, tagged or said they love, and "why" names which. Still fit it to the day the family is having; say in suitableFor if the others would sit it out.
`:`
These are for the whole party. Prefer ideas that answer more than one person's likes at once, and say whose in "why".
`}
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
    system:withGuide(SYSTEM,state,japanDate()),
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
 // Only links whose site the searches in this answer actually returned survive.
 const hosts=seenHosts([...messages.map(m=>m.content),message.content]);
 const suggestions=result.suggestions.map(item=>normaliseSuggestion(item,state,hosts)).filter(s=>s.draft.title).slice(0,MAX_SUGGESTIONS);
 // An alternative is for the ones sitting the stop out, on that day, whatever came back.
 if(instead)for(const s of suggestions){
  const members=state.members||MEMBERS;
  s.draft.suitableFor=instead.who.length===members.length?[]:[...instead.who];
  s.draft.day=instead.step.day;s.draft.time=instead.step.time||null;
  s.draft.tags=[...new Set([`instead of ${instead.step.title}`.slice(0,50),...s.draft.tags])].slice(0,20);
 }
 if(!suggestions.length)throw new AppError('Nothing usable came back. Try a different place or another kind of idea.',502);
 if(!from)for(const s of suggestions)s.travelMinutes=null;
 return {suggestions,where,from:from||null,forWhom:forWhom||null,
  instead:instead?{stepId:instead.step.id,title:instead.step.title,who:instead.who,staying:instead.staying,rejoin:instead.rejoin?.title||null}:null,note:clamp(result.note,500),
  usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
