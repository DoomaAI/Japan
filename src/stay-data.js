// A stay, the way a hotel app shows one: where we sleep tonight, which night of how many, when we
// can check in and when we must be out, the confirmation number, and how to get a taxi there.
// Most of it is worked out from the plan — the run of days with the same hotel, the check-in and
// check-out stops, the hotel's entry on our map — and a parent can fill in what the plan cannot
// know (the confirmation number, the front desk's phone, an agreed late check-out) under
// state.stays, keyed by the hotel's name as the days carry it.
import {showLocationDetails} from './locations.js';
import {addDays as addDay} from './timing.js';
export const STAY_FIELDS=[
 ['reference','Confirmation number',80],
 ['guest','Name on the booking',80],
 ['phone','Front desk phone',40],
 ['checkIn','Check-in from (HH:MM)',5],
 ['checkOut','Check-out by (HH:MM)',5],
 ['notes','Notes (breakfast, wifi, room)',600],
 // A photograph of the hotel, as a hotel app leads with one: a link to an image, from the
 // hotel's own site or our own photos. Shown at the top of the card; left out if it will not load.
 ['photo','Photo of the hotel (a link to the image)',600]
];
export const CLOCK=/^([01]\d|2[0-3]):[0-5]\d$/;
const said=/check[\s-]?in/i,out=/check[\s-]?out/i;
// Every stay in the trip, in order: a hotel and the nights we sleep there. The night of a day is
// the hotel that day carries; we check out on the morning after the last one.
export function staysOf(state){
 const runs=[];
 for(const d of state?.days||[]){
  if(!d.hotel)continue;
  const last=runs.at(-1);
  if(last&&last.hotel===d.hotel&&addDay(last.nights.at(-1),1)===d.date)last.nights.push(d.date);
  else runs.push({hotel:d.hotel,city:d.city,nights:[d.date]});
 }
 return runs.map(r=>({...r,from:r.nights[0],to:addDay(r.nights.at(-1),1)}));
}
// The plan's own check-in and check-out stops for a stay, when it has them.
const stopOn=(state,day,pattern)=>(state?.steps||[]).filter(s=>s.day===day&&pattern.test(s.title||'')&&!/airport|haneda|narita|flight/i.test(`${s.title} ${s.place||''}`)).sort((a,b)=>a.order-b.order)[0]||null;
// Tonight's stay on a given day, with everything the card shows. Null on a day with no hotel.
export function stayFor(state,date){
 const found=staysOf(state).find(s=>s.nights.includes(date));
 if(!found)return null;
 // The last day of the trip carries the hotel too, but we check out of it that morning and fly
 // home: when the check-out stop is on the last day itself, that day is the morning we leave.
 let stay=found,outStop=stopOn(state,found.to,out);
 const last=found.nights.at(-1),early=!outStop&&found.nights.length>1&&stopOn(state,last,out);
 if(early){outStop=early;stay={...found,nights:found.nights.slice(0,-1),to:last};}
 const saved=state?.stays?.[stay.hotel]||{};
 const inStop=stopOn(state,stay.from,said);
 const place={place:inStop?.place||stay.hotel,phone:saved.phone||inStop?.phone||'',japanese:inStop?.japanese||''};
 const where=showLocationDetails(state,place);
 const night=stay.nights.indexOf(date)+1;
 return {
  ...stay,
  night:night||stay.nights.length,total:stay.nights.length,checkingOut:!night,
  checkIn:saved.checkIn||inStop?.time||'',checkOut:saved.checkOut||outStop?.time||'',
  checkInStop:inStop,checkOutStop:outStop,
  reference:saved.reference||inStop?.bookingReference||'',guest:saved.guest||'',notes:saved.notes||'',photo:saved.photo||'',
  phone:where.phone,address:where.address,japanese:where.japanese,japaneseAddress:where.japaneseAddress,
  place,moving:stay.from===date,leaving:!night||stay.nights.at(-1)===date,
  by:saved.by||null,at:saved.at||null
 };
}
// A parent's edit, checked the same way on the phone and the server: only the fields above, each
// within its length, and the times as a 24-hour clock or left empty.
export function cleanStay(patch){
 const next={};
 for(const [key,,max] of STAY_FIELDS){
  if(patch?.[key]===undefined)continue;
  const v=String(patch[key]??'').trim();
  if(v.length>max)return {error:`That ${key==='notes'?'note':'entry'} is too long.`};
  if((key==='checkIn'||key==='checkOut')&&v&&!CLOCK.test(v))return {error:'Write the time as a 24-hour clock, like 15:00.'};
  if(key==='photo'&&v&&!/^https:\/\/\S+$/i.test(v))return {error:'The photo needs to be a link starting with https://.'};
  next[key]=v;
 }
 return {value:next};
}
