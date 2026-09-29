// Sealed predictions: before we fly, each of us guesses how the trip will go — the best food,
// the first thing bought, whether we see Fuji — and the answers stay sealed until we are home,
// when the recap opens them side by side. Sealed means sealed: the server does not send anyone
// the others' answers until the trip is over, and nobody can change theirs once we have landed.
import {tripCountdown} from './timing.js';
export const PREDICTIONS=[
 {id:'food',icon:'🍜',ask:'The best thing I will eat'},
 {id:'buy',icon:'🛍️',ask:'The first thing I will buy'},
 {id:'best',icon:'⭐',ask:'The best day will be the one with…'},
 {id:'fuji',icon:'🗻',ask:'Will we see Mount Fuji?'},
 {id:'machines',icon:'🥤',ask:'How many vending machines will I count on day one?'},
 {id:'brave',icon:'🦑',ask:'Who will eat the strangest thing?'},
 {id:'lost',icon:'🧦',ask:'What will we leave behind in a hotel?'},
 {id:'miss',icon:'🏠',ask:'What I will miss most from home'}
];
export const PREDICTION_MAX=200;
export const findPrediction=id=>PREDICTIONS.find(p=>p.id===id)||null;
// Open until the first day of the trip; sealed from then until the day after the last; then open to read.
export function predictionPhase(days,today){
 const c=tripCountdown(days,today);
 return !c?'open':c.phase==='before'?'open':c.phase==='during'?'sealed':'revealed';
}
export const predictionsOf=(state,person)=>state.predictions?.[person]||{};
export const predictionCount=(state,person)=>Object.values(predictionsOf(state,person)).filter(p=>p?.text).length;
// What the phone of `viewer` may know: their own answers always, and everybody else's only as a
// count until the trip is over.
export function visiblePredictions(state,viewer,today){
 const all=state.predictions||{};
 if(predictionPhase(state.days,today)==='revealed')return all;
 return Object.fromEntries(Object.entries(all).map(([person,answers])=>[person,person===viewer?answers:
  Object.fromEntries(Object.entries(answers||{}).filter(([,a])=>a?.text).map(([id])=>[id,{sealed:true}]))]));
}
