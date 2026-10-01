// Dinner tonight: somewhere to eat near the last stop of the day and near tonight's hotel, found on
// the web for a family with a five- and an eight-year-old, in the guide's voice. The reservation
// message is written by the app (src/dinner-data.js), not by the model.
import {AppError} from './model.mjs';
import {japanDate} from '../src/timing.js';
import {withGuide} from '../src/guide-data.js';
import {partyBrief} from '../src/trip-features.js';
import {dinnerAnchors,cleanDinnerOption,rankDinner,BOOKING,CHANNELS,MENUS,DINNER_PER_ANCHOR} from '../src/dinner-data.js';
import {seenHosts,checkedLink} from './links.mjs';
export const dinnerReady=()=>!!process.env.ANTHROPIC_API_KEY;
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:6,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const ids=list=>list.map(([id])=>id);
const OPTION={type:'object',additionalProperties:false,
 required:['title','japanese','cuisine','area','walkMinutes','kidsWelcome','nonSmoking','booking','channel','menu','cashOnly','cancellation','rating','ratingCount','priceBand','openNote','why','website','bookingUrl'],
 properties:{
  title:{type:'string',description:'The name as the sign reads, in English or romaji.'},
  japanese:{type:'string',description:'The name in Japanese, to point at. Empty rather than guessed.'},
  cuisine:{type:'string',description:'What it serves, in a few words: "yakitori", "family restaurant, Japanese and Western", "conveyor-belt sushi".'},
  area:{type:'string',description:'Where it is, enough to walk to: the building, floor, street or exit.'},
  walkMinutes:{type:'integer',description:'Rough walk from the place given, in minutes.'},
  kidsWelcome:{type:'boolean',description:'True only if children are clearly welcome: kids menu, high chairs, family seating, or reviews from families. A counter-only or adults-only place is false.'},
  nonSmoking:{anyOf:[{type:'boolean'},{type:'null'}],description:'True if non-smoking throughout, false if smoking is allowed anywhere, null if not seen.'},
  booking:{type:'string',enum:ids(BOOKING),description:'Whether a family of four turning up this evening needs to book.'},
  channel:{type:'string',enum:ids(CHANNELS),description:'How it takes bookings.'},
  menu:{type:'string',enum:ids(MENUS)},
  cashOnly:{anyOf:[{type:'boolean'},{type:'null'}],description:'True if cash only, false if cards are taken, null if not seen.'},
  cancellation:{type:'string',description:'Its cancellation rule if a booking channel states one ("cancel by 17:00 the day before, or 50%"). Empty if not seen.'},
  rating:{anyOf:[{type:'number'},{type:'null'}],description:'Its Google Maps rating as seen, 1–5. Null if not seen — never a guess.'},
  ratingCount:{anyOf:[{type:'integer'},{type:'null'}]},
  priceBand:{type:'string',description:'¥, ¥¥ or ¥¥¥ for the four of them, or empty.'},
  openNote:{type:'string',description:'Tonight’s hours as you understand them, said as the guess it is.'},
  why:{type:'string',description:'One line on why this one for this family tonight.'},
  website:{type:'string',description:'Its own website, exactly as a search result showed it, or empty.'},
  bookingUrl:{type:'string',description:'Its TableCheck, Tabelog, OMAKASE or own booking page, exactly as a search result showed it, or empty.'}}};
const RECORD={name:'record_dinner',description:'Record the dinner options, once, at the end.',strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['groups','note'],properties:{
  groups:{type:'array',items:{type:'object',additionalProperties:false,required:['anchor','options'],properties:{
   anchor:{type:'string',enum:['last','hotel'],description:'Which place these are near, as given.'},
   options:{type:'array',items:OPTION,description:`Up to ${DINNER_PER_ANCHOR}, best first.`}}}},
  note:{type:'string',description:'One line on how sure you are, and what to do if these are full.'}}}};
const SYSTEM=`You find dinner tonight for one family in Japan who have nothing booked: near the last place they are today, and at or near their hotel, so they can choose whether to eat before heading back or once they are there.

- Up to ${DINNER_PER_ANCHOR} places for each place given, within about ten minutes' walk (in the hotel itself counts). Real places you have reason to believe are there; fewer is better than invented.
- For a five- and an eight-year-old at the end of a long day: somewhere children are clearly welcome, ideally non-smoking, ideally walk-in or easy to book tonight, with a picture or English menu. Family restaurants, department-store restaurant floors, hotel restaurants, conveyor-belt sushi, okonomiyaki and yakiniku places with family seating all count. Not standing bars, counter-only omakase, or adults-only izakaya.
- Set every field honestly: null or "unknown" where you have not seen it. Flag cash only. Name the booking channel (TableCheck, Tabelog, OMAKASE, its own site, phone only) and give its cancellation rule if it states one.
- Links only exactly as search results showed them. Never invent a phone number.
- Call record_dinner exactly once.`;
const clamp=(v,n)=>String(v??'').trim().slice(0,n);
export async function findDinner({day},state,now=new Date()){
 if(!dinnerReady())throw new AppError('Dinner suggestions need an Anthropic API key on the deployment.',503);
 if(!(state.days||[]).some(d=>d.date===day))throw new AppError('Choose a trip day.');
 const anchors=dinnerAnchors(state,day);if(!anchors.length)throw new AppError('There is no stop or hotel on this day to look near.');
 const city=(state.days.find(d=>d.date===day)?.city)||'';
 const ask=`Tonight, ${day}, in ${city}.\nLook near:\n${anchors.map(a=>`- [${a.id}] ${a.label}${a.place&&a.place!==a.label?` — ${a.place}`:''}`).join('\n')}\n\nWho is eating:\n${partyBrief(state)}`;
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
  throw new AppError('Dinner could not be looked up. Try What’s near here, or Maps.',502);
 }
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_dinner');
 if(!call?.input?.groups)throw new AppError('Nothing came back. Try What’s near here.',502);
 const hosts=seenHosts([...messages.map(m=>m.content),message.content]);
 const groups=anchors.map(a=>{
  const raw=call.input.groups.filter(g=>g.anchor===a.id).flatMap(g=>g.options||[]);
  return {anchor:a.id,label:a.label,place:a.place,options:rankDinner(raw.map(o=>cleanDinnerOption(o,u=>checkedLink(u,hosts))).filter(Boolean)).slice(0,DINNER_PER_ANCHOR)};
 }).filter(g=>g.options.length);
 if(!groups.length)throw new AppError('Nothing usable came back. Try What’s near here.',502);
 return {groups,note:clamp(call.input.note,300),at:now.toISOString()};
}
