// A little Japan each day before we fly: one phrase, one fact and one etiquette tip a day in the run-up, so the
// boys land knowing how to say hello and why the trains are so quiet. The phrases come in the
// order the phrasebook thinks most worth knowing, and the facts about our own days come last,
// in trip order, so the countdown ends on the flight itself.
import {tripCountdown} from './timing.js';
import {ORDERED_PHRASES} from './phrasebook-data.js';
import {ALL_FACTS,ANYTIME_FACTS} from './fact-data.js';
import {phrasesSeenBy,factsSeenBy} from './trip-features.js';
import {ALL_ETIQUETTE} from './etiquette-data.js';
// Counted back from the flight: the day before gets the first of each list, the day before that
// the second, so the last fortnight is the phrases most worth knowing and the facts about the
// first days of the trip.
const pick=(list,daysToGo)=>list.length?list[(daysToGo-1)%list.length]:null;
export function dailyJapan(state,today,person,young=false){
 const c=tripCountdown(state.days,today);
 if(!c||c.phase!=='before')return null;
 const anytime=ANYTIME_FACTS(),facts=[...ALL_FACTS().filter(f=>!anytime.includes(f)),...anytime];
 const phrase=pick(ORDERED_PHRASES(),c.days),fact=pick(facts,c.days);
 return {days:c.days,phrase,fact,etiquette:pick(ALL_ETIQUETTE(young),c.days),
  phraseLearnt:!!(phrase&&person&&phrasesSeenBy(state,person)[phrase.id]),
  factRead:!!(fact&&person&&factsSeenBy(state,person)[fact.id])};
}
