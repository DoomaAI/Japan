import {ensureFeatures,inboxNotes,documentSteps,documentServesStep,documentSpent,validPin} from '../src/trip-features.js';
import {extraOperation} from './features.mjs';
import {cleanCode,answerCodes,setOwner,recordSend} from '../src/wallet-codes.js';
import {expressOperation} from './express.mjs';
import {dpaOperation} from './dpa.mjs';
import { randomUUID } from 'node:crypto';
import {activeSteps,MAX_WINDOW} from '../src/timing.js';
import {legCount,tickLeg,routeFor,rekeyLegs,ROUTES,MAX_WAYPOINTS,WAYPOINT_KINDS,addedMinutes,SWAP_MODES,swappable,routeMinutes} from '../src/route-data.js';
import {ENTRY_TYPE_IDS} from '../src/entry-types.js';
import {guessPlatform} from '../src/booked-via.js';
import {BIN_KINDS,binEntries,binTitle} from '../src/bin-data.js';
import {orderDays,moveSteps} from '../src/day-moves.js';
// The family, kept only as the fallback the AI modules name when a state has no members list.
// Every membership check reads state.members and the records in src/people.js.
export const MEMBERS = ['Damien','Lauren','Nate','Boston'];
// Where a forwarded email can be filed. A ticket is the default; the rest put it where the
// family would have put it themselves had they typed it in.
export const INBOX_DESTINATIONS=['ticket','activity','options','idea','todo'];
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const text = (v,max=1000) => typeof v === 'string' && v.length <= max;
const shortDate=d=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
const clock = v => v === null || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
// Whether the Claude API is switched on for this deployment. Every feature that asks the model
// reports this as its own ready flag, so the app can say which ones are on.
export const modelReady=()=>!!process.env.ANTHROPIC_API_KEY;
export function safeLink(v){try{const u=new URL(v);return u.protocol==='https:';}catch{return false;}}
export function documentDetails(p){
 const category=p.category||'ticket',reference=p.reference||'',notes=p.notes||'',tags=p.tags||[];
 if(!['ticket','reservation','luggage','other','memory'].includes(category)||!text(reference,250)||!text(notes,4000))throw new AppError('Invalid document details.');
 if(!Array.isArray(tags)||tags.length>20||tags.some(t=>!text(t,50)||!t.trim()))throw new AppError('Use up to 20 tags, each under 50 characters.');
 return {category,reference,notes,tags:[...new Set(tags.map(t=>t.trim()))]};
}
// Where a document belongs: against one or more activities, or against a whole day, never both.
// `stepIds` is the whole allocation and `stepId` is the first of them, kept because every
// ticket saved before a booking could cover more than one activity has only that.
export const MAX_DOCUMENT_STEPS=20;
export function documentAssociation(p,state){
 const listed=p.stepIds!==undefined?p.stepIds:(p.stepId?[p.stepId]:[]);
 if(!Array.isArray(listed))throw new AppError('Choose the activities this booking covers.');
 const stepIds=[...new Set(listed.filter(id=>id!==null&&id!==undefined&&id!==''))];
 if(stepIds.length>MAX_DOCUMENT_STEPS)throw new AppError(`Allocate a booking to at most ${MAX_DOCUMENT_STEPS} activities.`);
 if(stepIds.some(id=>typeof id!=='string'||!state.steps.some(s=>s.id===id)))throw new AppError('Activity not found.');
 const day=p.day||null;
 if(day&&!state.days.some(d=>d.date===day))throw new AppError('Choose a trip day.');
 if(stepIds.length&&day)throw new AppError('Attach to an activity or a day, not both.');
 return {stepId:stepIds[0]||null,stepIds,day};
}
export function ticketParent(id,state){
 if(!id)return null;
 const doc=state.documents.find(d=>d.id===id);
 if(!doc||doc.parentDocumentId||doc.category==='memory')throw new AppError('Choose an existing ticket or reservation.');
 return doc;
}
export function validatePatch(p,state){
 const allowed=['title','notes','place','japanese','time','duration','kind','day','page','group','option','participants','order','review','bookingTime','bookingReference','locked','website','bookedVia','bookedViaUrl','travelMinutes','arrivalBuffer','locationId','phone','pin','category','windowMinutes'];
 if(!p || typeof p!=='object' || Array.isArray(p))throw new AppError('Invalid change.');
 for(const [k,v] of Object.entries(p)){
  if(!allowed.includes(k))throw new AppError('Unsupported field.');
  if(['title','notes','place','japanese','group','option','bookingReference','bookedVia'].includes(k)&&!text(v,k==='notes'?4000:k==='bookedVia'?80:250))throw new AppError('Text is too long.');
  if(k==='title'&&!v.trim())throw new AppError('Add an activity name.');
  if(['time','bookingTime'].includes(k)&&!clock(v))throw new AppError('Use a valid time.');
  if(k==='locked'&&typeof v!=='boolean')throw new AppError('Invalid lock.');
  if(k==='day'&&v!==null&&!state.days.some(d=>d.date===v))throw new AppError('Choose a trip day.');
  if(k==='locationId'&&v!==null&&!(state.locations||[]).some(l=>l.id===v))throw new AppError('Choose a location from the map list.');
  // A pinned position is dropped by a phone that was standing there, so it is stored as it was
  // read or not at all: a stray field or half a pair is a bug, not a place.
  if(k==='pin'&&!validPin(v))throw new AppError('A pinned position needs a latitude and a longitude.');
  if(k==='website'&&(v!==''&&(!text(v,2000)||!safeLink(v))))throw new AppError('Use an HTTPS website link.');
  if(k==='bookedViaUrl'&&(v!==''&&(!text(v,2000)||!safeLink(v))))throw new AppError('Use an HTTPS link to the booking.');
  if(k==='phone'&&(!text(v,40)||(v!==''&&!/^\+?[\d\s().-]{5,}$/.test(v))))throw new AppError('Use a phone number, ideally with its country code.');
  if(['travelMinutes','arrivalBuffer'].includes(k)&&(!Number.isInteger(v)||v<0||v>360))throw new AppError('Travel and arrival buffers must be 0–360 minutes.');
  if(k==='duration'&&(!Number.isInteger(v)||v<0||v>1440))throw new AppError('Duration must be 0–1440 minutes.');
  if(k==='windowMinutes'&&v!==null&&(!Number.isInteger(v)||v<0||v>MAX_WINDOW))throw new AppError(`An entry window must be 0–${MAX_WINDOW} minutes.`);
  if(k==='page'&&(!Number.isInteger(v)||v<1||v>72))throw new AppError('Choose a guide page from 1 to 72.');
  if(k==='order'&&(!Number.isFinite(v)||Math.abs(v)>100000))throw new AppError('Invalid position.');
  if(k==='kind'&&!['fixed','flexible','optional','review'].includes(v))throw new AppError('Invalid activity type.');
  if(k==='category'&&v!==''&&!ENTRY_TYPE_IDS.includes(v))throw new AppError('Choose a sort of stop from the list.');
  if(k==='review'&&typeof v!=='boolean')throw new AppError('Invalid review flag.');
  if(k==='participants'&&(!Array.isArray(v)||!v.length||v.some(n=>!state.members.includes(n))))throw new AppError('Choose people who are in the plan.');
 }
 return p;
}
// Adding an activity, whether it was typed in or arrived as a forwarded booking. It is one
// function so the two cannot drift apart: an emailed confirmation with a time becomes exactly
// the same locked step as one entered by hand.
export function addStep(state,p){
 if(!p.title||p.day===undefined)throw new AppError('Add a name and choose a day or Options.');
 if(p.day===null&&(p.time||p.bookingTime||p.locked))throw new AppError('Options have no fixed date or time.');
 if(!!p.group!==!!p.option)throw new AppError('Add both an option group and option name, or leave both blank.');
 const step={id:randomUUID(),originalTime:p.time??null,time:null,duration:30,notes:'',place:'',japanese:'',page:1,kind:'flexible',group:'',option:'',participants:[...state.members],order:Math.max(0,...state.steps.filter(s=>s.day===p.day).map(s=>s.order))+10,...p,locked:p.locked??(p.kind==='fixed'),status:'todo',bookingTime:p.bookingTime??(p.kind==='fixed'?p.time:null)};
 state.steps.push(step);
 if(p.group&&!state.choices[p.group])state.choices[p.group]=p.option;
 return step;
}
// When something was done: now, or a time given for it that has already passed.
function pastTime(given,now){
 if(!given)return now;
 if(!Number.isFinite(Date.parse(given))||Date.parse(given)>Date.now()+60000)throw new AppError('Choose a valid past completion time.');
 return new Date(given).toISOString();
}
// Ticking off the activity ticks off what got you in. The gate ticket for a train that has
// been caught is used, and nobody wants to remember to say so twice, so the booking held
// against this activity is marked used the moment the activity is done. It is remembered
// which activity took it, so undoing the activity brings its tickets back with it; one
// archived by hand beforehand is left where the family put it.
function ticketsUsed(state,step,at,user){
 for(const doc of state.documents.filter(d=>documentServesStep(d,step.id)&&documentSpent(state.steps,d)&&d.category!=='memory'&&!d.archivedAt))Object.assign(doc,{archivedAt:at,archivedBy:user.name,archivedWith:step.id});
}
function ticketsBack(state,step){
 for(const doc of state.documents.filter(d=>d.archivedWith&&documentServesStep(d,step.id)))Object.assign(doc,{archivedAt:null,archivedBy:null,archivedWith:null});
}
const binSnapshot=(state,op)=>{const k=BIN_KINDS[op.type];if(!k||!op.id)return null;const item=k.list(state).find(x=>x.id===op.id);return item?{op:op.type,item:structuredClone(item)}:null;};
// Putting something back, or letting it go for good. Whoever removed it, or a parent, may do
// either; a thing that is already back in its list is not put back twice.
function binOperation(state,op,user){
 if(op.type!=='binRestore'&&op.type!=='binDrop')return null;
 const entry=(state.bin||[]).find(e=>e.id===op.id);if(!entry)throw new AppError('That is no longer in Recently deleted.',404);
 if(user.role!=='parent'&&entry.by!==user.name)throw new AppError('Only whoever removed it, or a parent, can bring it back.',403);
 if(op.type==='binRestore'){
  const k=BIN_KINDS[entry.op];if(!k)throw new AppError('This cannot be put back.');
  if(k.list(state).some(x=>x.id===entry.item.id))throw new AppError('It is already back.');
  k.put(state,structuredClone(entry.item));
 }
 state.bin=state.bin.filter(e=>e.id!==entry.id);
 return {title:entry.title,important:false};
}
export function applyOperation(input,op,user){
 if(!op||typeof op!=='object')throw new AppError('Invalid action.');
 if(op.operationId!==undefined&&(!text(op.operationId,80)||!op.operationId.length))throw new AppError('Invalid operation identifier.');
 const state=ensureFeatures(structuredClone(input)),now=new Date().toISOString();
 const parent=user.role==='parent';
 const step=state.steps.find(s=>s.id===op.id);
 if(!parent && !['status','legStatus','waypoint','legSwap','challengeStatus','challengeSkip','challengeNew','etiquetteMission','eyeSpy','bingoTick','bingoCard','parkRide','parkWant','foodTried','foodRating','phraseSeen','factSeen','moneyFound','gameScore','weatherUpdate','jankenThrow','jankenNewRound','binRestore','binDrop','voiceNoteRemove','voiceNoteLabel','voiceNoteWords','shoppingAdd','shoppingStatus','giftPersonAdd','giftPersonEdit','giftPersonRemove','shortlistAdd','shortlistEdit','shortlistStatus','shortlistRating','shortlistShop','shortlistRemove','todoAdd','todoStatus','packAdd','packAddAll','packEdit','packStatus','packRemove','packDismiss','packBefore','noticedAdd','noticedEdit','noticedRemove','huntNew','huntPick','huntAdd','huntEdit','huntRate','huntRemove','huntRank','huntTried','huntListEdit','huntListRemove','spendAdd','spendEdit','spendBought','spendRemove','spendRequest','spendRequestCancel','sumoResult','sumoPredict','stepRating','stepThought','stepNextTime','capsuleWrite','dayRating','dayThought','acknowledge','proposalAdd','proposalEdit','proposalRemove','proposalPark','proposalVote','proposalMust','proposalRecommend','partyPerson','partyPriorities','photoVote','photoRemove','photoAssign','drawingRemove','mascotSave','mascotRemove','expressPick','expressUsed','predictionSet','thankYouSeen','checkInStart','checkInArrive','checkInCancel','lateSend','lateSeen','lateClear','lateAnswer','readinessSet','stageSet','rsvpSet'].includes(op.type))throw new AppError('A parent can make this change.',403);
 if(['status','legStatus','waypoint','legSwap','patch','lock','remove','backlog','schedule'].includes(op.type)&&!step)throw new AppError('Activity not found.',404);
 const before=step?structuredClone(step):null;
 const fail=(message,status=400)=>{throw new AppError(message,status);};
 // A copy of whatever a removal is about to take, made before the removal runs, so it can wait
 // in Recently deleted and come back exactly as it was. The removal itself is left to decide
 // whether this person may do it at all.
 const binned=binSnapshot(state,op);
 let extra=binOperation(state,op,user)||expressOperation(state,op,user,fail,now,(st,p)=>addStep(st,validatePatch(p,st)))||dpaOperation(state,op,user,fail,now,(st,p)=>addStep(st,validatePatch(p,st)))||extraOperation(state,op,user,fail,now);
 if(extra){
 }else if(op.type==='status'){
  if(!parent&&!step.participants.includes(user.name))throw new AppError('This activity is assigned to other family members.',403);
  if(!['todo','started','done','skipped'].includes(op.status)||(!parent&&op.status==='skipped'))throw new AppError('Invalid progress change.',403);
  const at=pastTime(op.at,now);
  step.status=op.status;step.updatedBy=user.name;
  if(op.status==='started')step.startedAt=at;
  if(op.status==='done'){step.completedAt=at;ticketsUsed(state,step,at,user);}
  if(op.status==='todo'){delete step.completedAt;delete step.startedAt;delete step.legsDone;ticketsBack(state,step);}
  if(op.status==='skipped')delete step.completedAt;
 }else if(op.type==='legStatus'){
  // One leg of a stop's route: the same people may tick it as may tick the stop, and the last
  // leg ticked is the stop ticked, tickets and all, exactly as if the stop had been ticked.
  if(!parent&&!step.participants.includes(user.name))throw new AppError('This activity is assigned to other family members.',403);
  if(typeof op.done!=='boolean'||!Number.isInteger(op.leg)||op.leg<0||op.leg>=legCount(step))throw new AppError('Invalid progress change.');
  const at=pastTime(op.at,now);
  step.updatedBy=user.name;
  const outcome=tickLeg(step,op.leg,op.done,at);
  if(outcome==='done')ticketsUsed(state,step,at,user);
  if(outcome==='undone')ticketsBack(state,step);
 }else if(op.type==='waypoint'){
  // A stop on the way, added to a route or taken off it by anyone who may tick the route.
  if(!parent&&!step.participants.includes(user.name))throw new AppError('This activity is assigned to other family members.',403);
  if(!routeFor(step))throw new AppError('Only a stop with a route can have a stop on the way.');
  const was=structuredClone(step),list=step.waypoints||[],route=ROUTES[step.id].length;
  // What a stop or leg says, where it goes and how long it takes, checked the same way whether
  // it is new or being changed.
  const details=(o,base={})=>{
   const w={...base};
   if('text'in o||!base.id){w.text=typeof o.text==='string'?o.text.trim():'';if(!w.text||w.text.length>160)throw new AppError('Say what the stop is for, in under 160 characters.');}
   if('kind'in o||!base.id){w.kind=o.kind??'stop';if(!WAYPOINT_KINDS[w.kind])throw new AppError('Choose a stop, a walk or a taxi.');}
   if('after'in o||!base.id){if(!Number.isInteger(o.after)||o.after<0||o.after>route)throw new AppError('Choose where on the way the stop goes.');w.after=o.after;}
   if('minutes'in o||!base.id){if(o.minutes!=null&&!(Number.isInteger(o.minutes)&&o.minutes>0&&o.minutes<=180))throw new AppError('Use up to 180 minutes for the stop.');w.minutes=o.minutes??null;}
   return w;
  };
  if(op.action==='add'){
   if(list.length>=MAX_WAYPOINTS)throw new AppError(`Add at most ${MAX_WAYPOINTS} stops on the way.`);
   step.waypoints=[...list,{id:randomUUID().slice(0,8),...details(op),by:user.name,at:now}];
  }else if(op.action==='update'||op.action==='remove'){
   const old=list.find(w=>w.id===op.waypointId);
   if(!old)throw new AppError('That stop on the way is already gone.',404);
   step.waypoints=op.action==='remove'?list.filter(w=>w.id!==op.waypointId):list.map(w=>w===old?{...details(op,old),updatedBy:user.name,updatedAt:now}:w);
   if(!step.waypoints.length)delete step.waypoints;
  }else throw new AppError('Invalid action.');
  step.updatedBy=user.name;
  rekeyLegs(was,step);
  // The journey takes as much longer (or shorter) in the day as the stops and legs added to it.
  const grew=addedMinutes(step)-addedMinutes(was);
  if(grew)step.duration=Math.min(1440,Math.max(5,(step.duration||30)+grew));
 }else if(op.type==='legSwap'){
  // Part or all of the guide's route gone another way (a taxi, on foot), by anyone who may tick it.
  if(!parent&&!step.participants.includes(user.name))throw new AppError('This activity is assigned to other family members.',403);
  if(!routeFor(step))throw new AppError('Only a stop with a route can change how we get there.');
  if(step.status==='done')throw new AppError('This journey is already done.');
  const was=structuredClone(step),list=step.swaps||[],old=op.action==='add'?null:list.find(s=>s.id===op.swapId);
  if(op.action!=='add'&&!old)throw new AppError('That change to the journey is already undone.',404);
  // The way, the legs it covers and how long it takes, checked the same way whether it is new or being changed.
  const details=(o,base={})=>{
   const s={...base};
   if('mode'in o||!base.id){s.mode=o.mode;if(!SWAP_MODES[s.mode])throw new AppError('Choose a taxi, a walk or another way.');}
   if('text'in o||!base.id){s.text=typeof o.text==='string'?o.text.trim():'';if(!s.text||s.text.length>160)throw new AppError('Say how you are going instead, in under 160 characters.');}
   if('from'in o||'to'in o||!base.id){
    const from=o.from??base.from,to=o.to??base.to,open=swappable(step,base.id);
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<from||to>=open.length)throw new AppError('Choose which legs to change.');
    for(let k=from;k<=to;k++)if(!open[k])throw new AppError(ROUTES[step.id][k].mode==='stop'?'A stop on the way stays; change the legs either side of it.':'Leg '+(k+1)+' is already done or changed.');
    s.from=from;s.to=to;
   }
   if('minutes'in o||!base.id){if(!(Number.isInteger(o.minutes)&&o.minutes>0&&o.minutes<=240))throw new AppError('Say about how long it takes, up to 240 minutes.');s.minutes=o.minutes;}
   return s;
  };
  if(op.action==='add')step.swaps=[...list,{id:randomUUID().slice(0,8),...details(op),by:user.name,at:now}];
  else if(op.action==='update')step.swaps=list.map(s=>s===old?{...details(op,old),updatedBy:user.name,updatedAt:now}:s);
  else if(op.action==='remove'){step.swaps=list.filter(s=>s!==old);if(!step.swaps.length)delete step.swaps;}
  else throw new AppError('Invalid action.');
  step.updatedBy=user.name;
  rekeyLegs(was,step);
  // The journey takes as much longer (or shorter) in the day as the new way does.
  const grew=routeMinutes(routeFor(step))-routeMinutes(routeFor(was));
  if(grew)step.duration=Math.min(1440,Math.max(5,(step.duration||30)+grew));
 }else if(op.type==='patch'){
  const patch=validatePatch(op.patch,state);
  if(step.locked && patch.locked!==false && (('time' in patch && patch.time!==step.time)||('day'in patch&&patch.day!==step.day)||('bookingTime'in patch&&patch.bookingTime!==(step.bookingTime??null))))throw new AppError('Unlock this time before moving it.');
  if(!!(patch.group??step.group)!==!!(patch.option??step.option))throw new AppError('Add both an option group and option name, or leave both blank.');
  if('bookingTime'in patch&&patch.bookingTime!==(step.bookingTime??null))step.bookingHistory=[...(step.bookingHistory||[]),{from:step.bookingTime??null,to:patch.bookingTime,at:now,by:user.name}];
  if('place'in patch&&patch.place!==step.place&&!('locationId'in patch))step.locationId=null;
  Object.assign(step,patch);
  if(step.group&&!state.choices[step.group])state.choices[step.group]=step.option;
 }else if(op.type==='lock'){
  if(typeof op.locked!=='boolean')throw new AppError('Invalid lock.');
  step.locked=op.locked;
 }else if(op.type==='add'){
  addStep(state,validatePatch(op.step,state));
 }else if(op.type==='backlog'){
  if(step.locked)throw new AppError('Unlock the fixed time before saving this activity for later.');
  step.backlogFrom={day:step.day,time:step.time,bookingTime:step.bookingTime,status:step.status};
  step.day=null;step.time=null;step.bookingTime=null;step.group='';step.option='';step.status='todo';delete step.startedAt;delete step.completedAt;delete step.legsDone;
 }else if(op.type==='schedule'){
  if(step.day!==null)throw new AppError('This activity is already on a day.');
  if(!state.days.some(d=>d.date===op.day)||!clock(op.time??null))throw new AppError('Choose a valid day and time.');
  step.day=op.day;step.time=op.time||null;step.order=Math.max(0,...state.steps.filter(s=>s.day===op.day).map(s=>s.order))+10;
 }else if(op.type==='orderDays'){
  // Whole days traded or put in a new order; the dates and the hotels stay where they are.
  const moves=orderDays(state,op.order,{moveLocked:op.moveLocked===true,positions:op.positions},fail);
  extra={summary:`Days rearranged: ${moves.map(m=>`${state.days.find(d=>d.date===m.to).title} → ${shortDate(m.to)}`).join('; ')}`,important:true,title:'Days rearranged'};
 }else if(op.type==='moveSteps'){
  // Stops picked off one day and moved to another, or traded for stops picked there.
  const r=moveSteps(state,{ids:op.ids,to:op.to,swapIds:op.swapIds||[],moveLocked:op.moveLocked===true,positions:op.positions},fail);
  const names=list=>list.length===1?list[0].title:`${list.length} stops`;
  extra={summary:r.coming.length?`${names(r.going)} (${shortDate(r.from)}) swapped with ${names(r.coming)} (${shortDate(r.to)})`:`${names(r.going)} moved from ${shortDate(r.from)} to ${shortDate(r.to)}`,important:true,title:names(r.going)};
 }else if(op.type==='reorder'){
  const active=activeSteps(state,op.day);
  if(!Array.isArray(op.ids)||new Set(op.ids).size!==active.length||op.ids.length!==active.length||op.ids.some(id=>!active.some(s=>s.id===id)))throw new AppError('The day changed. Reload before reordering.');
  const slots=active.map(s=>s.order).sort((a,b)=>a-b);op.ids.forEach((id,i)=>{state.steps.find(s=>s.id===id).order=slots[i];});
 }else if(op.type==='remove'){
  if(step.locked)throw new AppError('Unlock before deleting.');
  for(const doc of state.documents){
   if(!documentServesStep(doc,step.id))continue;
   const rest=documentSteps(doc).filter(id=>id!==step.id);
   Object.assign(doc,{stepIds:rest,stepId:rest[0]||null,day:rest.length?null:step.day});
  }
  // A planning idea that lost its activity goes back to being an idea, rather than pointing at
  // a step that is no longer there.
  for(const p of state.proposals){if(p.stepId===step.id)Object.assign(p,{stepId:null,scheduledBy:null,scheduledAt:null});}
  // Nothing the family recorded or spotted goes with the stop. A voice note and a shop find were
  // made on a day, so they fall back to that day rather than to a step that is gone: the note is
  // still in the day's recordings and the find still shows on the day we saw it.
  for(const v of state.voiceNotes||[]){if(v.stepId===step.id)v.stepId=null;}
  for(const f of state.shortlist||[]){if(f.stepId===step.id)Object.assign(f,{stepId:null,day:f.day??step.day??null});}
  for(const n of state.noticed||[]){if(n.stepId===step.id)Object.assign(n,{stepId:null,day:n.day??step.day??null});}
  state.steps=state.steps.filter(s=>s.id!==op.id);
 }else if(op.type==='choose'){
  if(!state.steps.some(s=>s.group===op.group&&s.option===op.option))throw new AppError('Option not found.');
  state.choices[op.group]=op.option;
 }else if(op.type==='groupMode'){
  // Whether a group's options are alternatives (pick one) or a split (all at once, by different
  // people). Nothing about the stops changes, so it can be flipped back without losing anything.
  if(!['choose','split'].includes(op.mode)||!state.steps.some(s=>s.group&&s.group===op.group))throw new AppError('Option group not found.');
  if(op.mode==='split')state.groupModes[op.group]='split';else delete state.groupModes[op.group];
 }else if(op.type==='reschedule'){
  if(!Array.isArray(op.changes)||!op.changes.length||op.changes.length>300)throw new AppError('Invalid schedule changes.');
  for(const change of op.changes){const s=state.steps.find(s=>s.id===change.id);if(!s||s.locked||['done','started','skipped'].includes(s.status)||!clock(change.time)||change.time===null)throw new AppError('A locked or invalid step cannot move.');s.time=change.time;}
 }else if(op.type==='documentLink'||op.type==='documentNote'){
  if(!text(op.title,250)||!op.title.trim()||(op.type==='documentLink'&&!safeLink(op.url)))throw new AppError('Add a title and a valid HTTPS link if linking a document.');
  if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))throw new AppError('Activity not found.');
  if(op.person&&!state.members.includes(op.person)&&op.person!=='Family')throw new AppError('Choose someone who is in the plan.');
  state.documents.push({id:randomUUID(),title:op.title,...documentDetails(op),...documentAssociation(op,state),...(op.type==='documentLink'?{url:op.url}:{}),person:op.person||'Family',type:op.type==='documentLink'?'link':'note',createdAt:now});
 }else if(op.type==='editDocument'){
  const doc=state.documents.find(d=>d.id===op.id);if(!doc)throw new AppError('Document not found.',404);
  if(!text(op.title,250)||!op.title.trim())throw new AppError('Add a title.');
  if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))throw new AppError('Activity not found.');
  if(op.person&&!state.members.includes(op.person)&&op.person!=='Family')throw new AppError('Choose someone who is in the plan.');
  Object.assign(doc,{title:op.title,...documentDetails(op),...documentAssociation(op,state),person:op.person||'Family'});
  const root=ticketParent(doc.parentDocumentId,state);
  if(root)Object.assign(doc,{category:root.category,stepId:root.stepId,stepIds:documentSteps(root),day:root.day});
  else for(const a of state.documents.filter(a=>a.parentDocumentId===doc.id))Object.assign(a,{category:doc.category,stepId:doc.stepId,stepIds:documentSteps(doc),day:doc.day});
 }else if(op.type==='inboxFile'){
  // Filing is the moment a forwarded email becomes part of the trip, and a person does it.
  // Where it goes is theirs to choose: a ticket, a ticket against one activity, a new activity
  // on a day, the Options list, an idea for the family to vote on, or a job on the to-do list.
  const item=(state.inbox||[]).find(i=>i.id===op.id);
  if(!item)throw new AppError('That email is no longer in the inbox.',404);
  if(!text(op.title,250)||!op.title.trim())throw new AppError('Add a title for this booking.');
  if(op.person&&!state.members.includes(op.person)&&op.person!=='Family')throw new AppError('Choose someone who is in the plan.');
  if(op.category==='memory')throw new AppError('Forwarded email is filed as a booking, not a photo.');
  const destination=op.destination||'ticket',title=op.title.trim();
  if(!INBOX_DESTINATIONS.includes(destination))throw new AppError('Choose where this email goes.');
  const english=op.notes!==undefined?op.notes:inboxNotes(item);
  const files=(item.attachments||[]).filter(f=>f.pathname);
  let association=documentAssociation(op,state);
  // Everything but a plain ticket creates something of its own first, and the files that came
  // with the email are attached to it rather than left floating.
  if(destination==='activity'||destination==='options'){
   const onDay=destination==='activity';
   if(onDay&&!op.day)throw new AppError('Choose a trip day for this activity.');
   // A confirmation forwarded from Booking.com or Klook says so, and the stop says it too.
   const via=guessPlatform(item.subject,item.text);
   const created=addStep(state,validatePatch({title,notes:english.slice(0,4000),day:onDay?op.day:null,
    ...(onDay&&op.time?{time:op.time,kind:'fixed'}:{kind:'flexible'}),...(via?{bookedVia:via}:{})},state));
   association={stepId:created.id,stepIds:[created.id],day:null};
   extra={summary:`${title} was added to the plan from a forwarded email`,important:true,title};
  }else if(destination==='idea'){
   extra=extraOperation(state,{type:'proposalAdd',title,notes:english.slice(0,4000),
    category:op.ideaKind||'place',day:op.day||null,timing:'flex'},user,fail,now);
  }else if(destination==='todo'){
   extra=extraOperation(state,{type:'todoAdd',title,kind:op.todoKind==='buy'?'buy':'do',
    day:op.day||null,person:op.person||'Family',notes:english.slice(0,2000)},user,fail,now);
  }
  // A file has nowhere to live but a document, so one is always made when the email carried an
  // attachment. With no attachment, only a ticket needs one: everywhere else already holds the
  // English on the thing that was just created.
  if(files.length||destination==='ticket'){
   const details=documentDetails({category:op.category||'reservation',reference:op.reference,notes:english,tags:op.tags});
   const [first,...rest]=files,person=op.person||'Family',rootId=randomUUID();
   state.documents.push({id:rootId,title,...details,...association,person,
    ...(first?{pathname:first.pathname,type:first.type,size:first.size}:{type:'note'}),
    source:'email',from:item.from,receivedAt:item.receivedAt||null,createdAt:now});
   for(const f of rest)state.documents.push({id:randomUUID(),title:f.filename.slice(0,250),...details,notes:'',
    ...association,person,parentDocumentId:rootId,pathname:f.pathname,type:f.type,size:f.size,
    source:'email',createdAt:now});
  }
  state.inbox=state.inbox.filter(i=>i.id!==op.id);
 }else if(op.type==='inboxDiscard'){
  const item=(state.inbox||[]).find(i=>i.id===op.id);
  if(!item)throw new AppError('That email is no longer in the inbox.',404);
  state.inbox=state.inbox.filter(i=>i.id!==op.id);
 }else if(op.type==='removeDocument'){
  state.documents=state.documents.filter(d=>d.id!==op.id&&d.parentDocumentId!==op.id);
 }else if(op.type==='documentCode'){
  // The text inside a ticket's QR code, read on a parent's phone and kept for everyone, or null
  // for a picture that has none. On the ticket itself, whether its code changes each time and
  // which app it has to be shown in.
  const doc=state.documents.find(d=>d.id===op.id);if(!doc)throw new AppError('Document not found.',404);
  const {value,error}=cleanCode(op);if(error)throw new AppError(error);
  if(value.code!==undefined){doc.code=value.code;doc.codeAt=now;delete doc.codeFound;}
  else if(value.found!==undefined){if(value.found===null){doc.code=null;doc.codeAt=now;}else doc.codeFound=value.found;}
  if(value.live!==undefined){if(doc.parentDocumentId)throw new AppError('Mark the ticket itself.');doc.codeLive=value.live;doc.codeApp=value.live?value.app:'';}
 }else if(op.type==='codesAnswer'){
  // Yes or no to the codes found on a booking, for it and its attached pages together.
  if(typeof op.add!=='boolean')throw new AppError('Invalid choice.');
  if(answerCodes(state,op.id,op.add,now)===null)throw new AppError('Document not found.',404);
 }else if(op.type==='codeOwner'||op.type==='codeSent'){
  // Whose each code on a ticket is, and each code sent out of the app, kept on the ticket itself.
  const doc=state.documents.find(d=>d.id===op.id&&!d.parentDocumentId);if(!doc)throw new AppError('Document not found.',404);
  if(typeof op.key!=='string')throw new AppError('Choose a code.');
  const {value,error}=op.type==='codeOwner'?setOwner(state,doc,op.key,op.person||''):recordSend(state,doc,op.key,user.name,now);
  if(error)throw new AppError(error);
  if(op.type==='codeOwner')doc.codeOwners=value;else doc.codeSends=value;
 }else if(op.type==='archiveDocument'){
  // A used ticket is not wrong, it is finished. Deleting it is the only thing worse than
  // leaving it in the way: the gate can still be argued about a week later. So it is archived
  // instead — off the list, out of the offline download and out of the swipe-through strip,
  // whole underneath and one tap from coming back. Its files go with it, because a ticket and
  // its photos are one thing to the family holding them.
  const doc=state.documents.find(d=>d.id===op.id);
  if(!doc)throw new AppError('Document not found.',404);
  if(typeof op.archived!=='boolean')throw new AppError('Invalid archive change.');
  if(doc.parentDocumentId)throw new AppError('Archive the ticket itself; its files go with it.');
  if(doc.category==='memory')throw new AppError('A memory belongs in the gallery rather than the used pile.');
  // Archived by hand is not archived by an activity: the mark is cleared either way, so putting
  // one back stays put and does not travel with a step it was never tied to.
  const mark=op.archived?{archivedAt:now,archivedBy:user.name,archivedWith:null}:{archivedAt:null,archivedBy:null,archivedWith:null};
  for(const d of [doc,...state.documents.filter(d=>d.parentDocumentId===doc.id)])Object.assign(d,mark);
  extra={title:doc.title};
 }else throw new AppError('Unknown action.');
 const fields=['time','day','bookingTime','windowMinutes','place','title','locked'];
 const diffs=op.type==='patch'&&before?fields.filter(k=>JSON.stringify(before[k]??null)!==JSON.stringify(step[k]??null)).map(k=>`${{time:'Target time',day:'Day',bookingTime:'Booking time',windowMinutes:'Entry window (min)',place:'Place',title:'Activity',locked:'Time lock'}[k]}: ${before[k]??'none'} → ${step[k]??'none'}`):[];
 const important=!extra?.private&&(extra?.important||diffs.length>0||['reschedule','choose','groupMode','backlog','schedule','remove'].includes(op.type));
 if(important){const summary=extra?.summary||(diffs.length?`${step.title}: ${diffs.join('; ')}`:`${step?.title||op.option||op.group||'Day plan'} · ${{reschedule:'times adjusted',choose:'alternative selected',groupMode:op.mode==='split'?'we split up here':'back to choosing one plan',backlog:'saved to Options',schedule:'added to a day',remove:'removed from itinerary'}[op.type]||'updated'}`);state.alerts=[{id:randomUUID(),summary,by:user.name,at:now,stepId:step?.id||extra?.stepId||null,seenBy:{[user.name]:now}},...state.alerts].slice(0,200);}
 // The removal went through, so the copy goes into Recently deleted; and whatever has waited
 // there longer than its thirty days is let go on the way past.
 state.bin=binEntries(state,Date.parse(now));
 if(binned)state.bin=[{id:randomUUID(),op:binned.op,kind:BIN_KINDS[binned.op].kind,title:binTitle(binned.item),item:binned.item,at:now,by:user.name},...state.bin].slice(0,200);
 if(op.operationId)state.appliedOperationIds=[...(state.appliedOperationIds||[]),op.operationId].slice(-500);
 // Private notes stay out of the shared alert feed and family history.
 if(!extra?.private)state.history=[{id:randomUUID(),at:now,by:user.name,type:op.type,title:extra?.title||step?.title||op.step?.title||op.title||op.option||'Trip update'},...(state.history||[])].slice(0,200);
 return state;
}
