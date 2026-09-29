// On this day: once the trip is behind us, Home brings a day of it back on its anniversary —
// a month on, two months on, and then every year — with that day's photo and what we did.
// The date is Japan's, like every other date in the app, and nothing shows during the trip.
import {photoOfTheDay,photosFor,ratedSteps} from './trip-features.js';
const parts=d=>d.split('-').map(Number);
const words=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven'];
export function anniversary(state,today){
 const days=state.days||[];
 if(!days.length||today<=days.at(-1).date)return null;
 const [ty,tm,td]=parts(today);
 for(const d of days){
  const [y,m,dd]=parts(d.date);
  if(dd!==td)continue;
  const months=(ty-y)*12+(tm-m);
  if(months<=0)continue;
  const years=months%12===0?months/12:0;
  if(!years&&months>11)continue;
  const n=years||months,unit=years?'year':'month';
  const label=`${words[n]||n} ${unit}${n===1?'':'s'} ago today`;
  const winner=photoOfTheDay(state,d.date)?.winners?.[0]||photosFor(state,d.date)[0]||null;
  const best=ratedSteps(state,{day:d.date})[0]||null;
  return {day:d.date,title:d.title||'',city:d.city||'',label,photo:winner,best:best&&{title:best.step.title,average:best.average},note:String(state.journal?.[d.date]||'').trim()};
 }
 return null;
}
