// Yesterday, not yet logged: the morning after a trip day, the stops on it nobody ticked off,
// asked about once on Home the way a ring app asks about yesterday's activity. A parent sees
// every stop left open; anybody else sees just the ones they were on, since those are the
// only ones they may tick. Null when yesterday was not a trip day or nothing on it is open.
import {activeSteps} from './timing.js';
export const dayBefore=day=>new Date(Date.parse(`${day}T12:00:00Z`)-86400000).toISOString().slice(0,10);
export function yesterdayLog(state,person,parent,today){
 if(!state?.days||!person||!today)return null;
 const day=dayBefore(today),trip=state.days.find(d=>d.date===day);if(!trip)return null;
 const open=activeSteps(state,day).filter(s=>!['done','skipped'].includes(s.status)&&(parent||(s.participants||[]).includes(person)));
 return open.length?{day,title:trip.title,open}:null;
}
