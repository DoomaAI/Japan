import {AppError,MEMBERS} from './model.mjs';
import {NEARBY_KINDS,PRICE_BANDS,PROPOSAL_KINDS,proposalDraft,roundCoord,validCoords,partyBrief,matchDish,MAX_DISH_HUNT,
 MIN_RATING_VOTES,MINUTES_PER_STAR,placeScore,rankNearby,ratingText,validRating} from '../src/trip-features.js';
export const nearbyReady=()=>!!process.env.ANTHROPIC_API_KEY;
export const MAX_NEARBY=8;
// This is the one asked standing in the street with two tired children, so it is tuned for speed:
// four searches, low effort, a short answer. The planning board is where thinking happens.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:4,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const option={
 type:'object',additionalProperties:false,
 required:['title','japanese','kind','what','area','walkMinutes','rating','ratingCount','priceBand','openNote','kidFriendly','why','dish'],
 properties:{
  title:{type:'string',description:'The name as a sign outside would read it, in English or romaji.'},
  japanese:{type:'string',description:'The name in Japanese, for pointing at. Empty rather than guessed.'},
  kind:{type:'string',enum:NEARBY_KINDS.map(([id])=>id)},
  what:{type:'string',description:'One line on what it actually is.'},
  area:{type:'string',description:'The street, block or landmark it is by — enough to walk to it.'},
  walkMinutes:{type:'integer',description:'Rough walk in minutes from the place given. Your best estimate.'},
  rating:{anyOf:[{type:'number'},{type:'null'}],description:'The Google Maps star rating, 1 to 5, as it stands today. Null if you have not seen it — never a guess, and never a rating for a different branch.'},
  ratingCount:{anyOf:[{type:'integer'},{type:'null'}],description:'How many Google ratings that average is made of. Null if you do not know.'},
  priceBand:{type:'string',enum:PRICE_BANDS.map(([id])=>id)},
  openNote:{type:'string',description:'What you know about when it is open, said as the guess it is. Empty if you do not know.'},
  kidFriendly:{type:'boolean',description:'True if a five-year-old is welcome and will manage it.'},
  why:{type:'string',description:'One short line on why this one, for this family, right now.'},
  dish:{type:'string',description:'If a list of dishes they still want to try came with the question and this place does one of them, that dish, copied exactly as the list writes it. Empty otherwise.'}}
};
const RECORD={
 name:'record_nearby',
 description:'Record what is near enough to walk to, once, at the end.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['anchor','options','note'],
  properties:{
   anchor:{type:'string',description:'Where you understood them to be standing, in your own words. If you are not sure, say so here.'},
   options:{type:'array',items:option,description:'Best first as you see it; the app puts them in its own order.'},
   note:{type:'string',description:'One line on how sure you are, and what to do if none of these are there any more.'}}}
};
const SYSTEM=`You are asked what is near enough to walk to, right now, by one Australian family standing somewhere in Japan.

The family: Damien and Lauren, with their sons Boston (8) and Nate (5). They speak no Japanese.

This is the urgent one. They are not planning a day — somebody needs a toilet, or lunch, or the boys have run out of patience. Answer like a local being asked in the street.

How to answer:
- Only name places you have real reason to believe are there. A named place you are confident about beats a vague one. If you can only say "there is a Lawson on the main road by the north exit", that is still useful — put that in "area" and be plain about it.
- Nothing more than about fifteen minutes' walk. Give them in whatever order you think best; the app reorders them by its own rule below.
- "walkMinutes" is your estimate and everyone knows it. Do not pretend to precision you do not have.
- The family ranks what you name by its Google rating against the walk to it: a minute on foot is worth a tenth of a star, so ten minutes is a whole star. Search for the rating and the number of ratings behind it, and give them as "rating" and "ratingCount". A rating you have not actually seen is null — a made-up 4.5 outranks a real one and sends them the wrong way. An unrated place is still worth naming when it is close and it answers the question; a convenience store is the obvious one.
- That exchange rate is also how to choose what to name at all: somewhere very good is worth naming a few minutes further out, and somewhere ordinary is only worth naming if it is close.
- The Japanese name earns its place: it is what they point at when nobody speaks English.
- Nate is five. For food, at least one option he will actually eat, and set kidFriendly honestly — a standing counter with no seats is not for him.
- Convenience stores in Japan have toilets, cash machines and hot food, so they answer several of these at once. Say so where it is the practical answer.
- Sometimes they are hunting a dish rather than a meal, and the dishes they still want to try come with the question. Then the job is somewhere near them that actually does one of those, named in "dish" exactly as the list writes it. Do not stretch it: a ramen shop is not takoyaki, and a place that does none of them is still worth naming with "dish" left empty. Put the ones that do a listed dish first.
- "openNote" is a guess unless you have checked, and must read like one.
- Never invent a web address or a phone number. You are not asked for either.
- If you genuinely do not know the area well enough, say so in "anchor" and give fewer, more general answers rather than inventing named shops.

You cannot see a map, you do not know what has closed this year, and you are not confirming anything is open. The app says so on the screen. Search if it helps, then call record_nearby exactly once.`;
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
// Everything comes back through the same gate as the rest of the app: clamped, checked against
// the lists the screen knows how to draw, and carrying no links of its own.
export function normaliseNearby(item,state,wishlist=[]){
 const kind=NEARBY_KINDS.some(([id])=>id===item.kind)?item.kind:'food';
 const walkMinutes=Number.isInteger(item.walkMinutes)&&item.walkMinutes>=0&&item.walkMinutes<=180?item.walkMinutes:null;
 const dish=matchDish(item.dish,wishlist);
 // A rating is Google's number or it is nothing: out of range it is dropped rather than bent into
 // range, and an average built on a handful of votes is not an average worth walking on.
 const votes=Number.isInteger(item.ratingCount)&&item.ratingCount>=0?item.ratingCount:null;
 const rating=votes!==null&&votes<MIN_RATING_VOTES?null:validRating(Number(item.rating));
 const ratingCount=rating===null?null:votes;
 const draft=proposalDraft({
  title:clamp(item.title,250),place:clamp(item.area,250),japanese:clamp(item.japanese,250),
  // Saved or scheduled, it takes the rating with it: three days later the card is gone and the
  // note is all that says why this one and not the one closer to the station.
  notes:[clamp(item.what,1000),dish?`On our food list: ${dish}`:'',
   rating===null?'':`Google ${ratingText(rating,ratingCount)}`,clamp(item.openNote,250)].filter(Boolean).join('\n'),
  category:['food','quick','coffee','konbini'].includes(kind)?'food':'other',
  timing:'flex',duration:kind==='food'?60:20,cost:null,costNote:'',
  suitableFor:item.kidFriendly===false?(state.members||MEMBERS).filter(n=>n!=='Nate'):[],
  tags:[clamp(item.area,50)].filter(Boolean),source:'suggested'
 });
 return {draft,kind,walkMinutes,dish,rating,ratingCount,score:placeScore({rating,walkMinutes}),
  priceBand:PRICE_BANDS.some(([id])=>id===item.priceBand)?item.priceBand:'',
  openNote:clamp(item.openNote,250),what:clamp(item.what,1000),area:clamp(item.area,250),
  kidFriendly:item.kidFriendly===true,why:clamp(item.why,300)};
}
export async function nearbyPlaces({lat,lng,place,city,kinds,note,wishlist},state){
 if(!nearbyReady())throw new AppError('Recommendations are not switched on. Add an Anthropic API key to the deployment.',503);
 const coords=lat===undefined||lat===null||lng===undefined||lng===null?null
  :validCoords(Number(lat),Number(lng))?{lat:roundCoord(Number(lat)),lng:roundCoord(Number(lng))}
  :(()=>{throw new AppError('That position could not be read.');})();
 const anchor=clamp(place,250),where=clamp(city,120);
 if(!coords&&!anchor)throw new AppError('Say where you are, or let the phone tell us.');
 const want=(Array.isArray(kinds)?kinds:[]).filter(id=>NEARBY_KINDS.some(([key])=>key===id));
 if(!want.length)throw new AppError('Choose what you are looking for.');
 // Asked from the food page, the question carries the dishes still on the list. They are names of
 // dishes and nothing else — no part of who the family is travels with them that does not already.
 const hunting=[...new Set((Array.isArray(wishlist)?wishlist:[]).map(n=>clamp(n,120)).filter(Boolean))].slice(0,MAX_DISH_HUNT);
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 // The coordinates on their own are a pin in an empty map. The place the itinerary says they are
 // at, and the city they are in today, are what make the answer worth reading.
 const ask=`They are looking for: ${want.map(id=>NEARBY_KINDS.find(([key])=>key===id)[1]).join(', ')}

Where they are:${coords?`\n- Position, rounded to about a hundred metres: ${coords.lat}, ${coords.lng}`:''}${anchor?`\n- At or beside: ${anchor}`:''}${where?`\n- In: ${where}`:''}
${hunting.length?`\nStill on their food list, none of it tried yet. Somewhere that does one of these is what they are after, and say which in "dish", copied exactly as written here:\n${hunting.map(n=>`- ${n}`).join('\n')}\n`:''}
${clamp(note,250)?`\nThey add: ${clamp(note,250)}`:''}
Who is with them:
${partyBrief(state)}`;
 let message,messages=[{role:'user',content:ask}];
 try{
  for(let attempt=0;attempt<3;attempt++){
   message=await client.messages.create({
    model:'claude-opus-5',
    max_tokens:6000,
    system:SYSTEM,
    thinking:{type:'adaptive'},
    output_config:{effort:'low'},
    tools:[SEARCH,RECORD],
    messages
   });
   if(message.stop_reason!=='pause_turn')break;
   messages=[...messages,{role:'assistant',content:message.content}];
  }
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Recommendations are busy. Wait a moment and try again.',429);
  if(e?.status===400)throw new AppError(`The request was refused: ${clamp(e?.error?.error?.message||e?.message,200)}`,502);
  throw new AppError('Could not reach recommendations. Try Maps, or ask someone — a convenience store is rarely far.',502);
 }
 if(message.stop_reason==='refusal')throw new AppError('That one was declined. Try asking for something plainer.',422);
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_nearby');
 const result=call?.input;
 if(!result||!Array.isArray(result.options))throw new AppError('Nothing came back. Try again, or open Maps.',502);
 const options=result.options.map(item=>normaliseNearby(item,state,hunting)).filter(o=>o.draft.title)
  // Not nearest first: best first, where best is the rating once the walk is taken off it at a
  // tenth of a star a minute. A dish we are hunting still goes above all of it, which is the whole
  // point of asking from the food page.
  .sort(rankNearby).slice(0,MAX_NEARBY);
 if(!options.length)throw new AppError('Nothing usable came back. Try Maps for this one.',502);
 return {options,anchor:clamp(result.anchor,250),note:clamp(result.note,500),from:coords,minutesPerStar:MINUTES_PER_STAR,
  usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
