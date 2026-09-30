// Check In, the way iMessage does it: "back at the hotel by 4:30", said once when the family
// splits, and the other phones told when that phone gets there — or when the time passes and
// it has gone quiet. The check-in itself (who, where to, by when, arrived or not) lives in the
// trip, because starting and arriving are worth every phone hearing about. Where the phone is
// meanwhile does not: it goes through the same three-hour position row the memory map uses,
// rounded to about a hundred metres, and only while the check-in is open.
import {activeSteps,japanClock} from './timing.js';
import {stepPosition,kmBetween,placeCoords} from './memory-map.js';
import {resolveLocation} from './locations.js';
export const CHECKIN_AHEAD_HOURS=12;
// Past the time with no word for this long, and the card turns amber.
export const CHECKIN_QUIET_MIN=10;
// Within this of the destination, the phone counts itself as arrived.
export const ARRIVE_KM=0.15;
// How long an arrival stays on Home before it is just history.
export const ARRIVED_SHOWN_MIN=30;
export const SHARE_EVERY_MS=120000;
export const checkIns=state=>state.checkIns||[];
export const liveCheckIns=(state,now=new Date())=>checkIns(state).filter(c=>!c.closedAt&&(!c.arrivedAt||+now-Date.parse(c.arrivedAt)<ARRIVED_SHOWN_MIN*60000));
export const myCheckIn=(state,name,now=new Date())=>liveCheckIns(state,now).find(c=>c.from===name&&!c.arrivedAt)||null;
export const dueClock=c=>japanClock(new Date(c.due));
// Where somebody could be heading: the stops still to do today, tonight's hotel, the day's
// meeting point. Anything else is typed.
export function checkInDestinations(state,day){
 const today=(state.days||[]).find(d=>d.date===day),out=[];
 for(const s of activeSteps(state,day).filter(s=>!['done','skipped'].includes(s.status)))out.push({key:`step:${s.id}`,label:s.title,stepId:s.id});
 if(today?.hotel)out.push({key:'hotel',label:today.hotel,hotel:today.hotel});
 const m=state.meetings?.[day];if(m?.place)out.push({key:'meeting',label:`Meeting point · ${m.place}`});
 return out;
}
export function destinationPosition(state,c){
 if(c.stepId){const s=(state.steps||[]).find(s=>s.id===c.stepId);return s?stepPosition(state,s):null;}
 if(c.hotel){const loc=resolveLocation(state,c.hotel),at=loc&&placeCoords(state)[loc.id];return at?{lat:at.lat,lng:at.lng,exact:false}:null;}
 return null;
}
// live: on the way, in time. due: past the time, but the phone has spoken lately. late: past the
// time and quiet. arrived: there.
export function checkInStatus(c,last,now=new Date()){
 if(c.arrivedAt)return 'arrived';
 if(+now<Date.parse(c.due))return 'live';
 const quiet=!last||+now-Date.parse(last.at)>CHECKIN_QUIET_MIN*60000;
 return quiet?'late':'due';
}
export const quietMinutes=(c,last,now=new Date())=>Math.max(0,Math.round((+now-Date.parse(last?.at||c.startedAt))/60000));
export const kmAway=(state,c,last)=>{const to=destinationPosition(state,c);return to&&last?kmBetween(to,last):null;};
export const kmText=km=>km<0.1?'under 100 m':km<1?`${Math.round(km*100)*10} m`:`${km.toFixed(1)} km`;
