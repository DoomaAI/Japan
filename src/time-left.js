// Time left in today, the way a Kindle says how long is left in the chapter: from what is still
// to do and how fast the day has actually gone. Each stop has a planned duration; each one ticked
// today with an arrival and a finish says how long it really took. The ratio between the two is
// the pace, kept between a brisk 0.6 and a slow 2, and the stops still to do are scaled by it,
// with their travel time added. Said in round quarter hours, with when that means we finish.
import {activeSteps,japanClock} from './timing.js';
export const PACE_MIN=0.6,PACE_MAX=2;
export function dayPace(steps){
 let planned=0,actual=0;
 for(const s of steps){
  if(s.status!=='done'||!s.startedAt||!s.completedAt||!s.duration)continue;
  const took=(Date.parse(s.completedAt)-Date.parse(s.startedAt))/60000;
  if(!(took>0&&took<600))continue;
  planned+=s.duration;actual+=took;
 }
 if(planned<30)return null;
 return Math.min(PACE_MAX,Math.max(PACE_MIN,actual/planned));
}
const quarter=m=>Math.max(15,Math.round(m/15)*15);
export const spoken=m=>{const q=quarter(m),h=Math.floor(q/60),r=q%60;return `${h?`${h} hour${h===1?'':'s'}`:''}${h&&r?' ':''}${r?`${r} min`:''}`;};
export function timeLeft(state,day,now=new Date(),person=null){
 const steps=activeSteps(state,day).filter(s=>s.status!=='skipped'&&(!person||!s.participants?.length||s.participants.includes(person)));
 const left=steps.filter(s=>s.status!=='done');
 if(!left.length)return null;
 const pace=dayPace(steps);
 const minutes=left.reduce((n,s)=>n+(s.duration||30)*(pace??1)+(s.status==='started'?0:(s.travelMinutes??0)),0);
 const at=new Date(+now+minutes*60000);
 return {minutes:Math.round(minutes),pace,stops:left.length,finish:japanClock(at),
  text:`About ${spoken(minutes)} of plan left${pace?` at this pace`:''} · ${left.length} stop${left.length===1?'':'s'}, done around ${japanClock(at)}`,
  paceWord:pace==null?null:pace>1.15?'running slower than planned':pace<0.85?'running quicker than planned':'on the planned pace'};
}
