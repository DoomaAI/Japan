// After dinner: a nightcap, a drink, a night out or a late treat near tonight's hotel, found on the
// web for whoever asked, with what they are after and who is coming in mind, in the guide's voice.
// The moods and what each asks for live in src/night-out-data.js.
import {AppError} from './model.mjs';
import {japanDate} from '../src/timing.js';
import {withGuide} from '../src/guide-data.js';
import {partyBrief} from '../src/trip-features.js';
import {nightAnchor,moodOf,moodsFor,whoFor,cleanNightOption,rankNight,VIBES,PAYS,NIGHT_PER_MOOD} from '../src/night-out-data.js';
import {seenHosts,checkedLink} from './links.mjs';
export const nightOutReady=()=>!!process.env.ANTHROPIC_API_KEY;
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:6,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const ids=list=>list.map(([id])=>id);
const OPTION={type:'object',additionalProperties:false,
 required:['title','japanese','kind','area','walkMinutes','vibe','kidsWelcome','nonSmoking','inHotel','cover','pay','rating','ratingCount','priceBand','openNote','why','website'],
 properties:{
  title:{type:'string',description:'The name as the sign reads, in English or romaji.'},
  japanese:{type:'string',description:'The name in Japanese, to point at. Empty rather than guessed.'},
  kind:{type:'string',description:'What it is, in a few words: "hotel lounge bar, 1st floor", "whisky bar", "standing sake bar", "jazz club", "parfait café".'},
  area:{type:'string',description:'Where it is, enough to walk to: the building, floor, street or exit.'},
  walkMinutes:{type:'integer',description:'Rough walk from the place given, in minutes. 0 if it is in the hotel.'},
  vibe:{type:'string',enum:ids(VIBES)},
  kidsWelcome:{type:'boolean',description:'True only if children are clearly allowed in the evening. Bars that are adults-only or bar-counter only are false.'},
  nonSmoking:{anyOf:[{type:'boolean'},{type:'null'}],description:'True if non-smoking throughout, false if smoking is allowed anywhere, null if not seen.'},
  inHotel:{type:'boolean',description:'True if it is inside the hotel given.'},
  cover:{type:'string',description:'Any cover or table charge (otoshi, seat charge, music charge) as seen, e.g. "¥1,000 a person". Empty if none seen.'},
  pay:{type:'string',enum:ids(PAYS)},
  rating:{anyOf:[{type:'number'},{type:'null'}],description:'Its Google Maps rating as seen, 1–5. Null if not seen — never a guess.'},
  ratingCount:{anyOf:[{type:'integer'},{type:'null'}]},
  priceBand:{type:'string',description:'¥, ¥¥ or ¥¥¥ a person, or empty.'},
  openNote:{type:'string',description:'Tonight’s hours and last orders as you understand them, said as the guess it is.'},
  why:{type:'string',description:'One line on why this one, for this person, tonight.'},
  website:{type:'string',description:'Its own website or listing page, exactly as a search result showed it, or empty.'}}};
const RECORD={name:'record_night_out',description:'Record the places, once, at the end.',strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['options','note'],properties:{
  options:{type:'array',items:OPTION,description:`Up to ${NIGHT_PER_MOOD}, best first.`},
  note:{type:'string',description:'One line on how sure you are, and what to do if these are shut or full.'}}}};
const SYSTEM=`You find somewhere to go after dinner tonight for one family on holiday in Japan, near the place given (usually their hotel).

- Up to ${NIGHT_PER_MOOD} places, real ones you have reason to believe are open tonight; fewer is better than invented.
- Fit what the person asking is after, and their own likes where the family notes give them. They are tired at the end of a travelling day: nearer beats cleverer.
- When the children are coming, only places that clearly let children in at night, ideally smoke-free. When it is just the grown-ups, adults-only bars are fine.
- Say plainly about cover and seat charges, cash only, smoking, and last orders. Avoid touts and places known for overcharging visitors.
- Set every field honestly: null, "unknown" or empty where you have not seen it.
- Links only exactly as search results showed them. Never invent a phone number.
- Call record_night_out exactly once.`;
const clamp=(v,n)=>String(v??'').trim().slice(0,n);
export function nightRequest(b,state,user){
 const day=String(b?.day||''),mood=moodOf(b?.mood);
 if(!(state.days||[]).some(d=>d.date===day))throw new AppError('Choose a trip day.');
 if(!mood||!moodsFor(user).some(m=>m.id===mood.id))throw new AppError('Choose what you are after.',mood?403:400);
 const want=clamp(b?.want,80),who=whoFor(mood.id,b?.who);
 return {day,mood,want,who};
}
export async function findNightOut({day,mood,want,who},state,user,now=new Date()){
 if(!nightOutReady())throw new AppError('Suggestions need an Anthropic API key on the deployment.',503);
 const anchor=nightAnchor(state,day);if(!anchor)throw new AppError('There is no hotel or stop on this day to look near.');
 const city=(state.days.find(d=>d.date===day)?.city)||'';
 const ask=`Tonight, ${day}, in ${city}. Look near: ${anchor.label}${anchor.place&&anchor.place!==anchor.label?` — ${anchor.place}`:''}.
What ${user.name} is after: ${mood.label}. ${mood.ask}${want?`\nIn particular: ${want}.`:''}
Who is going: ${who==='family'?'the whole family, children included':'just the grown-ups; the children are in bed or with the other parent'}.
Within about ${mood.walk} minutes' walk where possible.

The family:
${partyBrief(state)}`;
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();let message,messages=[{role:'user',content:ask}];
 try{
  for(let attempt=0;attempt<3;attempt++){
   message=await client.messages.create({model:'claude-opus-5-5',max_tokens:8000,system:withGuide(SYSTEM,state,japanDate(now)),thinking:{type:'adaptive'},output_config:{effort:'low'},tools:[SEARCH,RECORD],messages});
   if(message.stop_reason!=='pause_turn')break;
   messages=[...messages,{role:'assistant',content:message.content}];
  }
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Busy. Try again in a moment.',429);
  throw new AppError('Nothing could be looked up just now. Try What’s near here, or Maps.',502);
 }
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_night_out');
 if(!call?.input?.options)throw new AppError('Nothing came back. Try What’s near here.',502);
 const hosts=seenHosts([...messages.map(m=>m.content),message.content]);
 const options=rankNight(call.input.options.map(o=>cleanNightOption(o,u=>checkedLink(u,hosts))).filter(Boolean),who).slice(0,NIGHT_PER_MOOD);
 if(!options.length)throw new AppError('Nothing suitable came back. Try What’s near here.',502);
 return {mood:mood.id,want,who,anchor:anchor.label,options,note:clamp(call.input.note,300),at:now.toISOString(),by:user.name};
}
