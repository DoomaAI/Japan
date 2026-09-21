import {ensureFeatures} from '../src/trip-features.js';
import {extraOperation} from './features.mjs';
import { randomUUID } from 'node:crypto';
export const MEMBERS = ['Damien','Lauren','Nate','Boston'];
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
export function documentAssociation(p,state){
 const stepId=p.stepId||null,day=p.day||null;
 if(stepId&&!state.steps.some(s=>s.id===stepId))throw new AppError('Activity not found.');
 if(day&&!state.days.some(d=>d.date===day))throw new AppError('Choose a trip day.');
 if(stepId&&day)throw new AppError('Attach to an activity or a day, not both.');
 return {stepId,day};
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
export function applyOperation(input,op,user){
 if(!op||typeof op!=='object')throw new AppError('Invalid action.');
 if(op.operationId!==undefined&&(!text(op.operationId,80)||!op.operationId.length))throw new AppError('Invalid operation identifier.');
 const state=ensureFeatures(structuredClone(input)),now=new Date().toISOString();
 const parent=user.role==='parent';
 const step=state.steps.find(s=>s.id===op.id);
 if(!parent && !['status','challengeStatus','challengeSkip','challengeNew','eyeSpy','parkRide','foodTried','foodRating','phraseSeen','gameScore','weatherUpdate','jankenThrow','jankenNewRound','voiceNoteRemove','voiceNoteLabel','shoppingAdd','shoppingStatus','acknowledge'].includes(op.type))throw new AppError('A parent can make this change.',403);
 if(['status','patch','lock','remove','backlog','schedule'].includes(op.type)&&!step)throw new AppError('Activity not found.',404);
 const before=step?structuredClone(step):null;
 const extra=extraOperation(state,op,user,(message,status=400)=>{throw new AppError(message,status);},now);
 if(extra){
 }else if(op.type==='status'){
  if(!parent&&!step.participants.includes(user.name))throw new AppError('This activity is assigned to other family members.',403);
  if(!['todo','started','done','skipped'].includes(op.status)||(!parent&&op.status==='skipped'))throw new AppError('Invalid progress change.',403);
  let at=now;
  if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)throw new AppError('Choose a valid past completion time.');at=new Date(op.at).toISOString();}
  step.status=op.status;step.updatedBy=user.name;
  if(op.status==='started')step.startedAt=at;
  if(op.status==='done')step.completedAt=at;
  if(op.status==='todo'){delete step.completedAt;delete step.startedAt;}
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
  const p=validatePatch(op.step,state);
  if(!p.title||p.day===undefined)throw new AppError('Add a name and choose a day or Options.');
  if(p.day===null&&(p.time||p.bookingTime||p.locked))throw new AppError('Options have no fixed date or time.');
  if(!!p.group!==!!p.option)throw new AppError('Add both an option group and option name, or leave both blank.');
  state.steps.push({id:randomUUID(),originalTime:p.time??null,time:null,duration:30,notes:'',place:'',japanese:'',page:1,kind:'flexible',group:'',option:'',participants:MEMBERS,order:Math.max(0,...state.steps.filter(s=>s.day===p.day).map(s=>s.order))+10,...p,locked:p.locked??(p.kind==='fixed'),status:'todo',bookingTime:p.bookingTime??(p.kind==='fixed'?p.time:null)});
  if(p.group&&!state.choices[p.group])state.choices[p.group]=p.option;
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
  for(const doc of state.documents){if(doc.stepId===step.id){doc.stepId=null;doc.day=step.day;}}
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
  if(root)Object.assign(doc,{category:root.category,stepId:root.stepId,day:root.day});
  else for(const a of state.documents.filter(a=>a.parentDocumentId===doc.id))Object.assign(a,{category:doc.category,stepId:doc.stepId,day:doc.day});
 }else if(op.type==='removeDocument'){
  state.documents=state.documents.filter(d=>d.id!==op.id&&d.parentDocumentId!==op.id);
 }else throw new AppError('Unknown action.');
 const fields=['time','day','bookingTime','place','title','locked'];
 const diffs=op.type==='patch'&&before?fields.filter(k=>JSON.stringify(before[k]??null)!==JSON.stringify(step[k]??null)).map(k=>`${{time:'Target time',day:'Day',bookingTime:'Booking time',place:'Place',title:'Activity',locked:'Time lock'}[k]}: ${before[k]??'none'} → ${step[k]??'none'}`):[];
 const important=!extra?.private&&(extra?.important||diffs.length>0||['reschedule','choose','backlog','schedule','remove'].includes(op.type));
 if(important){const summary=extra?.summary||(diffs.length?`${step.title}: ${diffs.join('; ')}`:`${step?.title||op.option||'Day plan'} · ${{reschedule:'times adjusted',choose:'alternative selected',backlog:'saved to Options',schedule:'added to a day',remove:'removed from itinerary'}[op.type]||'updated'}`);state.alerts=[{id:randomUUID(),summary,by:user.name,at:now,stepId:step?.id||null,seenBy:{[user.name]:now}},...state.alerts].slice(0,200);}
 if(op.operationId)state.appliedOperationIds=[...(state.appliedOperationIds||[]),op.operationId].slice(-500);
 // Private notes stay out of the shared alert feed and family history.
 if(!extra?.private)state.history=[{id:randomUUID(),at:now,by:user.name,type:op.type,title:step?.title||op.step?.title||op.title||op.option||'Trip update'},...(state.history||[])].slice(0,200);
 return state;
}
