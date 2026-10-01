import {AppError} from './model.mjs';
import {researchReady} from './research.mjs';
import {LOCAL_EXPERIENCES,LOCAL_KIND_LABEL,localDays,cleanLocalCheck} from '../src/local-data.js';
import {clamp} from '../src/text.js';
// Checking one Like a local card against the web: is it open on the days we could go, what does
// it cost now, has anything changed since the card was written. The card's own figures were
// written in September 2026 from memory of the place, so a parent presses Check the details
// and the answer — with the pages it came from — is saved to the trip for every phone, signal
// or not. Nothing is written here: the route hands the findings back and the phone saves them
// through an ordinary mutation, the same way a looked-up card fee is.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:5,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const RECORD={
 name:'record_check',
 description:'Record what you found about this place, once, after searching. Call this exactly once, at the end.',
 strict:true,
 input_schema:{
  type:'object',additionalProperties:false,
  required:['found','open','closed','price','changed','differences','summary','checkFirst','sources'],
  properties:{
   found:{type:'boolean',description:'False if you could not find the place or the kind of place at all.'},
   open:{type:'string',description:'Opening hours or days as they stand now, in one line. For a kind of place rather than one place (a chain, a supermarket), the usual hours. Empty if not found.'},
   closed:{type:'string',description:'Any closure, holiday, renovation or cancellation that falls on the family’s dates, in one line. Empty if you found none.'},
   price:{type:'string',description:'The current price, in yen, in one line, with children’s prices where they exist. Empty if not found.'},
   changed:{type:'boolean',description:'True if anything you found contradicts what the card says: a different price, different hours, a closure, a place that has shut or moved.'},
   differences:{type:'string',description:'What differs from the card, plainly, in one or two sentences. Empty if nothing does.'},
   summary:{type:'string',description:'Two or three plain sentences a parent can read on the day: whether it is on, when to go, what it costs, anything to know. Present tense, no preamble.'},
   checkFirst:{type:'string',description:'What they should still confirm themselves and where, or empty if the official page answered everything.'},
   sources:{type:'array',description:'The pages you used, the official page first.',items:{
    type:'object',additionalProperties:false,required:['title','url'],properties:{title:{type:'string'},url:{type:'string'}}}}}}
};
const SYSTEM=`You check one entry in a family's own guide to Japan — a bathhouse, a shopping street, a museum, a tram line, a kind of restaurant — against the web, for an Australian family with a five- and an eight-year-old on the dates given.

How to work:
- Search before you answer. Prefer the place's own site, the operator's or the city's official page; Japanese pages are fine, and often the only current ones. Travel blogs are a fallback; say so in the source title if you rely on one.
- Answer for the family's dates: opening days and hours that apply then, a regular closing day that falls on them, a renovation, a festival that changes things, an event that cancels a market.
- Prices in yen as published now, with children's prices where they exist. Never guess a figure: if you cannot find it, leave price empty and say so in checkFirst.
- Compare what you find with what the card says and set changed to true only for a real difference, not for wording. A card that says "about ¥550" and a page that says ¥550 agree.
- For a kind of place rather than one place (a chain, a supermarket, a station soba counter), check the chain's current prices or the usual hours and say that it varies by branch.
- If you cannot find the place, set found to false and explain in checkFirst.

Search first, then call record_check exactly once. Everything goes in that call, not in a message.`;
const fmt=d=>new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',timeZone:'UTC'});
// Nothing the model returns is trusted: every line is cut to length, the sources kept only if
// they are https, and the shape is exactly what the trip stores.
export function normaliseLocalCheck(found){
 const {value}=cleanLocalCheck(found);
 return value;
}
export async function checkLocal({id,today},state){
 if(!researchReady())throw new AppError('Checking the details is not switched on. Add an Anthropic API key to the deployment.',503);
 const item=LOCAL_EXPERIENCES.find(e=>e.id===id);
 if(!item)throw new AppError('That card is not one of ours.',404);
 const from=typeof today==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(today)?today:'';
 const days=localDays(state,item,from);
 const dates=(days.length?days:localDays(state,item)).map(fmt);
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 const card=[`Title: ${item.title} (${item.ja})`,`Kind: ${LOCAL_KIND_LABEL(item.kind)}`,`Where: ${item.where}`,`What the card says: ${item.why}`,`How: ${item.how}`,`Cost on the card: ${item.cost}`,item.when?`When on the card: ${item.when}`:'',
  `Dates the family could go: ${dates.join('; ')||'no dates left in '+item.area}`,`Base: ${item.area}`].filter(Boolean).join('\n');
 let message,messages=[{role:'user',content:`Check this card against the web.\n\n${card}`}];
 try{
  for(let attempt=0;attempt<4;attempt++){
   message=await client.messages.create({model:'claude-opus-5-5',max_tokens:6000,system:SYSTEM,thinking:{type:'adaptive'},output_config:{effort:'medium'},tools:[SEARCH,RECORD],messages});
   if(message.stop_reason!=='pause_turn')break;
   messages=[...messages,{role:'assistant',content:message.content}];
  }
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Lookups are busy. Wait a moment and try again.',429);
  throw new AppError('The check could not be reached. Try again when the signal is better.',502);
 }
 if(message.stop_reason==='refusal')throw new AppError('The check declined that one.',422);
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_check');
 const found=call?.input&&typeof call.input==='object'?call.input:null;
 if(!found)throw new AppError('The check came back with nothing. Try again in a moment.',502);
 if(!found.found)throw new AppError(clamp(found.checkFirst,300)||'That place could not be found on the web just now.',404);
 return normaliseLocalCheck(found);
}
