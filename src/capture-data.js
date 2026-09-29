import {japanDate} from './timing.js';
// One line, said or typed, turned into a to-do. This is the offline half: it knows the family,
// the trip's days and a handful of English habits ("buy", "for Nate", "tomorrow", "in Kyoto"),
// and it runs on the phone with no signal and on the server when Claude is not available. The
// online half asks Claude and gets the ambiguous cases right; both hand back the same shape,
// and both land in the same form to be checked before anything is saved.
export const CAPTURE_MAX=300;
const BUY_WORDS=/^(buy|get|pick up|grab|purchase|order|find)\b|\b(to buy|need to buy|needs)\b/i;
const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const shift=(date,days)=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const weekdayOf=date=>new Date(`${date}T00:00:00Z`).getUTCDay();
const clean=s=>s.replace(/\s+/g,' ').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g,'').trim();
// The day a phrase points at, if it points at one on the trip. Relative words count from the
// Japan date, not the phone's; a weekday means the next one on the trip, a city the next day
// spent there, and a bare "the 3rd" the next 3rd of a month the trip is still running.
export function captureDay(text,days,today=japanDate()){
 const dates=days.map(d=>d.date);
 const pick=(re,date)=>{const m=text.match(re);return m&&dates.includes(date)?{date,match:m[0]}:null;};
 return pick(/\b(?:for|on|by)?\s*today\b/i,today)
  ||pick(/\b(?:for|on|by)?\s*tomorrow\b/i,shift(today,1))
  ||pick(/\b(?:for|on|by)?\s*(?:the\s+)?day after tomorrow\b/i,shift(today,2))
  ||(()=>{const m=text.match(new RegExp(`\\b(?:on|for|by|this|next)?\\s*(${WEEKDAYS.join('|')})\\b`,'i'));if(!m)return null;
     const want=WEEKDAYS.indexOf(m[1].toLowerCase()),date=dates.find(d=>d>today&&weekdayOf(d)===want)||dates.find(d=>d>=today&&weekdayOf(d)===want);return date?{date,match:m[0]}:null;})()
  ||(()=>{const m=text.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b(?:\s+of\s+(\w+))?/i);if(!m)return null;
     const n=Number(m[1]),date=dates.find(d=>d>=today&&Number(d.slice(8))===n)||dates.find(d=>Number(d.slice(8))===n);return date?{date,match:m[0]}:null;})()
  ||(()=>{for(const d of days){const city=d.city.split(/\s*\/\s*/)[0];const m=text.match(new RegExp(`\\b(?:in|at|for)\\s+${city.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i'));
     if(m&&d.date>=today)return {date:d.date,match:m[0]};}return null;})();
}
// Who it is for: a name with "for", a possessive, a name at the front ("Nate needs a hat"), or
// the object of the buying verb ("buy Nate a hat"), where only the name comes out of the title.
export function capturePerson(text,members){
 for(const name of members){
  const m=text.match(new RegExp(`\\b(?:for\\s+${name}|${name}'?s|${name}\\s+needs?|${name}\\s+wants?)\\b`,'i'))
   ||text.match(new RegExp(`(?<=\\b(?:buy|get|grab|order|find|pick up)\\s)${name}\\b`,'i'));
  if(m)return {person:name,match:m[0]};
 }
 return /\b(all of us|everyone|the family|for us)\b/i.test(text)?{person:'Family',match:''}:null;
}
export function parseCaptureLocally(text,state,today=japanDate()){
 let rest=String(text||'').slice(0,CAPTURE_MAX);
 const kind=BUY_WORDS.test(rest.trim())?'buy':'do';
 const when=captureDay(rest,state.days||[],today);if(when)rest=rest.replace(when.match,' ');
 const who=capturePerson(rest,state.members||[]);if(who?.match)rest=rest.replace(who.match,' ');
 // "Buy Nate a hat" keeps "buy" in the title: the kind is a tag, the verb still reads.
 let title=clean(rest);
 // A leftover "for" or "on" at the end after the day and name came out is not part of the job.
 title=clean(title.replace(/\b(for|on|by|in|at)$/i,''));
 if(title)title=title[0].toUpperCase()+title.slice(1);
 return {title,kind,day:when?.date||null,person:who?.person||'Family',notes:'',via:'local'};
}
