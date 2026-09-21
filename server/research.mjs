import {AppError,MEMBERS} from './model.mjs';
import {PROPOSAL_KINDS,PROPOSAL_TIMING,proposalDraft} from '../src/trip-features.js';
export const researchReady=()=>!!process.env.ANTHROPIC_API_KEY;
// Eight searches is enough to reach an official site, its hours page and its ticket page, and
// bounds what one lookup can cost. Asked from Japan, so a search for "the aquarium in Osaka"
// returns the Japanese pages rather than the English travel-blog ones.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:8,user_location:{type:'approximate',country:'JP',timezone:'Asia/Tokyo'}};
const RECORD={
 name:'record_findings',
 description:'Record everything found about this place, once, after searching. Call this exactly once, at the end.',
 strict:true,
 input_schema:{
  type:'object',additionalProperties:false,
  required:['found','title','place','address','japanese','availability','cost','costNote','duration','category','timing','website','ticketUrl','mapUrl','suitableFor','tags','notes','bestDay','checkFirst','sources'],
  properties:{
   found:{type:'boolean',description:'False if you could not work out which place they mean. Everything else is then empty.'},
   title:{type:'string',description:'The place as the family would name it, in English.'},
   place:{type:'string',description:'The name, then the district and city. Empty if not found.'},
   address:{type:'string',description:'The full street address in English. Empty if not found.'},
   japanese:{type:'string',description:'The name in Japanese, and the address in Japanese if you have it. This is what they will show a taxi driver.'},
   availability:{type:'string',description:'One line a person reads on the day: opening hours, closed days and last entry, in 24-hour times. Empty if not found.'},
   cost:{anyOf:[{type:'integer'},{type:'null'}],description:'Yen for one adult. 0 if free. Null if you could not find a price — never a guess.'},
   costNote:{type:'string',description:'Who that price covers and what a child pays.'},
   duration:{type:'integer',description:'Minutes a visit usually takes.'},
   category:{type:'string',enum:PROPOSAL_KINDS.map(([id])=>id)},
   timing:{type:'string',enum:PROPOSAL_TIMING.map(([id])=>id),description:'fixed if it must be booked for a time, window if only inside opening hours, flex if any time will do.'},
   website:{type:'string',description:'The official site. Empty rather than invented.'},
   ticketUrl:{type:'string',description:'Where tickets are actually bought or booked — the official ticket page, not the homepage. Empty if there is none.'},
   mapUrl:{type:'string',description:'A Google Maps link only if you found a real one. Otherwise empty.'},
   suitableFor:{type:'array',items:{type:'string',enum:MEMBERS},description:'Who it genuinely suits. Empty means all four.'},
   tags:{type:'array',items:{type:'string'},description:'A few short tags, such as the city, book ahead, rainy day, indoors.'},
   notes:{type:'string',description:'A few sentences: why it is worth doing, what to book ahead, and anything practical with a five-year-old.'},
   bestDay:{type:'string',description:'One of the trip dates given, chosen for the city they are in and whether it is open. Empty if nothing fits.'},
   checkFirst:{type:'string',description:'What they must confirm themselves before relying on this, and where. Never empty.'},
   sources:{type:'array',description:'The pages you actually used, best first.',items:{
    type:'object',additionalProperties:false,required:['title','url'],
    properties:{title:{type:'string'},url:{type:'string'}}}}}}
};
const SYSTEM=`You research one place, restaurant or event in Japan for one Australian family, so a half-empty entry on their planning board comes back filled in.

The family: Damien and Lauren, with their sons Boston (8) and Nate (5). They are in Japan from 21 September to 6 October 2026, and speak no Japanese.

How to work:
- Search before you answer. Prefer the place's own official site, then the official tourism body, then the ticket seller. A blog is a last resort, and say so in the source title if you lean on one.
- Hours, closed days, last entry and prices change, and a search result can be years old. Take them from the official site where you can. Whatever you are least sure of is what goes in checkFirst.
- availability is the one line a person reads standing outside: opening hours, the day it closes, last entry. 24-hour times.
- cost is yen for one adult, as a number, 0 if free. Who it covers and what a child pays goes in costNote. If you cannot find a price, leave it null. A guessed price is worse than none.
- website is the official site; ticketUrl is the page where tickets are actually bought. Leave either empty rather than inventing a URL, and never link a reseller you have not seen.
- japanese matters more than it looks: it is what they hold up to a taxi driver when nobody speaks English.
- bestDay is chosen from the trip dates given — the city they are in that day, and whether the place is open on it.
- suitableFor is honest, not polite. Nate is five: long queues, late nights, heights and anything frightening are not for him. Leave it empty when it suits all four.
- If you cannot work out which place they mean, set found to false and say so in checkFirst. Do not research a different place instead.

You are gathering what is published. You are not booking anything and you are not promising anything. Never state that a price is current, a ticket is available or a place is open on a given date as a settled fact — that is what checkFirst is for.

Search first, then call record_findings exactly once. Everything you report goes in that call, not in a message.`;
const https=v=>{try{return new URL(v).protocol==='https:'?new URL(v):null;}catch{return null;}};
// The same hosts the app already treats as a real map link, checked here so a made-up short
// link never reaches a phone. Anything else is dropped and a plain Maps search is built instead.
const mapLink=v=>{const u=https(v);return u&&(['maps.app.goo.gl','maps.google.com','goo.gl'].includes(u.hostname)||(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps')))?u.href:'';};
const mapSearch=q=>q?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`:'';
const clamp=(v,max)=>String(v??'').trim().slice(0,max);
// Nothing a model returns is trusted. Every field is cut to the length the planning board
// already enforces, every link has to be HTTPS, and anything out of range is dropped rather
// than corrected into something that looks researched but is not.
export function normaliseFindings(found,state){
 const members=state.members||MEMBERS;
 const name=clamp(found.title,250),address=clamp(found.address,250);
 const place=clamp(found.place||name,250);
 const cost=Number.isInteger(found.cost)&&found.cost>=0&&found.cost<=10000000?found.cost:null;
 // A suggested day is only a wish on the board, never a booking, so it is filled in like any
 // other blank — and handed back separately so the screen can say where it came from.
 const bestDay=state.days.some(d=>d.date===found.bestDay)?found.bestDay:null;
 const duration=Number.isInteger(found.duration)&&found.duration>0&&found.duration<=1440?found.duration:60;
 const draft=proposalDraft({
  title:name,place:address&&!place.includes(address)?clamp(`${place} · ${address}`,250):place,
  japanese:clamp(found.japanese,250),availability:clamp(found.availability,250),
  cost,costNote:clamp(found.costNote,250),notes:clamp(found.notes,4000),
  category:PROPOSAL_KINDS.some(([id])=>id===found.category)?found.category:'place',
  timing:PROPOSAL_TIMING.some(([id])=>id===found.timing)?found.timing:'flex',
  website:https(found.website)?.href||'',ticketUrl:https(found.ticketUrl)?.href||'',
  mapUrl:mapLink(found.mapUrl)||mapSearch([name,address].filter(Boolean).join(' ')),
  suitableFor:(Array.isArray(found.suitableFor)?found.suitableFor:[]).filter(n=>members.includes(n)),
  tags:(Array.isArray(found.tags)?found.tags:[]).map(t=>clamp(t,50)).filter(Boolean).slice(0,20),
  day:bestDay,duration
 });
 // Everyone means nobody in particular, so four out of four is the same as leaving it open.
 if(draft.suitableFor.length===members.length)draft.suitableFor=[];
 // A lookup fills in fields. Where the idea came from is not one of them.
 delete draft.source;
 return {draft,bestDay,
  checkFirst:clamp(found.checkFirst,1000),
  sources:(Array.isArray(found.sources)?found.sources:[]).map(s=>({title:clamp(s?.title,200),url:https(s?.url)?.href||''})).filter(s=>s.url).slice(0,8)};
}
function findings(message){
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_findings');
 return call&&call.input&&typeof call.input==='object'?call.input:null;
}
export async function researchPlace({title,place,notes},state){
 if(!researchReady())throw new AppError('Looking things up is not switched on. Add an Anthropic API key to the deployment.',503);
 if(typeof title!=='string'||!title.trim())throw new AppError('Type what you want looked up first.');
 if(title.length>250||(place&&String(place).length>250)||(notes&&String(notes).length>2000))throw new AppError('Keep the name and note short.');
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 const days=state.days.map(d=>`${d.date} · ${d.city} · ${d.title}`).join('\n');
 const ask=`Look this up for them.

What they typed: ${title.trim()}
${place?`Where they think it is: ${String(place).trim()}\n`:''}${notes?`Their note: ${String(notes).trim()}\n`:''}
Their trip, day by day:
${days}`;
 let message,messages=[{role:'user',content:ask}];
 try{
  // The server-side search loop can stop for breath after ten turns. Resuming is sending the
  // conversation back unchanged — a "carry on" message of our own would confuse it.
  for(let attempt=0;attempt<4;attempt++){
   message=await client.messages.create({
    model:'claude-opus-5',
    max_tokens:8000,
    system:SYSTEM,
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
  if(e?.status===429)throw new AppError('Lookups are busy. Wait a moment and try again.',429);
  if(e?.status===400)throw new AppError(`The lookup was refused: ${clamp(e?.error?.error?.message||e?.message,200)}`,502);
  throw new AppError('The lookup could not be reached. Fill the details in yourself, or try again when the signal is better.',502);
 }
 if(message.stop_reason==='refusal')throw new AppError('The lookup declined that one. Try naming the place plainly.',422);
 const found=findings(message);
 if(!found)throw new AppError(message.stop_reason==='max_tokens'?'The lookup ran long and did not finish. Try a more specific name.':'The lookup came back with nothing to fill in. Try naming the place and its city.',502);
 if(!found.found)throw new AppError(clamp(found.checkFirst,300)||'That place could not be found. Try its full name and the city it is in.',404);
 return {...normaliseFindings(found,state),usage:{input:message.usage?.input_tokens??0,output:message.usage?.output_tokens??0,searches:message.usage?.server_tool_use?.web_search_requests??0}};
}
