// Tonight: the day wrapped up before bed, while it is still fresh. Three small things for the
// person holding the phone — star a few of the stops we did, vote for the photo of the day,
// and leave a voice note or a line in the diary — so the recap at the end of the trip has
// something to be made from. Each is already a thing the app keeps; this only asks for them
// at the right time, and counts what is still to do.
import {activeSteps} from './timing.js';
import {photosFor,photoVotesFor,voiceNotesFor,stepRatings} from './trip-features.js';
export const TONIGHT_FROM='17:00';
export const TONIGHT_RATE=3;
// Evening on the day itself, or any day already behind us that was not wrapped up.
export const tonightShows=(day,today,clock)=>day<today||(day===today&&clock>=TONIGHT_FROM);
// A stop ticked off after the fact is put at the time it was planned for, so the diary and the
// recap read it in the right place; one with no time on a day already gone sits at midday.
export function caughtUpAt(step,day,now=new Date()){
 const at=step.time?new Date(`${day}T${step.time}:00+09:00`):new Date(`${day}T12:00:00+09:00`);
 return at<now?at.toISOString():now.toISOString();
}
// The diary is a parent's to write, so for the boys it is a voice note that counts. Catching up
// the stops nobody ticked — done after all, or back to Options — is a parent's too.
export function tonightFor(state,day,person,parent=false){
 const steps=activeSteps(state,day),done=steps.filter(s=>s.status==='done');
 const open=parent?steps.filter(s=>!['done','skipped'].includes(s.status)):[];
 const rated=done.filter(s=>stepRatings(state,s.id)[person]);
 const toRate=done.filter(s=>!stepRatings(state,s.id)[person]).slice(0,Math.max(0,TONIGHT_RATE-rated.length));
 const photos=photosFor(state,day),vote=photoVotesFor(state,day)[person]||null;
 const spoke=voiceNotesFor(state,{day}).some(v=>v.by===person),wrote=!!String(state.journal?.[day]||'').trim();
 const tasks={catchUp:!open.length,rate:!done.length||rated.length>=Math.min(TONIGHT_RATE,done.length),vote:!photos.length||!!vote,memory:spoke||(parent&&wrote)};
 return {done:done.length,open,rated,toRate,photos,vote,spoke,wrote,tasks,
  finished:Object.values(tasks).filter(Boolean).length,total:Object.keys(tasks).length,
  complete:Object.values(tasks).every(Boolean)};
}
