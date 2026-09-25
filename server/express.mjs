import {randomUUID} from 'node:crypto';
import {parkById,findRide,slotChoice,slotName,slotStep} from '../src/park-data.js';
const clock=v=>v===null||(typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v));
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
export const MAX_EXPRESS_SLOTS=30;
// Express Pass slots. A parent adds or removes a slot and puts it in the plan; each of us picks
// our own ☆ choice and ticks our own slot used, the way a ride is ticked, and a parent can do
// either for anybody. Returns the history entry, or null when the operation is not one of these.
export function expressOperation(state,op,user,fail,now,addStep){
 if(!['expressSlotAdd','expressSlotRemove','expressPick','expressUsed','expressPlan'].includes(op.type))return null;
 const parent=user.role==='parent';
 state.expressSlots=state.expressSlots||[];
 if(op.type==='expressSlotAdd'){
  if(!parent)fail('A parent can change the Express Pass.',403);
  const park=parkById(op.park);if(!park)fail('Choose a park.');
  const rides=Array.isArray(op.rides)?[...new Set(op.rides)]:[];
  if(rides.length>6||rides.some(id=>findRide(id)?.parkId!==park.id))fail('Choose up to six rides in this park.');
  const label=typeof op.label==='string'?op.label.trim():'';
  if(label.length>120)fail('Keep the slot name under 120 characters.');
  if(!rides.length&&!label)fail('Choose a ride or name the slot.');
  const start=op.start||null,end=op.end||null;
  if(!clock(start)||!clock(end))fail('Use a valid time.');
  if(end&&!start)fail('Add a start time before an end time.');
  if(start&&end&&mins(end)<=mins(start))fail('The window has to end after it starts.');
  if(state.expressSlots.length>=MAX_EXPRESS_SLOTS)fail(`An Express Pass holds at most ${MAX_EXPRESS_SLOTS} slots.`);
  const slot={id:randomUUID(),park:park.id,label,start,end,rides,stepIds:{},picks:{},used:{},addedBy:user.name,createdAt:now};
  state.expressSlots.push(slot);
  if(op.addToPlan)for(const key of rides.length?rides:[slot.id])planSlot(state,park,slot,key,addStep);
  return {title:`Express Pass: ${slotName(slot)}`};
 }
 const slot=state.expressSlots.find(s=>s.id===op.id);if(!slot)fail('Express slot not found.',404);
 const park=parkById(slot.park);
 if(op.type==='expressSlotRemove'){
  if(!parent)fail('A parent can change the Express Pass.',403);
  state.expressSlots=state.expressSlots.filter(s=>s.id!==slot.id);
  return {title:`Express Pass: ${slotName(slot)} removed`};
 }
 if(op.type==='expressPlan'){
  if(!parent)fail('A parent can change the plan.',403);
  const key=op.rideId??slot.id;
  if(key!==slot.id&&!slot.rides.includes(key))fail('That ride is not on this slot.');
  if(key===slot.id&&slot.rides.length)fail('Choose which ride to add.');
  if(slotStep(state,park,slot,key))fail('That is already in the plan.');
  const step=planSlot(state,park,slot,key,addStep);
  return {title:step.title,important:true,summary:`${step.title} · added to the plan`};
 }
 if(!state.members.includes(op.person))fail('Choose a family member.');
 if(!parent&&op.person!==user.name)fail('Choose only your own Express Pass.',403);
 if(op.type==='expressPick'){
  if(!slotChoice(slot))fail('This slot has no choice to make.');
  if(op.rideId!==null&&!slot.rides.includes(op.rideId))fail('Choose one of this slot’s rides.');
  const picks={...(slot.picks||{})};
  if(op.rideId)picks[op.person]=op.rideId;else delete picks[op.person];
  slot.picks=picks;
  return {title:`Express ${slotName(slot)}: ${op.person} → ${op.rideId?findRide(op.rideId).name:'undecided'}`};
 }
 if(typeof op.done!=='boolean')fail('Invalid Express tick.');
 let at=now;if(op.at){if(!Number.isFinite(Date.parse(op.at))||Date.parse(op.at)>Date.now()+60000)fail('Invalid time.');at=new Date(op.at).toISOString();}
 const ride=slotChoice(slot)?slot.picks?.[op.person]:slot.rides[0];
 if(op.done&&slotChoice(slot)&&!ride)fail('Pick a ride for this choice first.');
 const used={...(slot.used||{})};
 if(op.done)used[op.person]=used[op.person]||at;else delete used[op.person];
 slot.used=used;
 // Using the pass on a ride is riding it, so the ride checklist is ticked with it. Un-ticking the
 // pass leaves the ride alone: it may well have been ridden standby too.
 if(op.done&&ride){const e=state.parkRides[ride]||{},ridden={...(e.ridden||{})};ridden[op.person]=ridden[op.person]||at;state.parkRides={...state.parkRides,[ride]:{...e,ridden}};}
 return {title:`Express ${slotName(slot)}: ${op.person} ${op.done?'used':'not used yet'}`};
}
function planSlot(state,park,slot,key,addStep){
 const ride=findRide(key),name=ride?.name||slot.label||'Express slot';
 const window=slot.start?`Express Pass window ${slot.start}${slot.end?`–${slot.end}`:''}.`:'Express Pass — any time.';
 const step=addStep(state,{day:park.day,title:`${name} — Express Pass`,time:slot.start,kind:slot.start?'fixed':'optional',
  duration:slot.start&&slot.end?mins(slot.end)-mins(slot.start):30,...(slot.start?{order:orderAt(state,park.day,slot.start)}:{}),notes:slotChoice(slot)?`${window} ${slot.label||'Choice'} option.`:window,place:park.name});
 slot.stepIds={...(slot.stepIds||{}),[key]:step.id};
 return step;
}
// The day is read in order, not by clock, so a timed slot goes in after the last stop that starts
// no later than it, rather than at the bottom of the day under the train home.
function orderAt(state,day,time){
 const steps=state.steps.filter(s=>s.day===day).sort((a,b)=>a.order-b.order);
 let at=-1;steps.forEach((s,i)=>{if(s.time&&mins(s.time)<=mins(time))at=i;});
 if(at<0)return (steps[0]?.order??10)-1;
 const prev=steps[at].order,next=steps[at+1]?.order;
 return next===undefined?prev+10:(prev+next)/2;
}
