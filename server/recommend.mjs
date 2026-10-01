import {AppError} from './model.mjs';
import {PROPOSAL_KINDS,tripAreas} from '../src/trip-features.js';
import {researchReady} from './research.mjs';
import {RECOMMEND_TEXT,MAX_RECOMMEND_ITEMS,RECOMMENDER_SAID,MAX_RECOMMEND_SHOTS} from '../src/recommend-data.js';
// Reads a message from a friend or relative ("you HAVE to get the katsu sando at…, and if you're
// in Kyoto go early to…") into the separate things they recommended. No web search: it is only
// reading what they wrote, so it is quick and cheap, and nothing is saved here. The list comes
// back for a person to tick through, and goes onto the board through the ordinary mutate.
const record=areas=>({
 name:'record_recommendations',
 description:'Record each separate thing the message recommends, once, in the order it comes.',
 strict:true,
 input_schema:{type:'object',additionalProperties:false,required:['items'],properties:{items:{type:'array',items:{
  type:'object',additionalProperties:false,required:['title','place','category','said','within','accessibleFrom','travel'],
  properties:{
   title:{type:'string',description:'The place, dish, event or activity as a short name, in English, the way the family would say it.'},
   place:{type:'string',description:'The area and city if the message says or makes it plain. Empty otherwise — never guessed.'},
   category:{type:'string',enum:PROPOSAL_KINDS.map(([id])=>id)},
   said:{type:'string',description:'What they said about it, close to their own words, one or two sentences. Tips such as "go early" or "book ahead" belong here.'},
   within:{type:'string',description:'If this is a part of another item in this list (a shrine in Nikko, a stall in Nishiki Market), that item\'s title exactly as you gave it. Empty otherwise.'},
   accessibleFrom:{type:'string',enum:['',...areas],description:'Which of the family\'s bases it is reached from: the one the message names ("a day trip from Kyoto"), or the one it is plainly in or nearest to. Empty if you cannot tell, and empty for an item that has a within.'},
   travel:{type:'string',description:'How long or how to get there, if the message says ("2 hours by train", "15 min walk from the station"). Empty otherwise — never estimated.'}}}}}}
});
const SYSTEM=`You read a message, or screenshots of one, that a friend or relative sent an Australian family about their trip to Japan, and pull out each separate thing it recommends: a place, a restaurant, a dish, a shop, an event or something to do.

- One item per recommendation. A list of five ramen shops is five items; "the food hall and its sushi counter" is one.
- Keep their words in said. Tips ("go early", "book a month ahead", "skip the queue on weekdays") are the most useful part.
- Messages come in groups. Under a heading such as "Day trips from Tokyo" or "Kyoto", everything belongs to that base. Under a place ("Nikko: the shrine, the falls"), the shrine and the falls are items of their own with within set to Nikko, and Nikko is an item too.
- Leave out greetings, news, questions and anything that is not a recommendation. Leave out warnings about what to avoid.
- In a screenshot of a chat, read only what the friend wrote, not the family's own replies, the app's buttons or the time stamps.
- Never add anything the message does not say, and never correct a name you are unsure of: copy it.

Call record_recommendations exactly once.`;
const clamp=(v,max)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
export function normaliseRecommendations(items,areas=[]){
 const list=(Array.isArray(items)?items:[]).map(i=>({title:clamp(i?.title,250),place:clamp(i?.place,250),
  category:PROPOSAL_KINDS.some(([id])=>id===i?.category)?i.category:'place',said:clamp(i?.said,RECOMMENDER_SAID),
  within:clamp(i?.within,250),accessibleFrom:areas.includes(i?.accessibleFrom)?i.accessibleFrom:'',travel:clamp(i?.travel,120)}))
  .filter(i=>i.title).slice(0,MAX_RECOMMEND_ITEMS);
 // A part must name another item in the list that is not itself a part; anything else stands alone.
 const tops=new Set(list.filter(i=>!i.within).map(i=>i.title));
 return list.map(i=>i.within&&(!tops.has(i.within)||i.within===i.title)?{...i,within:''}:i.within?{...i,accessibleFrom:''}:i);
}
// Screenshots of a chat, shrunk on the phone first, as the menu reader's photos are.
const MEDIA_TYPES=['image/jpeg','image/png','image/webp'],MAX_BASE64=3_000_000;
function shots(images){
 if(images===undefined||images===null)return [];
 if(!Array.isArray(images)||images.length>MAX_RECOMMEND_SHOTS)throw new AppError(`Up to ${MAX_RECOMMEND_SHOTS} screenshots at a time.`);
 return images.map(({image,mediaType}={})=>{
  if(typeof image!=='string'||!/^[A-Za-z0-9+/=]+$/.test(image))throw new AppError('That screenshot could not be read.');
  if(image.length>MAX_BASE64)throw new AppError('That screenshot is too large. Try again — the app normally shrinks it for you.',413);
  if(!MEDIA_TYPES.includes(mediaType))throw new AppError('Use a JPEG, PNG or WebP screenshot.');
  return {type:'image',source:{type:'base64',media_type:mediaType,data:image}};
 });
}
export async function readRecommendations({text='',from,images},state={days:[]}){
 if(!researchReady())throw new AppError('Reading messages is not switched on. Add an Anthropic API key to the deployment.',503);
 const pictures=shots(images),areas=tripAreas(state);
 if(typeof text!=='string'||(!text.trim()&&!pictures.length))throw new AppError('Paste the message or add a screenshot first.');
 if(text.length>RECOMMEND_TEXT)throw new AppError(`Keep the message under ${RECOMMEND_TEXT} characters, or paste it in two goes.`);
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let message;
 try{
  message=await client.messages.create({model:'claude-opus-5',max_tokens:4000,system:SYSTEM,
   tools:[record(areas)],tool_choice:{type:'tool',name:'record_recommendations'},
   messages:[{role:'user',content:[...pictures,{type:'text',text:`${from?`From ${clamp(from,80)}.`:'From a friend.'}\nThe family's bases: ${areas.join(', ')||'not set'}.${text.trim()?`\n\n${text.trim()}`:'\n\nThe message is in the screenshots.'}`}]}]});
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Busy. Wait a moment and try again.',429);
  if(e?.status===400&&pictures.length)throw new AppError('Those screenshots could not be read. Try clearer ones, or paste the text.',400);
  throw new AppError('The message could not be read just now. Split it line by line instead.',502);
 }
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_recommendations');
 return {items:normaliseRecommendations(call?.input?.items,areas)};
}
