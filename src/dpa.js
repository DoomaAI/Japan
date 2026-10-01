// Disney Premier Access at the two Tokyo Disney parks. Each DPA is bought in the Tokyo Disney
// Resort app for a return time with an hour's window, and the next one can be bought an hour
// after the last. The log keeps when each was bought and its return time, so the park page can
// say when the next one opens, and the return time can go straight into the day as a timed entry.
import {slotStep} from './park-data.js';
import {minutes,asClock} from './timing.js';
export const DPA_PARKS=['tdl','tds'];
export const DPA_GAP=60,DPA_WINDOW=60,MAX_DPA=40;
export const hasDpa=park=>!!park&&DPA_PARKS.includes(park.id);
export const dpaFor=(state,park)=>(state.dpa||[]).filter(d=>d.park===park.id).sort((a,b)=>a.at.localeCompare(b.at));
// When the next DPA can be bought: an hour after the latest purchase, or straight away when none
// has been bought yet.
export function nextDpa(state,park){
 const last=dpaFor(state,park).at(-1);
 return last?asClock(Math.min(minutes(last.at)+DPA_GAP,1439)):null;
}
export const dpaReturn=d=>`${d.returnTime}–${asClock(Math.min(minutes(d.returnTime)+DPA_WINDOW,1439))}`;
// The stop in the day this ride is, by the link made when it was bought, else by its name.
export const dpaStep=(state,park,rideId)=>slotStep(state,park,{},rideId);
