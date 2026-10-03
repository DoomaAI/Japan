// Matcha nearby: a nudge when we walk within a set distance of one of our matcha places, so the
// tea house on the list is not found out about from the train home. Our matcha places are the
// ones the family tagged: every place on our map list marked matcha (the master list's MATCHA
// STOP and MATCHA BUYING rows, and the Matcha / Cafe types), and every find on the Matcha hunt
// that says where it is — a pin, a stop, or a place off our map.
//
// A place is only as good as its position. A map place takes its coordinates from our My Map;
// one the map has not placed yet cannot be watched for, and the setting says how many that is.
//
// Each place is told about once a day per person, so standing outside the same shop for an
// hour is one buzz and not sixty. The choice and the record of what was told are kept on the
// phone under the person's name, like the other settings.
import {localStore as device} from './browser.js';
import {placeCoords,stepPosition,validPosition,kmBetween} from './memory-map.js';
import {japanDate} from './timing.js';
export const MATCHA_RADII=[[0.2,'200 m'],[0.5,'500 m'],[1,'1 km']];
export const DEFAULT_RADIUS=0.5;
// A fix rougher than this could put us a street away either side, so it is not judged.
export const MAX_ACCURACY_M=200;
export const isMatchaLocation=l=>/matcha/i.test(`${l?.category||''} ${l?.notes||''}`)&&!l?.referenceOnly;
// Every matcha place we can watch for, each once, with where it is. A hunt find on a map place
// is the same place, so it is folded into it rather than told about twice.
export function matchaPlaces(state){
 const coords=placeCoords(state),out=new Map();let unplaced=0;
 for(const l of (state?.locations||[]).filter(isMatchaLocation)){
  const at=coords[l.id];
  if(!validPosition(at)){unplaced++;continue;}
  out.set(`loc:${l.id}`,{key:`loc:${l.id}`,name:l.name,japanese:l.japanese||'',lat:at.lat,lng:at.lng,locationId:l.id,want:false});
 }
 for(const e of (state?.hunts?.entries||[]).filter(e=>e.hunt==='matcha')){
  const step=e.stepId?(state.steps||[]).find(s=>s.id===e.stepId):null,loc=e.locationId?coords[e.locationId]:null;
  const at=validPosition(e.pin)?e.pin:step?stepPosition(state,step):validPosition(loc)?loc:null;
  if(!at)continue;
  const key=e.locationId&&out.has(`loc:${e.locationId}`)?`loc:${e.locationId}`:`hunt:${e.id}`,known=out.get(key);
  const name=known?.name||e.place||step?.place||step?.title||e.title;
  out.set(key,{key,name,japanese:known?.japanese||'',lat:known?.lat??at.lat,lng:known?.lng??at.lng,locationId:e.locationId||null,
   want:!!(known?.want||e.status==='want'),find:e.title});
 }
 return {places:[...out.values()],unplaced};
}
// The places within reach of where the phone is, nearest first, that have not been told about
// today. `seen` is {placeKey: japanDate} from the phone.
export function matchaInReach(places,pos,radiusKm,seen={},today=japanDate()){
 if(!validPosition(pos)||(pos.accuracy??0)>MAX_ACCURACY_M)return [];
 return places.map(p=>({...p,km:kmBetween(pos,p)})).filter(p=>p.km<=radiusKm&&seen[p.key]!==today).sort((a,b)=>a.km-b.km);
}
// Streets are not straight lines: about a third again on the crow's distance, at 75 m a minute.
export const walkMinutes=km=>Math.max(1,Math.round(km*1.3*1000/75));
export const distanceText=km=>km<1?`${Math.max(10,Math.round(km*1000/10)*10)} m`:`${km.toFixed(1)} km`;
export const radiusText=km=>MATCHA_RADII.find(([v])=>v===km)?.[1]||distanceText(km);
export function matchaWords(hit,radiusKm){
 const more=hit.others?` (and ${hit.others} more matcha place${hit.others===1?'':'s'} close by)`:'';
 return {title:`🍵 You are within ${radiusText(radiusKm)} of ${hit.name}`,
  text:`${distanceText(hit.km)} away, about ${walkMinutes(hit.km)} min on foot${hit.want?', and it is on our want-to-try list':''}${more}.`};
}
// Where tapping the alert goes: the place on our map list, or the Matcha hunt for a find.
export const matchaUrl=hit=>hit.locationId?`/?tab=places&item=${encodeURIComponent(hit.locationId)}`:'/?tab=hunts';
export const directionsUrl=hit=>`https://www.google.com/maps/dir/?api=1&destination=${hit.lat},${hit.lng}&travelmode=walking`;
// ---- Kept on the phone ------------------------------------------------------------------------
const RADIUS_KEY=person=>`japan.matcha.radius.${person||'everyone'}`;
const SEEN_KEY=person=>`japan.matcha.seen.${person||'everyone'}`;
export function readRadius(person,store=device()){
 let v=null;try{v=Number(store?.getItem(RADIUS_KEY(person)));}catch{}
 return MATCHA_RADII.some(([r])=>r===v)?v:DEFAULT_RADIUS;
}
export function writeRadius(person,km,store=device()){
 if(!MATCHA_RADII.some(([r])=>r===km))return readRadius(person,store);
 try{store?.setItem(RADIUS_KEY(person),String(km));}catch{}
 return km;
}
// Only today's are worth keeping; yesterday's are dropped as today's are written.
export function readSeen(person,store=device()){
 try{const v=JSON.parse(store?.getItem(SEEN_KEY(person))||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}
}
export function markSeen(person,keys,today=japanDate(),store=device()){
 const next=Object.fromEntries(Object.entries(readSeen(person,store)).filter(([,d])=>d===today));
 for(const k of keys)next[k]=today;
 try{store?.setItem(SEEN_KEY(person),JSON.stringify(next));}catch{}
 return next;
}
