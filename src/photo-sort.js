// A camera roll put into the trip in one go: each photo goes to the stop it was taken at, worked
// out from where and when the photo says it was taken, and the parent checks the list before
// anything goes up. Place is the stronger clue — the plan's times are a guess at the day, and the
// day never keeps to them — so a photo taken beside a stop goes to that stop, and the clock only
// chooses between stops that are both close. A photo with a time and no position goes to whatever
// the plan had us doing then. One that says less goes to its day, or is left for the parent.
import {activeSteps,minutes,japanDate,japanClock} from './timing.js';
import {stepPosition,validPosition} from './memory-map.js';
import {distance} from './route-data.js';
// A pinned stop is about ten metres; a stop placed by its place off our map is the middle of a
// temple or a park, so it is given more room. Further than FAR from the stop the plan had us at
// and the plan was wrong that day: the photo goes to its day instead.
export const NEAR=350,NEAR_PLACE=800,FAR=3000;
// A photo a little before a stop's time is the queue for it; one well after the stop's end,
// with nothing next, is the walk back to the hotel.
const EARLY=20,LATE=120;
// When a photo was taken, in Japan: a stamp with its own offset is a moment anywhere; one
// without is the phone's clock, which on this trip is Japan's.
export function japanMoment(takenAt){
 if(typeof takenAt!=='string')return null;
 const naive=/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?$/.test(takenAt);
 if(naive)return {date:takenAt.slice(0,10),minute:minutes(takenAt.slice(11,16))};
 const at=Date.parse(takenAt);if(!Number.isFinite(at))return null;
 const d=new Date(at);return {date:japanDate(d),minute:minutes(japanClock(d))};
}
const live=(state,day)=>activeSteps(state,day).filter(s=>s.status!=='skipped');
// The day's stops with a start each: its own time, or else straight after the stop before.
export function dayWindows(state,day){
 let clock=null;
 return live(state,day).map(s=>{
  const start=s.time?minutes(s.time):clock;
  clock=start===null?null:start+(s.duration||30);
  return {step:s,start,end:clock};
 }).filter(w=>w.start!==null);
}
// The stop the plan had us at, at this minute of this day: the one underway, else one about to
// start (its queue), else the last one started, until well after it ended.
export function stepAtTime(state,day,minute){
 const windows=dayWindows(state,day);
 const on=windows.filter(w=>w.start<=minute&&minute<w.end);
 if(on.length)return on[on.length-1].step;
 const soon=windows.find(w=>w.start>minute&&w.start<=minute+EARLY);
 if(soon)return soon.step;
 const started=windows.filter(w=>w.start<=minute),now=started[started.length-1];
 if(!now)return null;
 const next=windows[windows.indexOf(now)+1];
 return next||minute<=now.end+LATE?now.step:null;
}
// How far a minute is from a stop's window, so two stops both close to a photo can be told apart.
const offWindow=(w,m)=>!w?Infinity:m<w.start?w.start-m:m>w.end?m-w.end:0;
export function sortPhoto(state,{gps=null,takenAt=null}={}){
 const when=japanMoment(takenAt);
 const day=when&&(state.days||[]).some(d=>d.date===when.date)?when.date:null;
 const city=day?(state.days.find(d=>d.date===day)?.city||null):null;
 const out=(how,step,extra={})=>({how,stepId:step?.id||null,day:step?step.day:day,city:step?(state.days.find(d=>d.date===step.day)?.city||null):city,...extra});
 const pool=day?live(state,day):(state.days||[]).flatMap(d=>live(state,d.date));
 const placed=validPosition(gps)?pool.map(s=>{const at=stepPosition(state,s);return at&&{step:s,at,metres:distance(gps,at)};}).filter(Boolean):[];
 const near=placed.filter(p=>p.metres<=(p.at.exact?NEAR:NEAR_PLACE));
 if(near.length){
  const windows=day?new Map(dayWindows(state,day).map(w=>[w.step.id,w])):null;
  // A stop the plan had us at, at that minute, beats a nearer one we were not at, and the one
  // closest to its time beats another also on; otherwise the nearest.
  const off=p=>{const m=when&&windows?offWindow(windows.get(p.step.id),when.minute):Infinity;return m<=EARLY?m:1e9;};
  const best=near.sort((a,b)=>(off(a)-off(b))||a.metres-b.metres)[0];
  return out('place',best.step,{metres:best.metres});
 }
 if(day&&when){
  const step=stepAtTime(state,day,when.minute);
  const there=step&&placed.find(p=>p.step.id===step.id);
  if(step&&!(there&&there.metres>FAR))return out('time',step);
  return out('day',null,{away:!!there});
 }
 return out('none',null,{when:!!when,where:validPosition(gps)});
}
// The target the gallery's "Attach to" list uses for a sorted photo.
export const sortedTarget=s=>s.stepId?`step:${s.stepId}`:s.day?`day:${s.day}`:'';
// A line for the parent saying why the photo went where it did.
const clockLabel=m=>{const h=Math.floor(m/60),mm=String(m%60).padStart(2,'0');return `${h%12||12}:${mm} ${h<12?'am':'pm'}`;};
const far=m=>m<1000?`${Math.max(10,Math.round(m/10)*10)} m`:`${(m/1000).toFixed(1)} km`;
export function sortReason(state,sorted,takenAt){
 const when=japanMoment(takenAt),step=sorted.stepId&&state.steps.find(s=>s.id===sorted.stepId);
 const at=when?`Taken ${clockLabel(when.minute)}`:'No time in the photo';
 if(sorted.how==='place')return `${at} · ${far(sorted.metres)} from ${step.title}`;
 if(sorted.how==='time')return `${at} · on the plan for ${step.title}`;
 if(sorted.how==='day')return `${at} · ${sorted.away?'not near the stop planned then':'no stop on the plan then'}, so the day album`;
 if(sorted.when)return `${at} on ${when.date}, outside the trip`;
 return sorted.where?'No time in the photo, and not near any stop':'No time or place in the photo — choose where it goes';
}
