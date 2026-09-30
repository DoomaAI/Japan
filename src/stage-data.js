// The stage tracker, from the pizza tracker: the way to the next booking that cannot move, as
// five stages on a line rather than a countdown. The boys can watch the dot move. A tap on a
// stage reaches it (and the ones before it); a tap on the reached stage steps back one. With
// the phone's position on, the ends look after themselves: away from the hotel is "left", and
// within a couple of hundred metres of the booking is "at the gate".
import {destinationPosition} from './checkin-data.js';
import {stepPosition,kmBetween} from './memory-map.js';
export const STAGES_DAY=[
 {id:'packed',label:'Packed',icon:'🎒'},
 {id:'left',label:'Left the hotel',icon:'🚪'},
 {id:'train',label:'On the train',icon:'🚃'},
 {id:'walk',label:'Walking',icon:'🚶'},
 {id:'gate',label:'At the gate',icon:'🎟️'}
];
export const STAGES_MOVE=[
 {id:'packed',label:'Packed',icon:'🧳'},
 {id:'out',label:'Checked out',icon:'🛎️'},
 {id:'bags',label:'Bags at the desk',icon:'🏷️'},
 {id:'train',label:'On the Shinkansen',icon:'🚄'},
 {id:'in',label:'Checked in',icon:'🛏️'}
];
export const LEFT_KM=0.3,GATE_KM=0.2;
// A hotel move day gets the move's stages; every other day the day's.
export function stagesFor(state,step){
 const days=state.days||[],i=days.findIndex(d=>d.date===step?.day);
 const moving=i>0&&days[i-1].hotel&&days[i].hotel&&days[i-1].hotel!==days[i].hotel;
 return moving?STAGES_MOVE:STAGES_DAY;
}
export const stageState=state=>state.stages||{};
export const stageReached=(state,stepId)=>stageState(state)[stepId]?.reached??0;
// Where the phone's position puts the family, if anywhere: past "left" once it is well away from
// the hotel, and at the last stage once it is at the booking. Otherwise nothing to say.
export function stageFromPosition(state,step,at){
 if(!at||!step)return null;
 const to=stepPosition(state,step);
 if(to&&kmBetween(to,at)<=GATE_KM)return 5;
 const day=(state.days||[]).find(d=>d.date===step.day),hotel=day?.hotel?destinationPosition(state,{hotel:day.hotel}):null;
 if(hotel&&kmBetween(hotel,at)>LEFT_KM)return 2;
 return null;
}
export const stageWords=(stages,reached)=>reached<=0?'Not started':reached>=stages.length?stages[stages.length-1].label:`${stages[reached-1].label} · next: ${stages[reached].label.toLowerCase()}`;
