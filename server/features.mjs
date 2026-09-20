import {randomUUID} from 'node:crypto';
import {BOYS,delayForDay,initialThankYou,THANK_YOU_FROM,THANK_YOU_TO} from '../src/trip-features.js';
const string=(v,max)=>typeof v==='string'&&v.length<=max;
export function extraOperation(state,op,user,fail,now){
 const parent=user.role==='parent',dayOK=day=>day===null||state.days.some(d=>d.date===day);
 const requireText=(v,max,label)=>{if(!string(v,max))fail(`Invalid ${label}.`);};
 const dayCheck=day=>{if(!dayOK(day))fail('Choose a trip day or Whole trip.');};
 if(op.type==='challengeAdd'||op.type==='challengeEdit'){
  if(!string(op.title,250)||!op.title.trim())fail('Add a challenge title.');dayCheck(op.day??null);
  if(!Array.isArray(op.participants)||!op.participants.length||op.participants.some(n=>!BOYS.includes(n)))fail('Choose Nate, Boston or both.');
  const values={title:op.title.trim(),day:op.day??null,participants:[...new Set(op.participants)],notes:op.notes||''};requireText(values.notes,2000,'notes');
  if(op.type==='challengeAdd')state.challenges.push({id:randomUUID(),...values,completions:{}});
  else{const c=state.challenges.find(c=>c.id===op.id);if(!c)fail('Challenge not found.',404);Object.assign(c,values);}
 }else if(op.type==='challengeRemove'){
  state.challenges=state.challenges.filter(c=>c.id!==op.id);
 }else if(op.type==='challengeStatus'){
  const c=state.challenges.find(c=>c.id===op.id);if(!c)fail('Challenge not found.',404);
  if(!c.participants.includes(op.person)||(!parent&&op.person!==user.name))fail('Tick only your own challenges.',403);
  if(typeof op.done!=='boolean')fail('Invalid completion.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid completion time.');at=new Date(op.at).toISOString();}
  if(op.response!==undefined){requireText(op.response,2000,'challenge notes');c.responses={...(c.responses||{}),[op.person]:op.response};}
  if(op.done)c.completions[op.person]=c.completions[op.person]||at;else delete c.completions[op.person];
 }else if(op.type==='shoppingAdd'||op.type==='shoppingEdit'){
  if(!string(op.title,250)||!op.title.trim())fail('Add an item name.');dayCheck(op.day??null);
  const item={title:op.title.trim(),day:op.day??null,person:op.person||'Family',store:op.store||'',notes:op.notes||'',url:op.url||'',quantity:op.quantity??1,budget:op.budget??null};
  if(!['Family',...state.members].includes(item.person))fail('Choose a family member.');
  for(const key of ['store','notes','url'])requireText(item[key],key==='notes'?2000:2000,key);
  if(item.url){try{if(new URL(item.url).protocol!=='https:')fail('Use an HTTPS shopping link.');}catch{fail('Use an HTTPS shopping link.');}}
  if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>999)fail('Quantity must be 1–999.');
  if(item.budget!==null&&(!Number.isFinite(item.budget)||item.budget<0||item.budget>10000000))fail('Enter a valid yen budget.');
  if(op.type==='shoppingAdd')state.shopping.push({id:randomUUID(),...item,createdBy:user.name,createdAt:now,boughtAt:null});
  else{const found=state.shopping.find(s=>s.id===op.id);if(!found)fail('Shopping item not found.',404);Object.assign(found,item);}
 }else if(op.type==='shoppingStatus'){
  const item=state.shopping.find(s=>s.id===op.id);if(!item)fail('Shopping item not found.',404);if(typeof op.done!=='boolean')fail('Invalid shopping status.');
  item.boughtAt=op.done?now:null;item.boughtBy=op.done?user.name:null;
 }else if(op.type==='shoppingRemove'){
  state.shopping=state.shopping.filter(s=>s.id!==op.id);
 }else if(op.type==='meeting'){
  dayCheck(op.day);if(!op.day)fail('Choose a day.');
  const m={place:op.place||'',japanese:op.japanese||'',time:op.time||'',notes:op.notes||'',hotelJapanese:op.hotelJapanese||'',hotelAddress:op.hotelAddress||''};
  for(const [k,v]of Object.entries(m))requireText(v,k==='notes'?2000:500,k);
  if(!m.place.trim())fail('Choose a meeting point.');if(m.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time))fail('Choose a valid meeting time.');
  state.meetings[op.day]=m;
  if(op.contacts){for(const n of ['Damien','Lauren']){requireText(op.contacts[n],80,'phone number');if(op.contacts[n]&&!/^\+?[\d\s()\-]+$/.test(op.contacts[n]))fail('Use a phone number including country code.');}state.contacts={Damien:op.contacts.Damien,Lauren:op.contacts.Lauren};}
 }else if(op.type==='acknowledge'){
  const alert=state.alerts.find(a=>a.id===op.id);if(!alert)fail('Update not found.',404);alert.seenBy={...(alert.seenBy||{}),[user.name]:now};
 }else if(op.type==='journal'){
  dayCheck(op.day);if(!op.day)fail('Choose a day.');requireText(op.notes,8000,'diary notes');state.journal[op.day]=op.notes;
 }else if(typeof op.type==='string'&&op.type.startsWith('thankYou')){
  // Private notes from Damien to Lauren. Only Damien writes them; only Lauren marks one read.
  if(!Array.isArray(state.thankYou?.messages))state.thankYou={seen:{},...state.thankYou,messages:initialThankYou()};
  const notes=state.thankYou.messages;
  if(op.type==='thankYouSeen'){
   if(user.name!==THANK_YOU_TO)fail('These notes are for Lauren.',403);
   if(!op.day||!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
   state.thankYou.seen={...state.thankYou.seen,[op.day]:now};
  }else{
   if(user.name!==THANK_YOU_FROM)fail('Only Damien can change these notes.',403);
   if(op.type==='thankYouAdd'||op.type==='thankYouEdit'){
    const value=(op.text||'').trim(),day=op.day??null;
    if(!string(value,1200)||!value)fail('Write a note of 1–1200 characters.');
    if(day!==null){
     if(!state.days.some(d=>d.date===day))fail('Choose a trip day.');
     if(notes.some(m=>m.day===day&&m.id!==op.id))fail('That day already has a note pinned to it. Free the other note first.');
    }
    if(op.type==='thankYouAdd')notes.push({id:randomUUID(),text:value,day,order:Math.max(0,...notes.map(m=>m.order))+10});
    else{const note=notes.find(m=>m.id===op.id);if(!note)fail('Note not found.',404);Object.assign(note,{text:value,day});}
   }else if(op.type==='thankYouRemove'){
    if(!notes.some(m=>m.id===op.id))fail('Note not found.',404);
    state.thankYou.messages=notes.filter(m=>m.id!==op.id);
   }else if(op.type==='thankYouReorder'){
    if(!Array.isArray(op.ids)||op.ids.length!==notes.length||new Set(op.ids).size!==notes.length||op.ids.some(id=>!notes.some(m=>m.id===id)))fail('The notes changed. Reload before reordering them.');
    const slots=notes.map(m=>m.order).sort((a,b)=>a-b);op.ids.forEach((id,i)=>{notes.find(m=>m.id===id).order=slots[i];});
   }else fail('Unknown note action.');
  }
  return {summary:null,important:false,private:true};
 }else if(op.type==='runningLate'){
  dayCheck(op.day);if(!op.day||!Number.isInteger(op.delay)||op.delay<1||op.delay>240)fail('Enter a delay of 1–240 minutes.');
  const plan=delayForDay(state,op.day,op.delay);
  for(const c of plan.changes)state.steps.find(s=>s.id===c.id).time=c.time;
  for(const item of plan.backlog){const s=state.steps.find(s=>s.id===item.id);s.backlogFrom={day:s.day,time:s.time,bookingTime:s.bookingTime,status:s.status};Object.assign(s,{day:null,time:null,bookingTime:null,group:'',option:'',status:'todo'});}
  return {summary:`Revised ${op.day} for a ${op.delay}-minute delay. ${plan.backlog.length} activities saved to Options.`,important:true};
 }else return false;
 return {summary:op.type==='meeting'?`Meeting point updated for ${op.day}: ${op.place}${op.time?' at '+op.time:''}`:null,important:op.type==='meeting'};
}
