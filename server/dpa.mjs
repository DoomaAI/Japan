import {randomUUID} from 'node:crypto';
import {parkById,findRide} from '../src/park-data.js';
import {japanClock} from '../src/timing.js';
import {hasDpa,dpaStep,DPA_WINDOW,MAX_DPA} from '../src/dpa.js';
import {orderAt} from './express.mjs';
const clock=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
// A parent logs a DPA bought in the Disney app, or takes one off. With `addToPlan`, its return
// time becomes the ride's timed entry in the day: the stop already there for it, else a new one.
// Returns the history entry, or null when the operation is not one of these.
export function dpaOperation(state,op,user,fail,now,addStep){
 if(!['dpaAdd','dpaRemove'].includes(op.type))return null;
 if(user.role!=='parent')fail('A parent can log a DPA.',403);
 state.dpa=state.dpa||[];
 if(op.type==='dpaRemove'){
  const d=state.dpa.find(d=>d.id===op.id);if(!d)fail('DPA not found.',404);
  state.dpa=state.dpa.filter(x=>x.id!==d.id);
  return {title:`DPA removed: ${findRide(d.rideId)?.name||'ride'}`};
 }
 const park=parkById(op.park);if(!hasDpa(park))fail('DPA is for the Disney parks.');
 const ride=findRide(op.rideId);if(!ride||ride.parkId!==park.id)fail('Choose a ride in this park.');
 const at=op.at||japanClock(new Date(now));
 if(!clock(at)||!clock(op.returnTime))fail('Use a valid time.');
 if(op.returnTime<at)fail('The return time comes after it was bought.');
 if(state.dpa.length>=MAX_DPA)fail(`The log holds at most ${MAX_DPA} DPAs.`);
 const d={id:randomUUID(),park:park.id,rideId:ride.id,at,returnTime:op.returnTime,by:user.name,createdAt:now,stepId:null};
 if(op.addToPlan){
  const timed={time:op.returnTime,bookingTime:op.returnTime,locked:true,kind:'fixed',windowMinutes:DPA_WINDOW};
  const step=dpaStep(state,park,ride.id);
  // A ride moved to its return time moves in the day's order with it, so the day still reads
  // top to bottom by the clock.
  if(step&&step.status==='todo'){
   const order=step.time===op.returnTime?step.order:orderAt({steps:state.steps.filter(s=>s.id!==step.id)},park.day,op.returnTime);
   if(step.bookingTime!==op.returnTime)step.bookingHistory=[...(step.bookingHistory||[]),{from:step.bookingTime??null,to:op.returnTime,at:now,by:user.name}];
   Object.assign(step,timed,{order,updatedBy:user.name});d.stepId=step.id;
  }
  else if(!step)d.stepId=addStep(state,{title:ride.name,day:park.day,place:park.name,duration:30,order:orderAt(state,park.day,op.returnTime),notes:`DPA bought at ${at}.`,...timed}).id;
 }
 state.dpa.push(d);
 return {title:`DPA: ${ride.name}, return ${op.returnTime}`};
}
