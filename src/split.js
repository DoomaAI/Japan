import {activeSteps,minutes,japanClock,japanDate} from './timing.js';
// A day where the family goes separate ways. It is built on the same option groups that hold
// alternative plans, with one difference: an alternative is "pick one and the others wait", a
// split is "all of them, at once, by different people". So a group is marked as a split, each of
// its options becomes a lane, and whoever is on a lane's stops is who is in that lane.
export const isSplit=(state,group)=>!!group&&state?.groupModes?.[group]==='split';
// Every split on a day, in the order the day meets them. Each carries its lanes, the stretch of
// the day it covers, and where everyone meets back up: the first stop after the split that
// everybody in it is going to. That meeting is worked out rather than typed in, so moving the
// dinner moves the meeting with it.
export function daySplits(state,day){
 const steps=activeSteps(state,day),out=[];
 for(const group of [...new Set(steps.filter(s=>isSplit(state,s.group)).map(s=>s.group))]){
  const mine=steps.filter(s=>s.group===group),lanes=[];
  for(const option of [...new Set(mine.map(s=>s.option))]){
   const laneSteps=mine.filter(s=>s.option===option);
   lanes.push({option,steps:laneSteps,members:[...new Set(laneSteps.flatMap(s=>s.participants||[]))]});
  }
  const members=[...new Set(lanes.flatMap(l=>l.members))];
  const last=steps.findLastIndex(s=>s.group===group),first=steps.findIndex(s=>s.group===group);
  const meet=steps.slice(last+1).find(s=>!s.group&&members.every(m=>(s.participants||[]).includes(m)))||null;
  const times=mine.map(s=>s.time).filter(Boolean).sort();
  out.push({group,lanes,members,firstId:steps[first].id,lastId:steps[last].id,start:times[0]||null,end:meet?.time||null,meet});
 }
 return out;
}
export const laneOf=(split,person)=>split.lanes.find(l=>l.members.includes(person))||null;
// The day as one person lives it: every shared stop, and on a split, only their own lane. Nobody
// is left with an empty stretch — somebody on none of a split's lanes is not in that split, so
// they see all of it, which is also what "everyone" asks for.
export function stepsFor(state,day,person){
 const steps=activeSteps(state,day);
 if(!person)return steps;
 const hide=new Set();
 for(const split of daySplits(state,day)){
  const lane=laneOf(split,person);
  if(lane)for(const other of split.lanes)if(other!==lane)for(const s of other.steps)hide.add(s.id);
 }
 return steps.filter(s=>!hide.has(s.id));
}
// What somebody is doing, for the "where is everyone" question that a split day is full of. It
// trusts what the family has told the app first — a stop marked arrived is where they are — and
// falls back on the plan, said as the plan: "should be at" is not "is at".
export function whereIs(state,day,person,now=new Date()){
 const steps=stepsFor(state,day,person).filter(s=>(s.participants||[]).includes(person));
 const open=steps.filter(s=>!['done','skipped'].includes(s.status));
 const last=steps.filter(s=>s.status==='done'&&s.completedAt).sort((a,b)=>b.completedAt.localeCompare(a.completedAt))[0]||null;
 const started=open.find(s=>s.status==='started');
 if(started)return {person,how:'at',step:started,since:started.startedAt?japanClock(new Date(started.startedAt)):null,next:open.find(s=>s!==started)||null,last};
 if(day===japanDate(now)){
  const t=minutes(japanClock(now)),planned=open.find(s=>s.time&&minutes(s.time)<=t&&t<minutes(s.time)+Math.max(s.duration||0,1));
  if(planned)return {person,how:'planned',step:planned,since:null,next:open.find(s=>s!==planned)||null,last};
 }
 return {person,how:open.length?'next':'done',step:open[0]||null,since:null,next:open[1]||null,last};
}
// Said before the day, while it can still be fixed: a lane of only the boys, somebody booked into
// two places at once, and a split nobody comes back from.
export function splitWarnings(split,children=[]){
 const out=[];
 for(const lane of split.lanes)if(lane.members.length&&lane.members.every(m=>children.includes(m)))out.push(`${lane.option} has no grown-up in it.`);
 for(const m of split.members){const n=split.lanes.filter(l=>l.members.includes(m)).length;if(n>1)out.push(`${m} is on ${n} lanes at once.`);}
 if(!split.meet)out.push('Nothing after the split has everyone on it — add where we meet back up.');
 return out;
}
export const laneName=lane=>`${lane.option} · ${lane.members.join(' + ')}`;
