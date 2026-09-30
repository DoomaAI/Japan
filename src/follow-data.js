// Following along from home: grandparents and friends see the trip as it happens — the days so
// far, the photos, the stars, what we said and the diary — through a link with no login. What
// they receive is built here and nowhere else, as an allow-list: every field below is one we
// chose to send. Tickets, bookings, hotels, places, pins, positions, phone numbers, money and
// anything still to come are never in it, because they are never copied into it.
import {activeSteps} from './timing.js';
import {photosFor,photoOfTheDay,stepRatings,stepThoughts,photoOwner} from './trip-features.js';
import {noticedFor} from './noticed-data.js';
import {kudosFor} from './kudos-data.js';
const avg=o=>{const v=Object.values(o).filter(Number.isFinite);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:null;};
export function followView(state,today){
 const all=state.days||[],days=all.filter(d=>d.date<=today);
 return {
  tripName:String(state.tripName||'Japan'),members:[...(state.members||[])],total:all.length,
  from:all[0]?.date||null,to:all.at(-1)?.date||null,
  days:days.map((d,i)=>{
   const winner=photoOfTheDay(state,d.date)?.winners?.[0]?.id||null;
   const stops=activeSteps(state,d.date).filter(s=>s.status==='done').map(s=>({
    id:s.id,title:String(s.title||''),stars:avg(stepRatings(state,s.id)),kudos:kudosFor(state,'stop',s.id).names,
    said:Object.entries(stepThoughts(state,s.id)).map(([person,t])=>({person,text:String(t?.text||'')})).filter(x=>x.text)}));
   return {date:d.date,number:all.indexOf(d)+1,title:String(d.title||''),city:String(d.city||''),
    photos:photosFor(state,d.date).filter(p=>p.pathname).map(p=>({id:p.id,by:photoOwner(p),best:p.id===winner,kudos:kudosFor(state,'photo',p.id).names})),
    stops,diary:String(state.journal?.[d.date]||''),
    noticed:noticedFor(state,{day:d.date}).map(n=>({by:n.by,text:String(n.text||'')}))};
  }).reverse()
 };
}
// Whether a photo may be sent to a follower: one of the family's own day photos, from a day
// that has already begun. Tickets and documents are a different list and are never looked in.
export const followPhoto=(state,id,today)=>(state.photos||[]).find(p=>p.id===id&&p.pathname&&p.day&&p.day<=today)||null;
