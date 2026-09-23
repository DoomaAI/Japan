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
   required:['ja','en','dish','why','forWhom','matchesOurList','ingredients','spicy','heat','spiceNote','price'],
   properties:{
    ja:{type:'string',description:'The dish exactly as written on the menu, in Japanese.'},
    en:{type:'string',description:'A short English name.'},
    dish:{type:'string',description:'The plain common name of the same dish in Japanese, with the restaurant\'s wording stripped off: 唐揚げ rather than 名物!若鶏の唐揚げ定食. This is what a picture of it is looked up under. Empty if the dish has no common name.'},
    why:{type:'string',description:'One sentence on why this family would like it.'},
    forWhom:{type:'array',items:{type:'string',enum:['Damien','Lauren','Nate','Boston']}},
    matchesOurList:{type:'string',description:'The id of the matching dish on the family food list, or an empty string.'},
    ingredients:{type:'array',description:'What a dish of this name usually contains, up to eight short entries, the main things first: Pork loin, Egg, Wheat flour, Soy sauce. What the dish is normally made of, never a claim about this kitchen and never a claim that anything is absent. Empty if you do not know what is in it.',items:{type:'string'}},
    spicy:{type:'boolean',description:'True if this dish is normally served hot enough that a five-year-old could not eat it.'},
    heat:{type:'string',enum:['none','mild','hot','very hot'],description:'How hot the dish normally is. none whenever spicy is false.'},
    spiceNote:{type:'string',description:'One short line on what makes it hot and how hot it usually is — the chilli oil it is dressed in, the karashi on the side. Empty when spicy is false.'},
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
- "ingredients" is what a dish of that name is normally made of, from the name and from what is printed — never read as the kitchen's own recipe, never complete, and never evidence that something is absent. A restaurant varies its recipe and the menu does not print one. Leave it empty rather than guess at a dish you do not recognise.
- Mark "spicy" for anything normally served hot enough that Nate could not eat it: chilli, chilli oil, karashi, wasabi worked through the dish, shichimi stirred in, kimchi, mapo, curry above a mild grade. "heat" grades it and "spiceNote" says in one line what makes it hot. A sauce served on the side is not the same as a dish cooked hot, and the note should say which it is. When it is not spicy, spicy is false, heat is none and spiceNote is empty.
- "avoid" is for things worth knowing before ordering: very spicy dishes, raw items, whole small fish, natto, anything a child would find a shock. Not a list of dislikes.
- If the photo is unreadable or is not a menu, set readable to false and leave the arrays empty.
- You cannot verify allergens from a photograph, and the ingredients you list do not change that. Never state that something is free of an allergen, and never present a list of ingredients as complete; if it matters, say to ask the staff.`;
// A packet, a bottle or a single thing off a shelf, rather than a menu. Unlike a menu, a packet in
// Japan prints what is in it, so here the ingredients are read off the label rather than guessed.
const PACKET_SCHEMA={
 type:'object',additionalProperties:false,
 required:['readable','ja','en','dish','maker','what','why','forWhom','matchesOurList','ingredients','allergens','spicy','heat','spiceNote','howTo','warnings','price'],
 properties:{
  readable:{type:'boolean',description:'False if the photo is too blurry, too dark or not a food or drink item.'},
  ja:{type:'string',description:'The product name exactly as printed on the packet, in Japanese.'},
  en:{type:'string',description:'A short English name for what this is.'},
  dish:{type:'string',description:'The plain common Japanese name of this kind of food, with the brand and flavour wording dropped: せんべい rather than ばかうけ 青のり味. Empty if it has none.'},
  maker:{type:'string',description:'The brand or maker if printed, otherwise an empty string.'},
  what:{type:'string',description:'One or two sentences on what this is and how it tastes, for someone who has never seen it.'},
  why:{type:'string',description:'One sentence on whether this family would like it, and who.'},
  forWhom:{type:'array',items:{type:'string',enum:['Damien','Lauren','Nate','Boston']}},
  matchesOurList:{type:'string',description:'The id of the matching dish on the family food list, or an empty string.'},
  ingredients:{type:'array',description:'The ingredients as printed on the label (原材料名), translated to short English entries in the printed order, up to fifteen. Empty if the ingredient list is not in the photo.',items:{type:'string'}},
  allergens:{type:'array',description:'Allergens the label itself names, in English: Wheat, Egg, Milk, Peanut, Buckwheat, Shrimp, Crab, Walnut, Soy, Sesame and the rest. Only what is printed. Empty if the allergen panel is not in the photo.',items:{type:'string'}},
  spicy:{type:'boolean',description:'True if this is hot enough that a five-year-old could not eat it.'},
  heat:{type:'string',enum:['none','mild','hot','very hot'],description:'How hot it is. none whenever spicy is false.'},
  spiceNote:{type:'string',description:'One short line on what makes it hot. Empty when spicy is false.'},
  howTo:{type:'string',description:'How to prepare or eat it, if the packet says: microwave times and wattage, water to add, whether to heat it. Empty if it is ready to eat or the photo does not show it.'},
  warnings:{type:'array',description:'Up to three things worth knowing before handing it to a child: contains alcohol, caffeine, raw egg, a choking-size piece, a best-before date that has passed.',items:{type:'string'}},
  price:{type:'string',description:'The price if a sticker or tag shows one, otherwise an empty string.'}}
};
const PACKET_SYSTEM=`You read a photograph of a Japanese food or drink item — a packet, a bottle, a tin, a snack, a convenience-store onigiri, a sweet — for one Australian family, and say what it is and whether they would like it.

The family: Damien and Lauren, and their sons Boston (8) and Nate (5).
Nate is five: nothing spicy, nothing challenging in texture. Boston is adventurous but still a child.

Rules:
- Describe only the item in the photo. Never invent a product. If the photo shows several, describe the one most in view.
- Copy the Japanese product name exactly as printed. This is what they will point at or search for.
- "dish" is the plain common name of this kind of food in Japanese, with the brand and flavour dropped. A picture is looked up under it.
- "ingredients" and "allergens" are read off the label in the photo — 原材料名 and the allergen panel (アレルギー物質, 一部に〜を含む). Translate them faithfully and in order. If the label is not in the photo, or you cannot read it, leave them empty and say in "why" that the back of the packet will tell them. Never fill them in from what a product like this usually contains.
- An allergen missing from the list is never evidence that it is absent: the panel may be cut off, the product may be made on shared lines, and labels only have to name some allergens. Never state that something is free of an allergen; if it matters, say to check the label with the staff or the maker.
- Prefer things the family already rated highly or still want to try. Set matchesOurList to that dish's id when it is the same food; otherwise leave it empty.
- Mark "spicy" for anything hot enough that Nate could not eat it — chilli, wasabi, karashi, 激辛 or 辛口 on the packet — and grade it in "heat".
- "warnings" is for what a parent would want to know: alcohol (some sweets and drinks carry it, and 洋酒 is an ingredient to flag), caffeine, raw egg, something a small child could choke on, an expired date.
- If the photo is unreadable or is not a food or drink item, set readable to false and leave everything else empty.`;
function photo({image,mediaType}){
 if(typeof image!=='string'||!image)throw new AppError('Take or choose a photo of the menu.');
 const data=image.includes(',')&&image.startsWith('data:')?image.slice(image.indexOf(',')+1):image;
 if(!/^[A-Za-z0-9+/=]+$/.test(data))throw new AppError('That photo could not be read.');
 if(data.length>MAX_BASE64)throw new AppError('That photo is too large. Try again — the app normally shrinks it for you.',413);
 if(!MEDIA_TYPES.includes(mediaType))throw new AppError('Use a JPEG, PNG or WebP photo.');
 return data;
}
async function readPhoto({data,mediaType,system,schema,ask,what}){
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let response;
 try{
  response=await client.messages.create({
   model:'claude-opus-5',
   max_tokens:8000,
   system,
   // A hungry family is standing at a counter, so this trades some depth for a faster answer.
   thinking:{type:'adaptive'},
   output_config:{effort:'medium',format:{type:'json_schema',schema}},
   messages:[{role:'user',content:[
    {type:'image',source:{type:'base64',media_type:mediaType,data}},
    {type:'text',text:ask}]}]
  });
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('The menu reader is busy. Wait a moment and try again.',429);
  if(e?.status===400)throw new AppError(`That photo could not be read as ${what}. Try a clearer, closer shot.`,400);
  throw new AppError('The menu reader could not be reached. Order the old-fashioned way and try again later.',502);
 }
 if(response.stop_reason==='refusal')throw new AppError('The menu reader declined to answer for this photo.',422);
 const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('');
 let parsed;try{parsed=JSON.parse(text);}catch{throw new AppError('The menu reader replied in a form the app could not use. Try again.',502);}
 return {...parsed,usage:{input:response.usage?.input_tokens??0,output:response.usage?.output_tokens??0}};
}
export async function readMenu({image,mediaType},state){
 if(!menuReaderReady())throw new AppError('The menu reader is not switched on. Add an Anthropic API key to the deployment.',503);
 const data=photo({image,mediaType});
 return readPhoto({data,mediaType,system:SYSTEM,schema:SCHEMA,what:'a menu',
  ask:`Read this menu and choose what this family would like.\n\nWhat we already know about their tastes:\n${tastes(state)}`});
}
export async function readPacket({image,mediaType},state){
 if(!menuReaderReady())throw new AppError('The menu reader is not switched on. Add an Anthropic API key to the deployment.',503);
 const data=photo({image,mediaType});
 return readPhoto({data,mediaType,system:PACKET_SYSTEM,schema:PACKET_SCHEMA,what:'a food or drink item',
  ask:`Read this packet and say what it is and whether this family would like it.\n\nWhat we already know about their tastes:\n${tastes(state)}`});
}
