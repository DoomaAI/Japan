import {randomUUID} from 'node:crypto';
import {AppError,applyOperation} from './model.mjs';
import {readTrip,updateTrip,hash,token} from './store.mjs';
import {visibleTrip} from './visibility.mjs';
import {askTrip,MAX_QUESTION} from './ask.mjs';
import {roleOf} from '../src/people.js';
import {quickAnswer,quickSpoken} from '../src/concierge-quick.js';
import {spokenAnswer} from '../src/ask-voice.js';
import {draftPreview} from '../src/day-check.js';
import {askItem} from '../src/ask-thread.js';
import {clamp} from '../src/text.js';
// "Hey Siri, Concierge." Siri runs a Shortcut by name, from AirPods with the phone in a pocket,
// and a Shortcut can dictate a question, fetch an address and speak what comes back. That
// address is this one: a key of each person's own in it, the question on the end, and the answer
// back as plain words to be read out. It has no cookie to show, so like the calendar it is let in
// on its key alone; unlike the calendar the key is a person's, so the answer is theirs (a boy's
// in words he can follow) and a parent's question joins the shared thread. The trip keeps only a
// hash of each key; the key itself is shown once, to the person who made it.
const KEY=/^[a-f0-9]{64}$/;
// A new key for this person, replacing theirs: making one again is how a lost link is withdrawn.
export async function makeConciergeLink(user,origin,{stop=false}={}){
 if(!user?.name)throw new AppError('Sign in as a person in the trip first.',403);
 const key=stop?null:token(),now=new Date().toISOString();
 await updateTrip(state=>{
  if(!state.members?.includes(user.name))throw new AppError('Only somebody in the trip can have a Concierge link.',403);
  const others=(state.conciergeKeys||[]).filter(k=>k.name!==user.name);
  return {...state,conciergeKeys:stop?others:[...others,{id:randomUUID(),name:user.name,hash:hash(key),createdAt:now}]};
 });
 return {url:key?`${origin}/api/concierge?key=${key}&q=`:null};
}
// Whose key it is, checked against the trip as it is now: somebody taken off the trip, or a key
// made again, and the old address answers nothing.
export function conciergeUser(state,key){
 if(!KEY.test(String(key||'')))return null;
 const h=hash(key),found=(state.conciergeKeys||[]).find(k=>k.hash===h);
 if(!found||!state.members?.includes(found.name))return null;
 const role=roleOf(state,found.name);
 return role?{id:`concierge:${found.id}`,name:found.name,role}:null;
}
// The answer as words to be heard. Siri reads whatever comes back, so an error is said too.
export async function conciergeAnswer(key,question,now=new Date()){
 const {state:full}=await readTrip();
 const user=conciergeUser(full,key);
 if(!user)throw new AppError('This Concierge link is not valid any more. Make a new one in the app, under Settings.',403);
 const asked=clamp(question,MAX_QUESTION);
 if(!asked)return {speak:'Ask me about the trip: what’s next, how long until dinner, or how to get to the temple.'};
 const state=visibleTrip(full,user,now);
 const quick=quickAnswer(state,asked,{person:user.name,now});
 if(quick)return {speak:quickSpoken(quick),answer:quick};
 const answer=await askTrip({question:asked,spoken:true},state,user,now);
 const item={id:`${Date.now()}`,at:now.toISOString(),...answer,spoken:true};
 // A parent's question goes into the shared thread, with any change it drafted, so it is on
 // the Concierge page for them or the other parent to read and apply. A boy's is said and gone.
 if(user.role==='parent')await updateTrip(s=>applyOperation(s,{type:'askKeep',item:askItem(item,user.name)},user)).catch(()=>{});
 const preview=item.draft?draftPreview(state,item.draft):null;
 let speak=spokenAnswer(item,{offer:false,preview});
 if(item.draft&&preview?.rows?.length&&!preview.conflicts?.length&&!preview.stale)
  speak=speak.replace('A parent can apply it on the screen.','It is waiting on the Concierge page in the app for a parent to apply.');
 return {speak,answer:item};
}
