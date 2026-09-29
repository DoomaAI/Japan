// The morning briefing: the day in one card, read over breakfast before anything else is opened.
// Which day of the trip it is, how many stops and when they start and finish, the times that
// cannot move, the weather, whether we change hotel, and the day's phrase. Everything in it is
// already in the trip; this only gathers it, so there is nothing to save and nothing to sync.
import {activeSteps} from './timing.js';
import {forecastFor,describe} from './weather-data.js';
import {phraseForDay} from './phrasebook-data.js';
import {declarationDue} from './arrival-data.js';
import {appsDue} from './apps-data.js';
export function dayBriefing(state,day){
 const days=state.days||[],i=days.findIndex(d=>d.date===day);
 if(i<0)return null;
 const today=days[i],steps=activeSteps(state,day).filter(s=>s.status!=='skipped'),timed=steps.filter(s=>s.time).sort((a,b)=>a.time.localeCompare(b.time));
 const f=forecastFor(state,day),[sky,icon]=f?describe(f.code):[null,null];
 const moving=i>0&&days[i-1].hotel&&today.hotel&&days[i-1].hotel!==today.hotel;
 return {
  dayNumber:i+1,total:days.length,city:today.city||'',title:today.title||'',
  stops:steps.length,done:steps.filter(s=>s.status==='done').length,
  starts:timed[0]?.time||null,ends:timed.at(-1)?.time||null,
  fixed:timed.filter(s=>s.locked).map(s=>({id:s.id,time:s.time,title:s.title})),
  weather:f?{sky,icon,max:f.max,min:f.min,rain:f.rain}:null,
  hotel:today.hotel||'',moving:!!moving,last:i===days.length-1,
  phrase:phraseForDay(days,day),declaration:declarationDue(state,day),apps:appsDue(state,day)
 };
}
// Good morning until eleven on the day itself; any other day, or later on, it is just the day.
export const briefingGreeting=(day,today,clock)=>day===today&&clock<'11:00'?'Good morning':day===today?'Today':day>today?'Coming up':'Looking back';
