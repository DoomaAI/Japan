// What each of the boys is ready for, as two dials a parent sets rather than a name written
// into the code. Reading says how the words reach him: read aloud at a story's pace, sounded
// out, or read on his own. Awareness says how much of the trip's machinery he should see and
// touch: the child who is always holding a hand needs no leave-by clock, the one who can be
// told how the day goes can see the reports and the check-in, and the one who can be trusted
// with the plan gets the timings and the questions. The two are separate because they do not
// move together — a seven-year-old who reads well is still not the audience for "we're late".
//
// Each starts from the age on the travel-party profile and stays there until a parent moves
// it, so a second family gets sensible dials with nothing set, and a boy who starts reading
// the kana halfway through the trip can be moved up that evening.
import {BOYS,personProfile} from './trip-features.js';
import {YOUNG_RATE} from './speech.js';
export const READING=[
 ['none','Not yet','Everything is read to him, slowly. Pictures before words, and a mouth to tap rather than a line to read.'],
 ['sounding','Sounding out','Short words in big type, still read aloud at a story’s pace, with the sound-it-out line under each phrase.'],
 ['reads','Reads on his own','The pages as they are. Read to me stays on every fact and note, at talking pace.']
];
export const AWARENESS=[
 ['with','With a grown-up','Today’s stops and his own things: missions, photos, the purse, the phrases. No times to keep, no reports, no check-ins, and no emergency page beyond the meeting card.'],
 ['told','Can be told things','Plus how the day goes: the weather by the hour, what the other phones reported, who is on their way back, and the safety page.'],
 ['trusted','Can be trusted with','Plus the plan’s clock: what’s next and how long until it, the next fixed time and its stage tracker, whether the trains are running, and Ask about our trip.']
];
const READING_IDS=READING.map(([id])=>id),AWARENESS_IDS=AWARENESS.map(([id])=>id);
export const readingLabel=id=>(READING.find(([key])=>key===id)||READING.at(-1))[1];
export const awarenessLabel=id=>(AWARENESS.find(([key])=>key===id)||AWARENESS.at(-1))[1];
// Where the dials start, from an age alone.
export const defaultReading=age=>age===null||age===undefined?null:age<6?'none':age<8?'sounding':'reads';
export const defaultAwareness=age=>age===null||age===undefined?null:age<7?'with':age<10?'told':'trusted';
// The trip's own boys as they were when the app was written, for a profile nobody has filled
// in yet. Any other child with no age is simply not a child here until one is given.
const FALLBACK_AGE={Nate:5,Boston:8};
export const ageOf=(state,name)=>{const age=personProfile(state,name).age;return age!==null&&age!==undefined&&age!==''?Number(age):FALLBACK_AGE[name]??null;};
// A profile's age decides it; until one is given, the trip's own list of children does.
export const isChild=(state,name)=>{const age=ageOf(state,name);return age!==null?age<13:BOYS.includes(name);};
// Both dials for one person: what is set, or the age's default where nothing is. A grown-up
// reads and is trusted with everything, so a screen never has to ask who it is drawing for.
export function childLevels(state,name){
 const child=isChild(state,name),age=ageOf(state,name),me=personProfile(state,name);
 if(!child)return {child:false,age,reading:'reads',awareness:'grownup',readingSet:false,awarenessSet:false};
 const readingSet=READING_IDS.includes(me.reading),awarenessSet=AWARENESS_IDS.includes(me.awareness);
 return {child:true,age,
  reading:readingSet?me.reading:defaultReading(age)??'reads',
  awareness:awarenessSet?me.awareness:defaultAwareness(age)??'told',
  readingSet,awarenessSet};
}
export const validReading=id=>READING_IDS.includes(id),validAwareness=id=>AWARENESS_IDS.includes(id);
// How the words should reach this person on a screen: young means read aloud at a story's pace
// and offered before anything has to be read; pictures means the picture-first version of a
// page where there is one.
export function readingHelp(state,name){
 const {reading}=childLevels(state,name),young=reading!=='reads';
 return {reading,young,pictures:reading==='none',rate:young?YOUNG_RATE:undefined};
}
// Which of the family are still read to, by name, for a line that says who a button is for.
export const readTo=state=>(state?.members||[]).filter(n=>readingHelp(state,n).young);
// What each level of awareness lets through. Anything not listed is for everyone. The ids are
// Home widgets and pages, so one table gates both registries; a stop's Report button is the
// one action on the list, because a report goes to every phone.
const RANK={with:0,told:1,trusted:2,grownup:3};
export const AWARENESS_GATES={
 checkin:'told',late:'told',reports:'told',spare:'told',weather:'told',safety:'told',
 nextup:'trusted',links:'trusted',running:'trusted',ask:'trusted',report:'trusted'
};
export const awarenessAllows=(state,name,id)=>{
 const need=AWARENESS_GATES[id];if(!need)return true;
 return RANK[childLevels(state,name).awareness]>=RANK[need];
};
export const heldBack=(state,name)=>Object.keys(AWARENESS_GATES).filter(id=>!awarenessAllows(state,name,id));
// The two dials as a sentence for the model, so a fact for one boy is two short spoken
// sentences and one for his brother can carry a date and a why. Nothing for a grown-up.
export function levelsBrief(state,name){
 const l=childLevels(state,name);if(!l.child)return '';
 const reading={
  none:`${name} cannot read yet: everything ${name} sees is read aloud, so keep it to two or three short sentences that sound right spoken, with no numbers to read off.`,
  sounding:`${name} is sounding words out: short sentences, simple words, one idea at a time.`,
  reads:`${name} reads alone: plain and short, still a child’s register.`}[l.reading];
 const awareness={
  with:`${name} is always with a grown-up: nothing about times, money, being late or anything that could worry a small child.`,
  told:`${name} can be told how the day goes, but a parent decides; nothing about money or bookings.`,
  trusted:`${name} can be trusted with the plan and its timings; money, bookings and going anywhere alone are still a parent’s.`}[l.awareness];
 return `${reading} ${awareness}`;
}
// Whether this person gets only the gentle facts: a child who is always with a grown-up.
export const gentleOnly=(state,name)=>{const l=childLevels(state,name);return l.child&&l.awareness==='with';};
