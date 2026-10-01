// Rings for the day, on the trip's own ticks: the stops planned for you today, five photos, the
// day's phrase said, and three more anybody can add — the fact of the day read, today's stops
// rated, a voice note left. Each ring closes as the ticks come in. Which rings Home shows, and in
// what order, is this person's choice on this phone; the leaderboard only ever counts the first
// three, so a score means the same thing whoever's phone it is read on. No steps ring: Safari
// does not give a web app the pedometer, and a ring that guesses would be a ring nobody believed.
import {activeSteps,japanDate} from './timing.js';
export const PHOTO_TARGET=5;
const photoDay=(state,doc)=>doc.day||(state.steps||[]).find(s=>s.id===doc.stepId)?.day||(doc.takenAt?japanDate(new Date(doc.takenAt)):null)||(doc.createdAt?japanDate(new Date(doc.createdAt)):null);
const mineOn=(state,person,day)=>activeSteps(state,day).filter(s=>s.status!=='skipped'&&(!s.participants?.length||s.participants.includes(person)));
// Every ring there is, in the order a phone starts with. `unit` is what the gauge counts.
export const RINGS={
 stops:{label:'Stops',unit:'stops',note:'The stops planned for you today, ticked off',
  count:(state,person,day)=>{const mine=mineOn(state,person,day);return {done:mine.filter(s=>s.status==='done').length,target:mine.length};}},
 photos:{label:'Photos',unit:'photos',note:`${PHOTO_TARGET} photos kept from the day`,
  count:(state,person,day)=>({done:(state.documents||[]).filter(d=>d.category==='memory'&&d.person===person&&photoDay(state,d)===day).length,target:PHOTO_TARGET})},
 phrase:{label:'Phrase',unit:'said',note:'The phrase of the day, said out loud',
  count:(state,person,day)=>({done:state.phraseSeen?.[day]?.[person]?1:0,target:1})},
 fact:{label:'Fact',unit:'read',note:'The fact of the day, read',
  count:(state,person,day)=>({done:state.factSeen?.[day]?.[person]?1:0,target:1})},
 rated:{label:'Rated',unit:'stops',note:'Every stop you finished today, given its stars',
  count:(state,person,day)=>{const done=mineOn(state,person,day).filter(s=>s.status==='done');return {done:done.filter(s=>state.stepReviews?.[s.id]?.ratings?.[person]).length,target:done.length};}},
 voice:{label:'Voice note',unit:'notes',note:'One voice note about the day',
  count:(state,person,day)=>({done:Math.min(1,(state.voiceNotes||[]).filter(v=>v.by===person&&v.day===day).length),target:1})}
};
export const RING_IDS=Object.keys(RINGS);
export const SCORED=['stops','photos','phrase'];
export const RINGS_DEFAULT={order:RING_IDS,shown:SCORED};
// What comes back out of localStorage was written by some version of this app: unknown and
// repeated ids go, a ring added since lands at the end (and stays hidden), and at least one ring
// is always shown, or the card would be an empty box.
export function cleanRings(prefs){
 const known=list=>[...new Set((Array.isArray(list)?list:[]).filter(id=>Object.hasOwn(RINGS,id)))];
 const order=known(prefs?.order),shown=known(prefs?.shown);
 return {order:[...order,...RING_IDS.filter(id=>!order.includes(id))],shown:shown.length?shown:[...SCORED]};
}
export const shownRings=prefs=>{const p=cleanRings(prefs);return p.order.filter(id=>p.shown.includes(id));};
const measure=(state,person,day,id)=>{const {done,target}=RINGS[id].count(state,person,day);
 return {id,label:RINGS[id].label,unit:RINGS[id].unit,done,target,share:target?Math.min(1,done/target):0,closed:target>0&&done>=target};};
export const ringsFor=(state,person,day,ids=SCORED)=>ids.map(id=>measure(state,person,day,id));
export const dayScore=(state,person,day)=>ringsFor(state,person,day).filter(r=>r.closed).length;
// Every ring closed across the trip so far, for the leaderboard.
export const ringsTotal=(state,person,today=japanDate())=>(state.days||[]).filter(d=>d.date<=today).reduce((n,d)=>n+dayScore(state,person,d.date),0);
