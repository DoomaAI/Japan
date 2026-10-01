// Gift ideas for one person back home, found on the web from what the family wrote about them
// and where the trip still goes, in the guide's voice. The built-in ideas (src/gift-data.js)
// need no signal; this is for looking further, and what comes back is kept on the person so
// every phone sees the same list.
import {AppError,modelReady} from './model.mjs';
import {japanDate} from '../src/timing.js';
import {withGuide} from '../src/guide-data.js';
import {findGiftPerson,giftBrief,cleanGuideIdea} from '../src/gift-data.js';
import {seenHosts,checkedLink} from './links.mjs';
import {clamp} from '../src/text.js';
import {claude,OPUS} from './usage.mjs';
export const giftIdeasReady=modelReady;
export const GUIDE_IDEAS=6;
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:6,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const IDEA={type:'object',additionalProperties:false,required:['title','why','where','area','day','yen','website'],properties:{
 title:{type:'string',description:'The gift, specific enough to ask for in the shop.'},
 why:{type:'string',description:'One line on why it suits this person, from what was said about them.'},
 where:{type:'string',description:'The shop that sells it, by name, with the branch.'},
 area:{type:'string',description:'The neighbourhood or station, e.g. "Ginza" or "Nishiki Market".'},
 day:{type:'string',description:'The trip date (YYYY-MM-DD) we are in that area, from the itinerary given, or empty.'},
 yen:{anyOf:[{type:'integer'},{type:'null'}],description:'A typical price in yen, or null if not seen.'},
 website:{type:'string',description:'The shop or product page exactly as a search result showed it, or empty.'}}};
const RECORD={name:'record_gift_ideas',description:'Record the ideas, once, at the end.',strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['ideas','note'],properties:{
  ideas:{type:'array',items:IDEA,description:`Up to ${GUIDE_IDEAS}, best first.`},
  note:{type:'string',description:'One line of advice for buying for this person, e.g. on customs, luggage or tax-free.'}}}};
const SYSTEM=`You suggest souvenirs from Japan for one person back home in Australia, for a family partway through a trip.

- Up to ${GUIDE_IDEAS} ideas that fit what is said about the person; specific, giftable things, not categories.
- Prefer shops in the places the family still has ahead of them, and name the day they are there.
- Stay inside the budget where one is given. Respect what they would rather avoid; no alcohol for children.
- Mind Australian customs: food, wood and plant material must be declared; seeds, soil, fresh food and meat are refused. Prefer things that clear easily.
- Fit in a suitcase. Fewer, real shops beat invented ones.
- Links only exactly as search results showed them.
- Call record_gift_ideas exactly once.`;
export function giftIdeasRequest(b,state){
 const person=findGiftPerson(state,String(b?.personId||''));
 if(!person)throw new AppError('That person is no longer on the list.',404);
 return {person,want:clamp(b?.want,120)};
}
export async function findGiftIdeas({person,want},state,user,now=new Date()){
 if(!giftIdeasReady())throw new AppError('Suggestions need an Anthropic API key on the deployment.',503);
 const today=japanDate(now);
 const ahead=(state.days||[]).filter(d=>d.date>=today).map(d=>`${d.date}: ${d.city||''} — ${d.title||''}`).join('\n')||'The trip is over; suggest things that can be bought at the airport or ordered online from Japan.';
 const ask=`Gift ideas for:\n${giftBrief(person)}${want?`\nIn particular: ${want}`:''}\n\nWhere the family is still going:\n${ahead}`;
 const client=await claude('gift-ideas');let message,messages=[{role:'user',content:ask}];
 try{
  for(let attempt=0;attempt<3;attempt++){
   message=await client.messages.create({model:OPUS,max_tokens:8000,system:withGuide(SYSTEM,state,today),thinking:{type:'adaptive'},output_config:{effort:'low'},tools:[SEARCH,RECORD],messages});
   if(message.stop_reason!=='pause_turn')break;
   messages=[...messages,{role:'assistant',content:message.content}];
  }
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Busy. Try again in a moment.',429);
  throw new AppError('Nothing could be looked up just now. The ideas above still work.',502);
 }
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_gift_ideas');
 if(!call?.input?.ideas)throw new AppError('Nothing came back. Try again in a moment.',502);
 const hosts=seenHosts([...messages.map(m=>m.content),message.content]);
 const days=new Set((state.days||[]).map(d=>d.date));
 const ideas=call.input.ideas.map(o=>cleanGuideIdea(o,u=>checkedLink(u,hosts))).filter(Boolean).map(i=>days.has(i.day)?i:{...i,day:''}).slice(0,GUIDE_IDEAS);
 if(!ideas.length)throw new AppError('Nothing suitable came back. Try again, or use the ideas above.',502);
 return {ideas,want,note:clamp(call.input.note,300),at:now.toISOString(),by:user.name};
}
