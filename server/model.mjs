import {ensureFeatures,inboxNotes,documentSteps,documentServesStep,documentSpent} from '../src/trip-features.js';
import {extraOperation} from './features.mjs';
import { randomUUID } from 'node:crypto';
export const MEMBERS = ['Damien','Lauren','Nate','Boston'];
// Where a forwarded email can be filed. A ticket is the default; the rest put it where the
// family would have put it themselves had they typed it in.
export const INBOX_DESTINATIONS=['ticket','activity','options','idea','todo'];
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const text = (v,max=1000) => typeof v === 'string' && v.length <= max;
const clock = v => v === null || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
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
 const allowed=['title','notes','place','japanese','time','duration','kind','day','page','group','option','participants','order','review','bookingTime','bookingReference','locked','website','travelMinutes','arrivalBuffer','locationId','phone'];
 if(!p || typeof p!=='object' || Array.isArray(p))throw new AppError('Invalid change.');
 for(const [k,v] of Object.entries(p)){
  if(!allowed.includes(k))throw new AppError('Unsupported field.');
  if(['title','notes','place','japanese','group','option','bookingReference'].includes(k)&&!text(v,k==='notes'?4000:250))throw new AppError('Text is too long.');
  if(k==='title'&&!v.trim())throw new AppError('Add an activity name.');
  if(['time','bookingTime'].includes(k)&&!clock(v))throw new AppError('Use a valid time.');
  if(k==='locked'&&typeof v!=='boolean')throw new AppError('Invalid lock.');
  if(k==='day'&&v!==null&&!state.days.some(d=>d.date===v))throw new AppError('Choose a trip day.');
  if(k==='locationId'&&v!==null&&!(state.locations||[]).some(l=>l.id===v))throw new AppError('Choose a location from the map list.');
  if(k==='website'&&(v!==''&&(!text(v,2000)||!safeLink(v))))throw new AppError('Use an HTTPS website link.');
  if(k==='phone'&&(!text(v,40)||(v!==''&&!/^\+?[\d\s().-]{5,}$/.test(v))))throw new AppError('Use a phone number, ideally with its country code.');
  if(['travelMinutes','arrivalBuffer'].includes(k)&&(!Number.isInteger(v)||v<0||v>360))throw new AppError('Travel and arrival buffers must be 0–360 minutes.');
  if(k==='duration'&&(!Number.isInteger(v)||v<0||v>1440))throw new AppError('Duration must be 0–1440 minutes.');
  if(k==='page'&&(!Number.isInteger(v)||v<1||v>72))throw new AppError('Choose a guide page from 1 to 72.');
  if(k==='order'&&(!Number.isFinite(v)||Math.abs(v)>100000))throw new AppError('Invalid position.');
  if(k==='kind'&&!['fixed','flexible','optional','review'].includes(v))throw new AppError('Invalid activity type.');
  if(k==='review'&&typeof v!=='boolean')throw new AppError('Invalid review flag.');
  if(k==='participants'&&(!Array.isArray(v)||!v.length||v.some(n=>!MEMBERS.includes(n))))throw new AppError('Choose family members.');
 }
 return p;
}
// Adding an activity, whether it was typed in or arrived as a forwarded booking. It is one
// function so the two cannot drift apart: an emailed confirmation with a time becomes exactly
// the same locked step as one entered by hand.
function addStep(state,p){
 if(!p.title||p.day===undefined)throw new AppError('Add a name and choose a day or Options.');
 if(p.day===null&&(p.time||p.bookingTime||p.locked))throw new AppError('Options have no fixed date or time.');
 if(!!p.group!==!!p.option)throw new AppError('Add both an option group and option name, or leave both blank.');
 const step={id:randomUUID(),originalTime:p.time??null,time:null,duration:30,notes:'',place:'',japanese:'',page:1,kind:'flexible',group:'',option:'',participants:MEMBERS,order:Math.max(0,...state.steps.filter(s=>s.day===p.day).map(s=>s.order))+10,...p,locked:p.locked??(p.kind==='fixed'),status:'todo',bookingTime:p.bookingTime??(p.kind==='fixed'?p.time:null)};
 state.steps.push(step);
 if(p.group&&!state.choices[p.group])state.choices[p.group]=p.option;
 return step;
}
export function applyOperation(input,op,user){
 if(!op||typeof op!=='object')throw new AppError('Invalid action.');
 if(op.operationId!==undefined&&(!text(op.operationId,80)||!op.operationId.length))throw new AppError('Invalid operation identifier.');
 const state=ensureFeatures(structuredClone(input)),now=new Date().toISOString();
 const parent=user.role==='parent';
 const step=state.steps.find(s=>s.id===op.id);
 if(!parent && !['status','challengeStatus','challengeSkip','challengeNew','eyeSpy','parkRide','foodTried','foodRating','phraseSeen','factSeen','gameScore','weatherUpdate','jankenThrow','jankenNewRound','voiceNoteRemove','voiceNoteLabel','shoppingAdd','shoppingStatus','shortlistAdd','shortlistEdit','shortlistStatus','shortlistShop','shortlistRemove','todoAdd','todoStatus','spendAdd','spendEdit','spendBought','spendRemove','spendRequest','spendRequestCancel','sumoResult','sumoPredict','stepRating','stepThought','acknowledge','proposalAdd','proposalEdit','proposalRemove','proposalPark','proposalVote','proposalMust','partyPerson','photoVote','photoRemove','photoAssign','drawingRemove','mascotSave','mascotRemove'].includes(op.type))throw new AppError('A parent can make this change.',403);
 if(['status','patch','lock','remove','backlog','schedule'].includes(op.type)&&!step)throw new AppError('Activity not found.',404);
 const before=step?structuredClone(step):null;
 const fail=(message,status=400)=>{throw new AppError(message,status);};
 let extra=extraOperation(state,op,user,fail,now);
 if(extra){
 }else if(op.type==='status'){
  if(!parent&&!step.participants.includes(user.name))throw new AppError('This activity is assigned to other family members.',403);
  if(!['todo','started','done','skipped'].includes(op.status)||(!parent&&op.status==='skipped'))throw new AppError('Invalid progress change.',403);
  let at=now;
  if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)throw new AppError('Choose a valid past completion time.');at=new Date(op.at).toISOString();}
  step.status=op.status;step.updatedBy=user.name;
  if(op.status==='started')step.startedAt=at;
  // Ticking off the activity ticks off what got you in. The gate ticket for a train that has
  // been caught is used, and nobody wants to remember to say so twice, so the booking held
  // against this activity is marked used the moment the activity is done. It is remembered
  // which activity took it, so undoing the activity brings its tickets back with it; one
  // archived by hand beforehand is left where the family put it.
  if(op.status==='done'){
   step.completedAt=at;
   for(const doc of state.documents.filter(d=>documentServesStep(d,step.id)&&documentSpent(state.steps,d)&&d.category!=='memory'&&!d.archivedAt))Object.assign(doc,{archivedAt:at,archivedBy:user.name,archivedWith:step.id});
  }
  if(op.status==='todo'){
   delete step.completedAt;delete step.startedAt;
   for(const doc of state.documents.filter(d=>d.archivedWith&&documentServesStep(d,step.id)))Object.assign(doc,{archivedAt:null,archivedBy:null,archivedWith:null});
  }
  if(op.status==='skipped')delete step.completedAt;
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
  step.day=null;step.time=null;step.bookingTime=null;step.group='';step.option='';step.status='todo';delete step.startedAt;delete step.completedAt;
 }else if(op.type==='schedule'){
  if(step.day!==null)throw new AppError('This activity is already on a day.');
  if(!state.days.some(d=>d.date===op.day)||!clock(op.time??null))throw new AppError('Choose a valid day and time.');
  step.day=op.day;step.time=op.time||null;step.order=Math.max(0,...state.steps.filter(s=>s.day===op.day).map(s=>s.order))+10;
 }else if(op.type==='reorder'){
  const active=state.steps.filter(s=>s.day===op.day&&(!s.group||!state.choices[s.group]||state.choices[s.group]===s.option));
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
  state.steps=state.steps.filter(s=>s.id!==op.id);
 }else if(op.type==='choose'){
  if(!state.steps.some(s=>s.group===op.group&&s.option===op.option))throw new AppError('Option not found.');
  state.choices[op.group]=op.option;
 }else if(op.type==='reschedule'){
  if(!Array.isArray(op.changes)||!op.changes.length||op.changes.length>300)throw new AppError('Invalid schedule changes.');
  for(const change of op.changes){const s=state.steps.find(s=>s.id===change.id);if(!s||s.locked||['done','started','skipped'].includes(s.status)||!clock(change.time)||change.time===null)throw new AppError('A locked or invalid step cannot move.');s.time=change.time;}
 }else if(op.type==='documentLink'||op.type==='documentNote'){
  if(!text(op.title,250)||!op.title.trim()||(op.type==='documentLink'&&!safeLink(op.url)))throw new AppError('Add a title and a valid HTTPS link if linking a document.');
  if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))throw new AppError('Activity not found.');
  if(op.person&&!MEMBERS.includes(op.person)&&op.person!=='Family')throw new AppError('Invalid family member.');
  state.documents.push({id:randomUUID(),title:op.title,...documentDetails(op),...documentAssociation(op,state),...(op.type==='documentLink'?{url:op.url}:{}),person:op.person||'Family',type:op.type==='documentLink'?'link':'note',createdAt:now});
 }else if(op.type==='editDocument'){
  const doc=state.documents.find(d=>d.id===op.id);if(!doc)throw new AppError('Document not found.',404);
  if(!text(op.title,250)||!op.title.trim())throw new AppError('Add a title.');
  if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))throw new AppError('Activity not found.');
  if(op.person&&!MEMBERS.includes(op.person)&&op.person!=='Family')throw new AppError('Invalid family member.');
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
  if(op.person&&!MEMBERS.includes(op.person)&&op.person!=='Family')throw new AppError('Invalid family member.');
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
   const created=addStep(state,validatePatch({title,notes:english.slice(0,4000),day:onDay?op.day:null,
    ...(onDay&&op.time?{time:op.time,kind:'fixed'}:{kind:'flexible'})},state));
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
 const fields=['time','day','bookingTime','place','title','locked'];
 const diffs=op.type==='patch'&&before?fields.filter(k=>JSON.stringify(before[k]??null)!==JSON.stringify(step[k]??null)).map(k=>`${{time:'Target time',day:'Day',bookingTime:'Booking time',place:'Place',title:'Activity',locked:'Time lock'}[k]}: ${before[k]??'none'} → ${step[k]??'none'}`):[];
 const important=!extra?.private&&(extra?.important||diffs.length>0||['reschedule','choose','backlog','schedule','remove'].includes(op.type));
 if(important){const summary=extra?.summary||(diffs.length?`${step.title}: ${diffs.join('; ')}`:`${step?.title||op.option||'Day plan'} · ${{reschedule:'times adjusted',choose:'alternative selected',backlog:'saved to Options',schedule:'added to a day',remove:'removed from itinerary'}[op.type]||'updated'}`);state.alerts=[{id:randomUUID(),summary,by:user.name,at:now,stepId:step?.id||null,seenBy:{[user.name]:now}},...state.alerts].slice(0,200);}
 if(op.operationId)state.appliedOperationIds=[...(state.appliedOperationIds||[]),op.operationId].slice(-500);
 // Private notes stay out of the shared alert feed and family history.
 if(!extra?.private)state.history=[{id:randomUUID(),at:now,by:user.name,type:op.type,title:extra?.title||step?.title||op.step?.title||op.title||op.option||'Trip update'},...(state.history||[])].slice(0,200);
 return state;
}
