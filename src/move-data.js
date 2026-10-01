// The hotel-move concierge. A move day is the one day of a trip with the most small deadlines in
// it — bags to the desk by a cut-off the night before, a label nobody can read, check-out by ten,
// the overnight bag, and a next hotel that will not have the room until three. A good concierge
// says each of those at the right moment. This works them out from the plan: the two stays either
// side of the move, their check-out and check-in times, the forecast, the bags with trackers, and
// what a lookup of the two hotels found (state.moves, keyed by the move date).
//
// The card shows the evening before a move and the morning of it, and nothing on other days.
import {staysOf,stayFor} from './stay-data.js';
import {forecastFor} from './weather-data.js';
import {forwardedTrackers} from './trackers.js';
import {clamp,httpsLink as https} from './text.js';
const CLOCK=/^([01]\d|2[0-3]):[0-5]\d$/;
const addDay=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
// Every move in the trip: the morning we leave one hotel for the next.
export function movesOf(state){
 const stays=staysOf(state),out=[];
 for(let i=1;i<stays.length;i++)if(stays[i].from===stays[i-1].to)out.push({date:stays[i].from,from:stays[i-1].hotel,to:stays[i].hotel});
 return out;
}
// The plan's own mention of forwarding — "Forward luggage", takkyūbin — on the move or the days
// before it, or a bag with a tracker marked as forwarded, means we are sending the cases ahead.
const FORWARD=/forward(ing)? (the )?(luggage|bags|cases)|takky[uū]bin|luggage forwarding/i;
export function forwardingPlanned(state,move){
 const saved=state?.moves?.[move.date]?.forwarding;
 if(typeof saved==='boolean')return saved;
 const earlier=(state?.steps||[]).filter(s=>s.day&&s.day<=move.date&&s.day>=addDay(move.date,-3)&&FORWARD.test(`${s.title} ${s.notes||''}`));
 return earlier.length>0||forwardedTrackers(state).length>0;
}
// What the lookup of the two hotels found, cleaned to the one shape the trip keeps. Every field
// is what a person reads at the desk, so each is short; times are a 24-hour clock or nothing.
export const MOVE_FIELDS=[
 ['forwardingCutoff','Bags to the desk by','clock'],['forwardingWhere','Where to hand them in',200],['forwardingArrives','When they arrive',200],
 ['forwardingCost','What it costs',160],['checkOut','Check-out by','clock'],['bagDrop','Leaving bags before check-in',240],
 ['checkIn','Check-in from','clock'],['earlyCheckIn','Early check-in',240],['notes','Worth knowing',600]
];
export function cleanMoveCheck(found){
 const out={};
 for(const [key,,max] of MOVE_FIELDS){
  const v=clamp(found?.[key],max==='clock'?5:max);
  out[key]=max==='clock'?(CLOCK.test(v)?v:''):v;
 }
 out.sources=(Array.isArray(found?.sources)?found.sources:[]).map(s=>({title:clamp(s?.title,200),url:https(s?.url)})).filter(s=>s.url).slice(0,6);
 if(!out.sources.length&&!out.notes&&!out.forwardingCutoff&&!out.bagDrop)return {error:'The lookup found nothing it could point to.'};
 return {value:out};
}
// The luggage-forwarding label, field by field, the way the Yamato and Sagawa slips lay it out.
// Written for copying onto the slip at the front desk: the Japanese to write, what the box is,
// and the English underneath so we know what we wrote.
export function forwardingLabel(state,move){
 const to=stayFor(state,move.date),from=stayFor(state,addDay(move.date,-1));
 if(!to||!from)return [];
 const guest=clamp(state?.stays?.[to.hotel]?.guest,80)||`${(state?.members||[])[0]||''}`.trim();
 const [,m,d]=move.date.split('-').map(Number);
 return [
  {box:'お届け先',en:'Deliver to',value:[to.japanese||to.hotel,to.japaneseAddress||to.address,to.phone&&`TEL ${to.phone}`].filter(Boolean).join('\n'),missing:!to.japanese&&!to.japaneseAddress?'The next hotel’s Japanese name and address are not in the plan yet. Ask the desk to write them from the booking.':''},
  {box:'宿泊者名',en:'Guest name (on the booking)',value:`${guest} 様　（${m}月${d}日 チェックイン）`,note:`${guest}, checking in ${m}/${d}. Hotels file the bag under the booking name, so it has to match.`},
  {box:'お届け予定日',en:'Delivery date',value:`${m}月${d}日`,note:'The day we check in. Ask the desk whether it arrives by then.'},
  {box:'ご依頼主',en:'Sender',value:[from.japanese||from.hotel,from.japaneseAddress||from.address,from.phone&&`TEL ${from.phone}`].filter(Boolean).join('\n'),note:'The hotel we are leaving, with our name.'},
  {box:'品名',en:'Contents',value:'衣類（スーツケース）',note:'Clothes (suitcase). No batteries, sprays or valuables in a forwarded bag.'}
 ];
}
// The overnight bag, for the night the cases are somewhere else. The forecast for the move day
// adds what the weather asks for; a pool at the next hotel is somebody's swimmers.
export function overnightBag(state,move){
 const f=forecastFor(state,move.date);
 const list=[
  'Pyjamas and tomorrow’s clothes for everyone',
  'Toothbrushes, toothpaste and any medicine',
  'Phone chargers and the power bank',
  'Passports and the IC cards',
  'The boys’ bedtime toys and something to do on the train',
  'A change of clothes for Nate, in case'
 ];
 if(f&&f.rain!=null&&f.rain>=40)list.push('The umbrellas: rain is forecast for the move');
 if(f&&f.max!=null&&f.max>=28)list.push('Water bottles and hats: it is hot for carrying bags');
 if(f&&f.min!=null&&f.min<=14)list.push('A jumper each for the evening');
 return list;
}
// The card for a given day: the evening before a move, or the morning of one. Everything the
// card shows is worked out here, so the screen only draws it.
export function moveCard(state,date){
 const move=movesOf(state).find(m=>m.date===date||addDay(m.date,-1)===date);
 if(!move)return null;
 const phase=move.date===date?'morning':'eve';
 const leaving=stayFor(state,addDay(move.date,-1)),arriving=stayFor(state,move.date);
 const found=state?.moves?.[move.date]?.check||null;
 const forwarding=forwardingPlanned(state,move);
 const checkOut=found?.checkOut||leaving?.checkOut||'';
 const checkIn=found?.checkIn||arriving?.checkIn||'';
 const steps=[];
 if(phase==='eve'){
  if(forwarding)steps.push({id:'forward',text:`Bags to the front desk${found?.forwardingCutoff?` by ${found.forwardingCutoff}`:' this evening'}, labels filled in`,note:found?.forwardingWhere||'Most hotel desks take bags for next-day delivery until about 17:00–18:00. Ask when you get back.'});
  steps.push({id:'overnight',text:forwarding?'Pack the overnight bag before the cases go':'Pack everything but tonight’s things',note:''});
  steps.push({id:'pay',text:'Settle the room bill tonight if the desk will take it',note:'The queue at check-out is longest just before the cut-off.'});
 }
 if(phase==='morning'){
  steps.push({id:'sweep',text:'Once round the room before the bags go',note:'The checkout sweep is under the packing reminder.'});
  steps.push({id:'checkout',text:`Check out of ${move.from}${checkOut?` by ${checkOut}`:''}`,note:''});
  steps.push({id:'arrive',text:`${move.to}: ${checkIn?`check-in from ${checkIn}`:'check-in time not in the plan yet'}`,note:found?.bagDrop||'Most hotels will hold bags from the morning if the room is not ready.'});
 }
 return {move,phase,leaving,arriving,forwarding,checkOut,checkIn,found,foundAt:state?.moves?.[move.date]?.at||null,
  steps,label:forwarding?forwardingLabel(state,move):[],bag:forwarding?overnightBag(state,move):[],
  trackers:forwardedTrackers(state).map(t=>t.label)};
}
