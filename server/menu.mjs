import {AppError} from './model.mjs';
import {FOOD} from '../src/food-data.js';
import {foodAverage,foodRatings,triedFood} from '../src/trip-features.js';
export const menuReaderReady=()=>!!process.env.ANTHROPIC_API_KEY;
const MEDIA_TYPES=['image/jpeg','image/png','image/webp'];
// Roughly 3 MB of base64, comfortably inside Vercel's request body limit. The phone downscales before sending, so a real photo lands far
// under this; the cap is here to stop an oversized upload reaching the model at all.
const MAX_BASE64=3_000_000;
const SCHEMA={
 type:'object',additionalProperties:false,
 required:['readable','place','suggestions','avoid','note'],
 properties:{
  readable:{type:'boolean',description:'False if the photo is too blurry, too dark or not a menu.'},
  place:{type:'string',description:'The restaurant name if it is on the menu, otherwise an empty string.'},
  note:{type:'string',description:'One or two sentences of practical advice for this family at this restaurant.'},
  suggestions:{type:'array',description:'Up to eight dishes from this menu, best first.',items:{
   type:'object',additionalProperties:false,
   required:['ja','en','dish','why','forWhom','matchesOurList','spicy','price'],
   properties:{
    ja:{type:'string',description:'The dish exactly as written on the menu, in Japanese.'},
    en:{type:'string',description:'A short English name.'},
    dish:{type:'string',description:'The plain common name of the same dish in Japanese, with the restaurant\'s wording stripped off: 唐揚げ rather than 名物!若鶏の唐揚げ定食. This is what a picture of it is looked up under. Empty if the dish has no common name.'},
    why:{type:'string',description:'One sentence on why this family would like it.'},
    forWhom:{type:'array',items:{type:'string',enum:['Damien','Lauren','Nate','Boston']}},
    matchesOurList:{type:'string',description:'The id of the matching dish on the family food list, or an empty string.'},
    spicy:{type:'boolean'},
    price:{type:'string',description:'The price as printed, or an empty string.'}}}},
  avoid:{type:'array',description:'Up to three things on this menu worth knowing about before ordering.',items:{
   type:'object',additionalProperties:false,required:['en','why'],
   properties:{en:{type:'string'},why:{type:'string'}}}}}
};
// What the family already knows it likes, so the suggestions are theirs rather than generic.
function tastes(state){
 const rated=FOOD.filter(f=>foodAverage(state,f.id)!==null);
 const line=f=>`${f.id} · ${f.en} (${f.ja}) — ${Object.entries(foodRatings(state,f.id)).map(([n,r])=>`${n} ${r}/5`).join(', ')}`;
 return [
  `Loved (4+): ${rated.filter(f=>foodAverage(state,f.id)>=4).map(line).join(' | ')||'nothing rated yet'}`,
  `Not for us (2 or less): ${rated.filter(f=>foodAverage(state,f.id)<=2).map(line).join(' | ')||'nothing'}`,
  `Tried already: ${FOOD.filter(f=>Object.keys(triedFood(state,f.id)).length).map(f=>f.id).join(', ')||'nothing yet'}`,
  `Still want to try: ${FOOD.filter(f=>!Object.keys(triedFood(state,f.id)).length).map(f=>`${f.id}=${f.en} (${f.ja})`).join(' | ')}`,
  `Our own additions: ${(state.foodItems||[]).map(f=>`${f.en} (${f.ja||'no Japanese'})`).join(' | ')||'none'}`
 ].join('\n');
}
const SYSTEM=`You read a photograph of a Japanese restaurant menu for one Australian family and say what they would like.

The family: Damien and Lauren, and their sons Boston (8) and Nate (5).
Nate is five: nothing spicy, nothing challenging in texture, and he needs a plain fallback on every menu — rice, chips, plain noodles, grilled chicken. Boston is adventurous but still a child.

Rules:
- Only suggest dishes that are actually on this menu. Never invent one. If you cannot read a dish clearly, leave it out.
- Copy the Japanese exactly as printed, including any kanji you can read. This is what they will point at.
- "dish" is the same dish under its plain common name, in Japanese, with the restaurant's flourishes, the set-meal wording and the size dropped — 唐揚げ from 名物!若鶏の唐揚げ定食. A picture of the dish is looked up under it, so it has to be the ordinary name people would write an article about. Leave it empty if the dish has no name of its own.
- Prefer dishes the family already rated highly, and dishes still on their want-to-try list. Set matchesOurList to that dish's id when it is the same dish; otherwise leave it empty.
- Always include at least one thing Nate will eat, if the menu has one. Say so in "why".
- forWhom names who each dish suits. Use it honestly; a dish can suit everyone.
- "avoid" is for things worth knowing before ordering: very spicy dishes, raw items, whole small fish, natto, anything a child would find a shock. Not a list of dislikes.
- If the photo is unreadable or is not a menu, set readable to false and leave the arrays empty.
- You cannot verify allergens from a photograph. Never state that something is free of an allergen; if it matters, say to ask the staff.`;
export async function readMenu({image,mediaType},state){
 if(!menuReaderReady())throw new AppError('The menu reader is not switched on. Add an Anthropic API key to the deployment.',503);
 if(typeof image!=='string'||!image)throw new AppError('Take or choose a photo of the menu.');
 const data=image.includes(',')&&image.startsWith('data:')?image.slice(image.indexOf(',')+1):image;
 if(!/^[A-Za-z0-9+/=]+$/.test(data))throw new AppError('That photo could not be read.');
 if(data.length>MAX_BASE64)throw new AppError('That photo is too large. Try again — the app normally shrinks it for you.',413);
 if(!MEDIA_TYPES.includes(mediaType))throw new AppError('Use a JPEG, PNG or WebP photo.');
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let response;
 try{
  response=await client.messages.create({
   model:'claude-opus-5',
   max_tokens:8000,
   system:SYSTEM,
   // A hungry family is standing at a counter, so this trades some depth for a faster answer.
   thinking:{type:'adaptive'},
   output_config:{effort:'medium',format:{type:'json_schema',schema:SCHEMA}},
   messages:[{role:'user',content:[
    {type:'image',source:{type:'base64',media_type:mediaType,data}},
    {type:'text',text:`Read this menu and choose what this family would like.\n\nWhat we already know about their tastes:\n${tastes(state)}`}]}]
  });
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('The menu reader is busy. Wait a moment and try again.',429);
  if(e?.status===400)throw new AppError('That photo could not be read as a menu. Try a clearer, closer shot.',400);
  throw new AppError('The menu reader could not be reached. Order the old-fashioned way and try again later.',502);
 }
 if(response.stop_reason==='refusal')throw new AppError('The menu reader declined to answer for this photo.',422);
 const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('');
 let parsed;try{parsed=JSON.parse(text);}catch{throw new AppError('The menu reader replied in a form the app could not use. Try again.',502);}
 return {...parsed,usage:{input:response.usage?.input_tokens??0,output:response.usage?.output_tokens??0}};
}
