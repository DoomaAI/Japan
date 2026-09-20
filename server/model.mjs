import { randomUUID } from 'node:crypto';
export const MEMBERS = ['Damien','Lauren','Nate','Boston'];
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const text = (v,max=1000) => typeof v === 'string' && v.length <= max;
const clock = v => v === null || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
export function safeLink(v){try{const u=new URL(v);return u.protocol==='https:';}catch{return false;}}
export function validatePatch(p,state){
 const allowed=['title','notes','place','japanese','time','duration','kind','day','page','group','option','participants','order','review'];
 if(!p || typeof p!=='object' || Array.isArray(p))throw new AppError('Invalid change.');
 for(const [k,v] of Object.entries(p)){
  if(!allowed.includes(k))throw new AppError('Unsupported field.');
  if(['title','notes','place','japanese','group','option'].includes(k)&&!text(v,k==='notes'?4000:250))throw new AppError('Text is too long.');
  if(k==='title'&&!v.trim())throw new AppError('Add an activity name.');
  if(k==='time'&&!clock(v))throw new AppError('Use a valid time.');
  if(k==='day'&&!state.days.some(d=>d.date===v))throw new AppError('Choose a trip day.');
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
 const state=structuredClone(input),now=new Date().toISOString();
 const parent=user.role==='parent';
 const step=state.steps.find(s=>s.id===op.id);
 if(!parent && op.type!=='status')throw new AppError('A parent can make this change.',403);
 if(['status','patch','lock','remove'].includes(op.type)&&!step)throw new AppError('Activity not found.',404);
 if(op.type==='status'){
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
  if(step.locked && (('time' in patch && patch.time!==step.time)||('day'in patch&&patch.day!==step.day)))throw new AppError('Unlock this time before moving it.');
  if(!!(patch.group??step.group)!==!!(patch.option??step.option))throw new AppError('Add both an option group and option name, or leave both blank.');
  Object.assign(step,patch);
  if(step.group&&!state.choices[step.group])state.choices[step.group]=step.option;
 }else if(op.type==='lock'){
  if(typeof op.locked!=='boolean')throw new AppError('Invalid lock.');
  step.locked=op.locked;
 }else if(op.type==='add'){
  const p=validatePatch(op.step,state);
  if(!p.title||!p.day)throw new AppError('Add a name and day.');
  if(!!p.group!==!!p.option)throw new AppError('Add both an option group and option name, or leave both blank.');
  state.steps.push({id:randomUUID(),originalTime:p.time??null,time:null,duration:30,notes:'',place:'',japanese:'',page:1,kind:'flexible',group:'',option:'',participants:MEMBERS,order:Math.max(0,...state.steps.filter(s=>s.day===p.day).map(s=>s.order))+10,...p,locked:p.kind==='fixed',status:'todo',bookingTime:p.kind==='fixed'?p.time:null});
  if(p.group&&!state.choices[p.group])state.choices[p.group]=p.option;
 }else if(op.type==='remove'){
  if(step.locked)throw new AppError('Unlock before deleting.');
  state.steps=state.steps.filter(s=>s.id!==op.id);
 }else if(op.type==='choose'){
  if(!state.steps.some(s=>s.group===op.group&&s.option===op.option))throw new AppError('Option not found.');
  state.choices[op.group]=op.option;
 }else if(op.type==='reschedule'){
  if(!Array.isArray(op.changes)||!op.changes.length||op.changes.length>300)throw new AppError('Invalid schedule changes.');
  for(const change of op.changes){const s=state.steps.find(s=>s.id===change.id);if(!s||s.locked||!clock(change.time)||change.time===null)throw new AppError('A locked or invalid step cannot move.');s.time=change.time;}
 }else if(op.type==='documentLink'){
  if(!text(op.title,250)||!op.title.trim()||!safeLink(op.url))throw new AppError('Add a title and an HTTPS link.');
  if(op.stepId&&!state.steps.some(s=>s.id===op.stepId))throw new AppError('Activity not found.');
  if(op.person&&!MEMBERS.includes(op.person)&&op.person!=='Family')throw new AppError('Invalid family member.');
  state.documents.push({id:randomUUID(),title:op.title,url:op.url,stepId:op.stepId||null,person:op.person||'Family',type:'link',createdAt:now});
 }else if(op.type==='removeDocument'){
  state.documents=state.documents.filter(d=>d.id!==op.id);
 }else throw new AppError('Unknown action.');
 if(op.operationId)state.appliedOperationIds=[...(state.appliedOperationIds||[]),op.operationId].slice(-500);
 state.history=[{id:randomUUID(),at:now,by:user.name,type:op.type,title:step?.title||op.step?.title||op.title||op.option||'Trip update'},...(state.history||[])].slice(0,200);
 return state;
}
