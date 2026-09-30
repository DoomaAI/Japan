// Open next year. On the last days of the trip each of us writes a note to the family a year
// on: what we loved, what we hope, what we want to remember. Sealed until the anniversary of
// the last day, then opened on Home with that day's photos. Sealing is done at the server's
// boundary, not on the screen, so a phone cannot read a brother's early by asking nicely.
export const CAPSULE_MAX=1500;
const addYear=date=>{const [y,m,d]=date.split('-').map(Number);const next=new Date(Date.UTC(y+1,m-1,d));return next.toISOString().slice(0,10);};
// The day it opens: a year after the last day of the trip.
export const capsuleOpens=state=>{const last=state?.days?.at(-1)?.date;return last?addYear(last):null;};
export const capsuleIsOpen=(state,today)=>{const opens=capsuleOpens(state);return !!opens&&!!today&&today>=opens;};
// Writing is for the last three days of the trip and any time after, until it opens.
export const capsuleWritable=(state,today)=>{const days=state?.days||[];if(!days.length||!today)return false;const from=days[Math.max(0,days.length-3)].date;return today>=from&&!capsuleIsOpen(state,today);};
export const capsule=state=>state?.capsule||{};
export const capsuleFor=(state,person)=>capsule(state)[person]||null;
// Who has written, without saying what.
export const capsuleSealed=state=>Object.entries(capsule(state)).filter(([,c])=>c?.text||c?.sealed).map(([person])=>person);
// What a phone may see: its own, and the fact of the others', until the day.
export function visibleCapsule(state,person,today){
 const all=capsule(state);if(!Object.keys(all).length)return all;
 if(capsuleIsOpen(state,today))return all;
 const out={};
 for(const [who,c] of Object.entries(all))out[who]=who===person?c:{sealed:true,at:c.at||null};
 return out;
}
export const daysUntilOpen=(state,today)=>{const opens=capsuleOpens(state);if(!opens||!today)return null;return Math.round((Date.UTC(...opens.split('-').map((n,i)=>i===1?Number(n)-1:Number(n)))-Date.UTC(...today.split('-').map((n,i)=>i===1?Number(n)-1:Number(n))))/86400000);};
