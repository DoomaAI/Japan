import {randomUUID} from 'node:crypto';
import {findRide} from '../src/park-data.js';
import {FOOD,FOOD_KINDS} from '../src/food-data.js';
import {BOYS,delayForDay,initialThankYou,generatedMissions,nextExtraMission,GENERATED_PER_DAY,EYE_SPY,isTrainLeg,eyeSpyKey,THANK_YOU_FROM,THANK_YOU_TO} from '../src/trip-features.js';
const string=(v,max)=>typeof v==='string'&&v.length<=max;
export function extraOperation(state,op,user,fail,now){
 const parent=user.role==='parent',dayOK=day=>day===null||state.days.some(d=>d.date===day);
 const requireText=(v,max,label)=>{if(!string(v,max))fail(`Invalid ${label}.`);};
 const dayCheck=day=>{if(!dayOK(day))fail('Choose a trip day or Whole trip.');};
 if(op.type==='challengeAdd'||op.type==='challengeEdit'){
  if(!string(op.title,250)||!op.title.trim())fail('Add a challenge title.');dayCheck(op.day??null);
  if(!Array.isArray(op.participants)||!op.participants.length||op.participants.some(n=>!BOYS.includes(n)))fail('Choose Nate, Boston or both.');
  const values={title:op.title.trim(),day:op.day??null,participants:[...new Set(op.participants)],notes:op.notes||'',icon:(op.icon||'').trim()};requireText(values.notes,2000,'notes');
  if([...values.icon].length>2)fail('Use one or two emoji for the picture.');
  if(op.type==='challengeAdd')state.challenges.push({id:randomUUID(),...values,diagram:'',completions:{},responses:{},skips:{}});
  else{const c=state.challenges.find(c=>c.id===op.id);if(!c)fail('Challenge not found.',404);Object.assign(c,values);}
 }else if(op.type==='challengeSkip'){
  const c=state.challenges.find(c=>c.id===op.id);if(!c)fail('Challenge not found.',404);
  if(!c.participants.includes(op.person)||(!parent&&op.person!==user.name))fail('Skip only your own missions.',403);
  if(typeof op.done!=='boolean')fail('Invalid skip.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid skip time.');at=new Date(op.at).toISOString();}
  c.skips={...(c.skips||{})};
  if(op.done){c.skips[op.person]=c.skips[op.person]||at;delete c.completions[op.person];}else delete c.skips[op.person];
 }else if(op.type==='challengeNew'){
  // Draws the next reserve mission rather than inventing one, so it works offline-first and
  // the boys can swap a mission themselves without a parent writing one.
  if(!BOYS.includes(op.person)||(!parent&&op.person!==user.name))fail('Choose your own missions.',403);
  if(!op.day||!state.days.some(d=>d.date===op.day))fail('Choose a trip day.');
  if(generatedMissions(state,op.day,op.person).length>=GENERATED_PER_DAY)fail(`That is ${GENERATED_PER_DAY} new missions for this day already. Try finishing one first.`);
  const next=nextExtraMission(state,op.day,op.person);if(!next)fail('No more missions are available.',404);
  const [title,notes,icon='']=next;
  state.challenges.push({id:randomUUID(),title,notes,icon,diagram:'',day:op.day,participants:[op.person],completions:{},responses:{},skips:{},generated:true,createdBy:user.name,createdAt:now});
 }else if(typeof op.type==='string'&&op.type.startsWith('food')){
  const custom=()=>state.foodItems.find(i=>i.id===op.id);
  const known=id=>FOOD.some(i=>i.id===id)||state.foodItems.some(i=>i.id===id);
  if(op.type==='foodTried'||op.type==='foodRating'){
   if(!known(op.itemId))fail('Unknown food.',404);
   if(!state.members.includes(op.person))fail('Choose a family member.');
   if(!parent&&op.person!==user.name)fail('Tick and rate only for yourself.',403);
   const entry=state.food[op.itemId]||{};
   if(op.type==='foodTried'){
    if(typeof op.done!=='boolean')fail('Invalid food tick.');
    let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid tasting time.');at=new Date(op.at).toISOString();}
    const tried={...(entry.tried||{})};
    if(op.done)tried[op.person]=tried[op.person]||at;else delete tried[op.person];
    state.food={...state.food,[op.itemId]:{...entry,tried}};
   }else{
    if(op.rating!==0&&!(Number.isInteger(op.rating)&&op.rating>=1&&op.rating<=5))fail('Rate it from 1 to 5 stars.');
    const ratings={...(entry.ratings||{})},tried={...(entry.tried||{})};
    if(op.rating){ratings[op.person]=op.rating;tried[op.person]=tried[op.person]||now;}else delete ratings[op.person];
    state.food={...state.food,[op.itemId]:{...entry,ratings,tried}};
   }
  }else if(op.type==='foodAdd'||op.type==='foodEdit'){
   if(!parent)fail('A parent can change the food list.',403);
   const values={en:(op.en||'').trim(),ja:(op.ja||'').trim(),romaji:(op.romaji||'').trim(),kind:op.kind||'meal',note:op.note||''};
   if(!values.en)fail('Add the English name.');
   for(const [k,v] of Object.entries(values))requireText(v,k==='note'?2000:200,k);
   if(!FOOD_KINDS.some(([k])=>k===values.kind))fail('Choose a food group.');
   if(op.type==='foodAdd')state.foodItems.push({id:randomUUID(),...values,addedBy:user.name,createdAt:now});
   else{const item=custom();if(!item)fail('That is one of the built-in dishes. Add your own version instead.',404);Object.assign(item,values);}
  }else if(op.type==='foodRemove'){
   if(!parent)fail('A parent can change the food list.',403);
   if(!custom())fail('That is one of the built-in dishes and cannot be removed.',404);
   state.foodItems=state.foodItems.filter(i=>i.id!==op.id);
  }else fail('Unknown food action.');
 }else if(op.type==='exchangeRate'){
  if(!parent)fail('A parent can set the rate.',403);
  if(!Number.isFinite(op.perAud)||op.perAud<1||op.perAud>1000)fail('Enter how many yen one Australian dollar buys.');
  state.rates={perAud:Math.round(op.perAud*100)/100,at:now,by:user.name,source:op.source==='live'?'live':'manual'};
 }else if(op.type==='parkRide'){
  const ride=findRide(op.rideId);if(!ride)fail('Unknown ride.',404);
  if(!state.members.includes(op.person))fail('Choose a family member.');
  if(!parent&&op.person!==user.name)fail('Tick only your own rides.',403);
  if(typeof op.done!=='boolean')fail('Invalid ride tick.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid ride time.');at=new Date(op.at).toISOString();}
  const entry=state.parkRides[op.rideId]||{},ridden={...(entry.ridden||{})};
  if(op.done)ridden[op.person]=ridden[op.person]||at;else delete ridden[op.person];
  state.parkRides={...state.parkRides,[op.rideId]:{...entry,ridden}};
 }else if(op.type==='parkMust'){
  const ride=findRide(op.rideId);if(!ride)fail('Unknown ride.',404);
  if(typeof op.must!=='boolean')fail('Invalid must-do.');
  const entry=state.parkRides[op.rideId]||{};
  state.parkRides={...state.parkRides,[op.rideId]:{...entry,must:op.must}};
 }else if(op.type==='familyHeights'){
  const next={};
  for(const name of BOYS){
   const value=op.heights?.[name];
   if(value===null||value===undefined||value==='')continue;
   if(!Number.isInteger(value)||value<50||value>220)fail('Enter a height between 50cm and 220cm.');
   next[name]=value;
  }
  state.heights=next;
 }else if(op.type==='eyeSpy'){
  const leg=state.steps.find(s=>s.id===op.stepId);
  if(!leg||!isTrainLeg(leg))fail('That is not a train leg.',404);
  if(!EYE_SPY.some(i=>i.id===op.item))fail('Unknown thing to spot.',404);
  if(!BOYS.includes(op.person)||(!parent&&op.person!==user.name))fail('Tick only your own list.',403);
  if(typeof op.done!=='boolean')fail('Invalid spot.');
  let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid spot time.');at=new Date(op.at).toISOString();}
  const key=eyeSpyKey(op.stepId,op.item),found={...(state.eyeSpy[key]||{})};
  if(op.done)found[op.person]=found[op.person]||at;else delete found[op.person];
  state.eyeSpy={...state.eyeSpy,[key]:found};
  if(!Object.keys(found).length)delete state.eyeSpy[key];
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
