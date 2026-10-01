// "If we have time": on a park day, a few rides worth fitting in, chosen from where we are and how
// the day is going. Worked out on the phone from what is already in the trip: the stops ticked
// off (where we are, and how far ahead or behind we finished), the next stop's time (how much
// room there is before it), each person's stars, who has ridden what, and the boys' heights.
// Nothing is booked or moved; a parent can put one on the day after the stop we are on.
import {openRides,ridePlanned} from './park-data.js';
import {riddenBy,wantedBy,heightCheck,BOYS} from './trip-features.js';
import {activeSteps,minutes,japanClock,scheduleVariance,spanWords} from './timing.js';
// Which areas are next door to which, so "near us" can reach one port over.
export const NEXT_DOOR={
 tds:{'Mediterranean Harbor':['American Waterfront','Mysterious Island'],'American Waterfront':['Mediterranean Harbor','Port Discovery'],
  'Port Discovery':['American Waterfront','Lost River Delta'],'Lost River Delta':['Port Discovery','Arabian Coast','Mysterious Island','Fantasy Springs'],
  'Arabian Coast':['Lost River Delta','Mermaid Lagoon','Mysterious Island','Fantasy Springs'],'Mermaid Lagoon':['Arabian Coast','Mysterious Island'],
  'Mysterious Island':['Mediterranean Harbor','Lost River Delta','Arabian Coast','Mermaid Lagoon'],'Fantasy Springs':['Arabian Coast','Lost River Delta']},
 tdl:{'World Bazaar':['Adventureland','Tomorrowland'],'Adventureland':['World Bazaar','Westernland'],'Westernland':['Adventureland','Critter Country','Fantasyland'],
  'Critter Country':['Westernland'],'Fantasyland':['Westernland','Toontown','Tomorrowland'],'Toontown':['Fantasyland','Tomorrowland'],'Tomorrowland':['World Bazaar','Fantasyland','Toontown']}
};
// Roughly how long to allow, queue included, before checking the live wait in the app; the walk
// over is added on top.
const ALLOW={big:40,some:30,gentle:20};
const ALLOW_RIDE={'tds-toystory':60,'tds-soaring':60,'tds-tinkerbell':40,'tds-peterpan':60,'tds-frozen':45,'tds-ariel':20,'tds-fortress':20,'tdl-pooh':60,'tdl-beauty':60,'tdl-baymax':45};
export const allowFor=ride=>ALLOW_RIDE[ride.id]??ALLOW[ride.thrill]??30;
const words=s=>String(s||'').toLowerCase();
// The area a stop is in: a ride it names, or an area named in its title, place or notes.
export function landOf(state,park,step){
 if(!step)return null;
 const ride=park.rides.find(r=>ridePlanned({steps:[step]},park,r));
 if(ride)return ride.land;
 const lands=[...new Set(park.rides.map(r=>r.land))],text=words(`${step.title} ${step.place} ${step.notes}`);
 return lands.find(l=>words(step.title).includes(words(l)))||lands.find(l=>text.includes(words(l)))||null;
}
export function spareTime(state,park,day,now=new Date()){
 const steps=activeSteps(state,day),clock=minutes(japanClock(now));
 const open=s=>!['done','skipped'].includes(s.status);
 const done=steps.filter(s=>s.status==='done'&&s.completedAt).sort((a,b)=>a.completedAt.localeCompare(b.completedAt)),last=done.at(-1)||null;
 const started=steps.find(s=>s.status==='started')||null;
 const next=steps.find(s=>open(s)&&s.status!=='started'&&s.time)||null;
 // Room before the next stop, after whatever we are in the middle of.
 let busyUntil=clock;
 if(started){const from=started.startedAt?minutes(japanClock(new Date(started.startedAt))):minutes(started.time)??clock;busyUntil=Math.max(clock,from+(started.duration||0));}
 const room=next?minutes(next.time)-busyUntil:null;
 const finished=last?scheduleVariance(last,new Date(last.completedAt)):null;
 const status=!next&&!started?'clear':room<0?'behind':room>=20?'ahead':'tight';
 const here=started||last||next,where=landOf(state,park,here);
 const near=new Set(NEXT_DOOR[park.id]?.[where]||[]);
 const boys=BOYS.filter(n=>(here?.participants||state.members).includes(n));
 const picks=status==='behind'?[]:openRides(park).flatMap(ride=>{
  if(Object.keys(riddenBy(state,ride.id)).length||ridePlanned({steps:steps.filter(s=>s.status!=='skipped')},park,ride))return [];
  const tooShort=boys.filter(n=>heightCheck(ride,n,state.heights).ok===false);
  if(tooShort.length===boys.length&&boys.length)return [];
  // The walk counts too: nothing across the park squeezed into a gap only long enough to queue.
  const walk=ride.land===where?0:near.has(ride.land)||!where?5:15,allow=allowFor(ride)+walk;
  if(room!==null&&allow>room)return [];
  const stars=wantedBy(state,ride.id),why=[];
  let score=stars.length*3+(state.parkRides?.[ride.id]?.must?3:0);
  if(ride.land===where){score+=4;why.push('right here');}else if(near.has(ride.land)){score+=2;why.push('next door');}
  if(stars.length)why.push(`starred by ${stars.join(', ')}`);
  if(tooShort.length)why.push(`too short for ${tooShort.join(', ')}`);
  return [{ride,allow,score,why,stars}];
 }).sort((a,b)=>b.score-a.score||a.allow-b.allow).slice(0,status==='tight'?2:4);
 // Behind: what could go to buy the time back, rather than anything more to do.
 const skippable=status==='behind'?steps.filter(s=>open(s)&&!s.locked&&s.kind==='optional').slice(0,2):[];
 const headline=status==='clear'?'The plan is done: time for favourites or one more ride'
  :status==='behind'?`About ${spanWords(-room)} behind ${next.title} at ${next.time}`
  :status==='tight'?`${room} min before ${next.title} at ${next.time}`
  :`${spanWords(room)} before ${next.title} at ${next.time}`;
 return {status,room,next,where,last,finished,picks,skippable,headline};
}
